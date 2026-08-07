"""Rutas para administrar incidentes relacionados con activos."""

from datetime import datetime, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.models.activo import Activo
from app.models.incidente import Incidente
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.schemas.incidente import (
    EstadoIncidenteUpdate,
    IncidenteCreate,
    IncidenteResponse,
    IncidenteUpdate,
)


router = APIRouter(
    prefix="/incidentes",
    tags=["Incidentes"],
)

ROLES_GESTORES = {"ADMIN_EMPRESA", "TECNICO"}

TRANSICIONES_PERMITIDAS = {
    "abierto": {"en_investigacion"},
    "en_investigacion": {"resuelto"},
    "resuelto": {"cerrado"},
}


def obtener_gestor_incidentes(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Usuario:
    rol = db.get(Rol, usuario.rol_id)

    if rol is None or rol.nombre not in ROLES_GESTORES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere el rol ADMIN_EMPRESA o TECNICO.",
        )

    return usuario


def obtener_incidente_de_la_organizacion(
    incidente_id: int,
    usuario: Usuario,
    db: Session,
) -> Incidente:
    incidente = db.scalar(
        select(Incidente).where(
            Incidente.id == incidente_id,
            Incidente.organizacion_id
            == usuario.organizacion_id,
        )
    )

    if incidente is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incidente no encontrado.",
        )

    return incidente


def validar_activo(
    activo_id: int,
    organizacion_id: int,
    db: Session,
) -> None:
    activo = db.scalar(
        select(Activo.id).where(
            Activo.id == activo_id,
            Activo.organizacion_id == organizacion_id,
        )
    )

    if activo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activo no encontrado.",
        )


def validar_asignado(
    asignado_a: int | None,
    organizacion_id: int,
    db: Session,
) -> None:
    if asignado_a is None:
        return

    usuario = db.scalar(
        select(Usuario.id)
        .join(Rol, Usuario.rol_id == Rol.id)
        .where(
            Usuario.id == asignado_a,
            Usuario.organizacion_id == organizacion_id,
            Usuario.activo.is_(True),
            Rol.nombre.in_(ROLES_GESTORES),
        )
    )

    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario asignado no encontrado o no permitido.",
        )


def generar_codigo() -> str:
    fecha = datetime.now(timezone.utc).strftime("%Y%m%d")
    aleatorio = secrets.token_hex(3).upper()

    return f"INC-{fecha}-{aleatorio}"


@router.post(
    "",
    response_model=IncidenteResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_incidente(
    datos: IncidenteCreate,
    gestor: Usuario = Depends(obtener_gestor_incidentes),
    db: Session = Depends(get_db),
) -> Incidente:
    validar_activo(
        datos.activo_id,
        gestor.organizacion_id,
        db,
    )
    validar_asignado(
        datos.asignado_a,
        gestor.organizacion_id,
        db,
    )

    incidente = Incidente(
        organizacion_id=gestor.organizacion_id,
        codigo=generar_codigo(),
        **datos.model_dump(),
    )

    db.add(incidente)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No fue posible generar el codigo del incidente.",
        ) from error

    db.refresh(incidente)

    return incidente


@router.get(
    "",
    response_model=list[IncidenteResponse],
)
def listar_incidentes(
    offset: int = Query(default=0, ge=0),
    limite: int = Query(default=50, ge=1, le=100),
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> list[Incidente]:
    consulta = (
        select(Incidente)
        .where(
            Incidente.organizacion_id
            == usuario.organizacion_id
        )
        .order_by(Incidente.id)
        .offset(offset)
        .limit(limite)
    )

    return list(db.scalars(consulta).all())


@router.get(
    "/{incidente_id}",
    response_model=IncidenteResponse,
)
def consultar_incidente(
    incidente_id: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Incidente:
    return obtener_incidente_de_la_organizacion(
        incidente_id,
        usuario,
        db,
    )


@router.patch(
    "/{incidente_id}",
    response_model=IncidenteResponse,
)
def actualizar_incidente(
    incidente_id: int,
    datos: IncidenteUpdate,
    gestor: Usuario = Depends(obtener_gestor_incidentes),
    db: Session = Depends(get_db),
) -> Incidente:
    incidente = obtener_incidente_de_la_organizacion(
        incidente_id,
        gestor,
        db,
    )

    if incidente.estado == "cerrado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede modificar un incidente cerrado.",
        )

    cambios = datos.model_dump(exclude_unset=True)

    if "asignado_a" in cambios:
        validar_asignado(
            cambios["asignado_a"],
            gestor.organizacion_id,
            db,
        )

    for campo, valor in cambios.items():
        setattr(incidente, campo, valor)

    db.commit()
    db.refresh(incidente)

    return incidente


@router.patch(
    "/{incidente_id}/estado",
    response_model=IncidenteResponse,
)
def cambiar_estado_incidente(
    incidente_id: int,
    datos: EstadoIncidenteUpdate,
    gestor: Usuario = Depends(obtener_gestor_incidentes),
    db: Session = Depends(get_db),
) -> Incidente:
    incidente = obtener_incidente_de_la_organizacion(
        incidente_id,
        gestor,
        db,
    )

    if datos.estado == incidente.estado:
        return incidente

    estados_validos = TRANSICIONES_PERMITIDAS.get(
        incidente.estado,
        set(),
    )

    if datos.estado not in estados_validos:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cambio de estado no permitido.",
        )

    ahora = datetime.now(timezone.utc)

    if (
        datos.estado == "en_investigacion"
        and incidente.asignado_a is None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Debe asignarse un responsable antes de investigar."
            ),
        )

    if datos.estado == "resuelto":
        if not incidente.solucion:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Debe registrar la solucion antes de resolver."
                ),
            )

        incidente.resuelto_en = ahora

    elif datos.estado == "cerrado":
        incidente.cerrado_en = ahora

    incidente.estado = datos.estado

    db.commit()
    db.refresh(incidente)

    return incidente