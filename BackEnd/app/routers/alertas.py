"""Rutas para administrar alertas manuales de activos."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.models.activo import Activo
from app.models.alerta import Alerta
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.schemas.alerta import (
    AlertaCreate,
    AlertaResponse,
    AlertaUpdate,
    EstadoAlertaUpdate,
)


router = APIRouter(
    prefix="/alertas",
    tags=["Alertas"],
)

ROLES_GESTORES = {
    "ADMIN_EMPRESA",
    "TECNICO",
    "ANALISTA_SEGURIDAD",
}

TRANSICIONES_PERMITIDAS = {
    "activa": {"reconocida", "descartada"},
    "reconocida": {"resuelta", "descartada"},
}


def obtener_gestor_alertas(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Usuario:
    rol = db.get(Rol, usuario.rol_id)

    if rol is None or rol.nombre not in ROLES_GESTORES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para administrar alertas.",
        )

    return usuario


def obtener_alerta_de_la_organizacion(
    alerta_id: int,
    usuario: Usuario,
    db: Session,
) -> Alerta:
    alerta = db.scalar(
        select(Alerta).where(
            Alerta.id == alerta_id,
            Alerta.organizacion_id
            == usuario.organizacion_id,
        )
    )

    if alerta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alerta no encontrada.",
        )

    return alerta


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


@router.post(
    "",
    response_model=AlertaResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_alerta(
    datos: AlertaCreate,
    gestor: Usuario = Depends(obtener_gestor_alertas),
    db: Session = Depends(get_db),
) -> Alerta:
    validar_activo(
        datos.activo_id,
        gestor.organizacion_id,
        db,
    )

    alerta = Alerta(
        organizacion_id=gestor.organizacion_id,
        **datos.model_dump(),
    )

    db.add(alerta)
    db.commit()
    db.refresh(alerta)

    return alerta


@router.get(
    "",
    response_model=list[AlertaResponse],
)
def listar_alertas(
    offset: int = Query(default=0, ge=0),
    limite: int = Query(default=50, ge=1, le=100),
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> list[Alerta]:
    consulta = (
        select(Alerta)
        .where(
            Alerta.organizacion_id
            == usuario.organizacion_id
        )
        .order_by(Alerta.id)
        .offset(offset)
        .limit(limite)
    )

    return list(db.scalars(consulta).all())


@router.get(
    "/{alerta_id}",
    response_model=AlertaResponse,
)
def consultar_alerta(
    alerta_id: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Alerta:
    return obtener_alerta_de_la_organizacion(
        alerta_id,
        usuario,
        db,
    )


@router.patch(
    "/{alerta_id}",
    response_model=AlertaResponse,
)
def actualizar_alerta(
    alerta_id: int,
    datos: AlertaUpdate,
    gestor: Usuario = Depends(obtener_gestor_alertas),
    db: Session = Depends(get_db),
) -> Alerta:
    alerta = obtener_alerta_de_la_organizacion(
        alerta_id,
        gestor,
        db,
    )

    if alerta.estado in {"resuelta", "descartada"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede modificar una alerta finalizada.",
        )

    cambios = datos.model_dump(exclude_unset=True)

    for campo, valor in cambios.items():
        setattr(alerta, campo, valor)

    db.commit()
    db.refresh(alerta)

    return alerta


@router.patch(
    "/{alerta_id}/estado",
    response_model=AlertaResponse,
)
def cambiar_estado_alerta(
    alerta_id: int,
    datos: EstadoAlertaUpdate,
    gestor: Usuario = Depends(obtener_gestor_alertas),
    db: Session = Depends(get_db),
) -> Alerta:
    alerta = obtener_alerta_de_la_organizacion(
        alerta_id,
        gestor,
        db,
    )

    if datos.estado == alerta.estado:
        return alerta

    estados_validos = TRANSICIONES_PERMITIDAS.get(
        alerta.estado,
        set(),
    )

    if datos.estado not in estados_validos:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cambio de estado no permitido.",
        )

    if datos.estado == "resuelta":
        alerta.resuelta_en = datetime.now(timezone.utc)

    alerta.estado = datos.estado

    db.commit()
    db.refresh(alerta)

    return alerta