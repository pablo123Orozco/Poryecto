"""Rutas para administrar el inventario de activos tecnologicos."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.models.activo import Activo
from app.models.rol import Rol
from app.models.sede import Sede
from app.models.tipo_activo import TipoActivo
from app.models.usuario import Usuario
from app.schemas.activo import (
    ActivoCreate,
    ActivoResponse,
    ActivoUpdate,
    EstadoActivoUpdate,
    TipoActivoResponse,
)


router = APIRouter(prefix="/activos", tags=["Activos"])

ROLES_GESTORES = {"ADMIN_EMPRESA", "TECNICO"}


def obtener_gestor_activos(
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


def obtener_activo_de_la_organizacion(
    activo_id: int,
    usuario: Usuario,
    db: Session,
) -> Activo:
    activo = db.scalar(
        select(Activo).where(
            Activo.id == activo_id,
            Activo.organizacion_id == usuario.organizacion_id,
        )
    )

    if activo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activo no encontrado.",
        )

    return activo


def validar_relaciones(
    tipo_activo_id: int | None,
    sede_id: int | None,
    organizacion_id: int,
    db: Session,
) -> None:
    if (
        tipo_activo_id is not None
        and db.get(TipoActivo, tipo_activo_id) is None
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tipo de activo no encontrado.",
        )

    if sede_id is not None:
        sede = db.scalar(
            select(Sede.id).where(
                Sede.id == sede_id,
                Sede.organizacion_id == organizacion_id,
            )
        )

        if sede is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sede no encontrada.",
            )


def preparar_datos(
    datos: dict[str, object],
) -> dict[str, object]:
    direccion_ip = datos.get("direccion_ip")

    if direccion_ip is not None:
        datos["direccion_ip"] = str(direccion_ip)

    return datos


@router.get(
    "/tipos",
    response_model=list[TipoActivoResponse],
)
def listar_tipos_activo(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> list[TipoActivo]:
    return list(
        db.scalars(
            select(TipoActivo).order_by(TipoActivo.id)
        ).all()
    )


@router.post(
    "",
    response_model=ActivoResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_activo(
    datos: ActivoCreate,
    gestor: Usuario = Depends(obtener_gestor_activos),
    db: Session = Depends(get_db),
) -> Activo:
    validar_relaciones(
        tipo_activo_id=datos.tipo_activo_id,
        sede_id=datos.sede_id,
        organizacion_id=gestor.organizacion_id,
        db=db,
    )

    valores = preparar_datos(datos.model_dump())

    activo = Activo(
        organizacion_id=gestor.organizacion_id,
        **valores,
    )
    db.add(activo)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un activo con el mismo codigo interno.",
        ) from error

    db.refresh(activo)
    return activo


@router.get(
    "",
    response_model=list[ActivoResponse],
)
def listar_activos(
    offset: int = Query(default=0, ge=0),
    limite: int = Query(default=50, ge=1, le=100),
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> list[Activo]:
    consulta = (
        select(Activo)
        .where(
            Activo.organizacion_id == usuario.organizacion_id
        )
        .order_by(Activo.id)
        .offset(offset)
        .limit(limite)
    )

    return list(db.scalars(consulta).all())


@router.get(
    "/{activo_id}",
    response_model=ActivoResponse,
)
def consultar_activo(
    activo_id: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Activo:
    return obtener_activo_de_la_organizacion(
        activo_id,
        usuario,
        db,
    )


@router.patch(
    "/{activo_id}",
    response_model=ActivoResponse,
)
def actualizar_activo(
    activo_id: int,
    datos: ActivoUpdate,
    gestor: Usuario = Depends(obtener_gestor_activos),
    db: Session = Depends(get_db),
) -> Activo:
    activo = obtener_activo_de_la_organizacion(
        activo_id,
        gestor,
        db,
    )

    cambios = preparar_datos(
        datos.model_dump(exclude_unset=True)
    )

    validar_relaciones(
        tipo_activo_id=cambios.get("tipo_activo_id"),
        sede_id=cambios.get("sede_id"),
        organizacion_id=gestor.organizacion_id,
        db=db,
    )

    for campo, valor in cambios.items():
        setattr(activo, campo, valor)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un activo con el mismo codigo interno.",
        ) from error

    db.refresh(activo)
    return activo


@router.patch(
    "/{activo_id}/estado",
    response_model=ActivoResponse,
)
def cambiar_estado_activo(
    activo_id: int,
    datos: EstadoActivoUpdate,
    gestor: Usuario = Depends(obtener_gestor_activos),
    db: Session = Depends(get_db),
) -> Activo:
    activo = obtener_activo_de_la_organizacion(
        activo_id,
        gestor,
        db,
    )

    activo.estado = datos.estado
    db.commit()
    db.refresh(activo)

    return activo