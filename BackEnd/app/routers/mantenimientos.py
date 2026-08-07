"""Rutas para administrar mantenimientos de activos."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.models.activo import Activo
from app.models.mantenimiento import Mantenimiento
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.schemas.mantenimiento import (
    EstadoMantenimientoUpdate,
    MantenimientoCreate,
    MantenimientoResponse,
    MantenimientoUpdate,
)


router = APIRouter(
    prefix="/mantenimientos",
    tags=["Mantenimientos"],
)

ROLES_GESTORES = {"ADMIN_EMPRESA", "TECNICO"}

TRANSICIONES_PERMITIDAS = {
    "programado": {"en_proceso", "cancelado"},
    "en_proceso": {"completado", "cancelado"},
}


def obtener_gestor_mantenimientos(
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


def obtener_mantenimiento_de_la_organizacion(
    mantenimiento_id: int,
    usuario: Usuario,
    db: Session,
) -> Mantenimiento:
    mantenimiento = db.scalar(
        select(Mantenimiento).where(
            Mantenimiento.id == mantenimiento_id,
            Mantenimiento.organizacion_id
            == usuario.organizacion_id,
        )
    )

    if mantenimiento is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mantenimiento no encontrado.",
        )

    return mantenimiento


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


def validar_responsable(
    responsable_id: int | None,
    organizacion_id: int,
    db: Session,
) -> None:
    if responsable_id is None:
        return

    responsable = db.scalar(
        select(Usuario.id)
        .join(Rol, Usuario.rol_id == Rol.id)
        .where(
            Usuario.id == responsable_id,
            Usuario.organizacion_id == organizacion_id,
            Usuario.activo.is_(True),
            Rol.nombre.in_(ROLES_GESTORES),
        )
    )

    if responsable is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Responsable no encontrado o no permitido.",
        )


@router.post(
    "",
    response_model=MantenimientoResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_mantenimiento(
    datos: MantenimientoCreate,
    gestor: Usuario = Depends(obtener_gestor_mantenimientos),
    db: Session = Depends(get_db),
) -> Mantenimiento:
    validar_activo(
        datos.activo_id,
        gestor.organizacion_id,
        db,
    )
    validar_responsable(
        datos.responsable_id,
        gestor.organizacion_id,
        db,
    )

    mantenimiento = Mantenimiento(
        organizacion_id=gestor.organizacion_id,
        **datos.model_dump(),
    )

    db.add(mantenimiento)
    db.commit()
    db.refresh(mantenimiento)

    return mantenimiento


@router.get(
    "",
    response_model=list[MantenimientoResponse],
)
def listar_mantenimientos(
    offset: int = Query(default=0, ge=0),
    limite: int = Query(default=50, ge=1, le=100),
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> list[Mantenimiento]:
    consulta = (
        select(Mantenimiento)
        .where(
            Mantenimiento.organizacion_id
            == usuario.organizacion_id
        )
        .order_by(Mantenimiento.id)
        .offset(offset)
        .limit(limite)
    )

    return list(db.scalars(consulta).all())


@router.get(
    "/{mantenimiento_id}",
    response_model=MantenimientoResponse,
)
def consultar_mantenimiento(
    mantenimiento_id: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Mantenimiento:
    return obtener_mantenimiento_de_la_organizacion(
        mantenimiento_id,
        usuario,
        db,
    )


@router.patch(
    "/{mantenimiento_id}",
    response_model=MantenimientoResponse,
)
def actualizar_mantenimiento(
    mantenimiento_id: int,
    datos: MantenimientoUpdate,
    gestor: Usuario = Depends(obtener_gestor_mantenimientos),
    db: Session = Depends(get_db),
) -> Mantenimiento:
    mantenimiento = obtener_mantenimiento_de_la_organizacion(
        mantenimiento_id,
        gestor,
        db,
    )

    if mantenimiento.estado in {"completado", "cancelado"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No se puede modificar un mantenimiento finalizado."
            ),
        )

    cambios = datos.model_dump(exclude_unset=True)

    if "responsable_id" in cambios:
        validar_responsable(
            cambios["responsable_id"],
            gestor.organizacion_id,
            db,
        )

    for campo, valor in cambios.items():
        setattr(mantenimiento, campo, valor)

    db.commit()
    db.refresh(mantenimiento)

    return mantenimiento


@router.patch(
    "/{mantenimiento_id}/estado",
    response_model=MantenimientoResponse,
)
def cambiar_estado_mantenimiento(
    mantenimiento_id: int,
    datos: EstadoMantenimientoUpdate,
    gestor: Usuario = Depends(obtener_gestor_mantenimientos),
    db: Session = Depends(get_db),
) -> Mantenimiento:
    mantenimiento = obtener_mantenimiento_de_la_organizacion(
        mantenimiento_id,
        gestor,
        db,
    )

    if datos.estado == mantenimiento.estado:
        return mantenimiento

    estados_validos = TRANSICIONES_PERMITIDAS.get(
        mantenimiento.estado,
        set(),
    )

    if datos.estado not in estados_validos:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cambio de estado no permitido.",
        )

    ahora = datetime.now(timezone.utc)

    if datos.estado == "en_proceso":
        if mantenimiento.responsable_id is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Debe asignarse un responsable antes de iniciar."
                ),
            )

        mantenimiento.iniciado_en = ahora

    elif datos.estado == "completado":
        mantenimiento.finalizado_en = ahora

    mantenimiento.estado = datos.estado

    db.commit()
    db.refresh(mantenimiento)

    return mantenimiento