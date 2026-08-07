"""Rutas para registrar y consultar metricas de activos."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.models.activo import Activo
from app.models.metrica_activo import MetricaActivo
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.schemas.metrica_activo import (
    MetricaCreate,
    MetricaResponse,
)


router = APIRouter(
    prefix="/metricas",
    tags=["Metricas"],
)

ROLES_REGISTRO = {
    "ADMIN_EMPRESA",
    "TECNICO",
}


def obtener_registrador_metricas(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Usuario:
    rol = db.get(Rol, usuario.rol_id)

    if rol is None or rol.nombre not in ROLES_REGISTRO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere el rol ADMIN_EMPRESA o TECNICO.",
        )

    return usuario


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


def obtener_metrica_de_la_organizacion(
    metrica_id: int,
    usuario: Usuario,
    db: Session,
) -> MetricaActivo:
    metrica = db.scalar(
        select(MetricaActivo)
        .join(
            Activo,
            MetricaActivo.activo_id == Activo.id,
        )
        .where(
            MetricaActivo.id == metrica_id,
            Activo.organizacion_id
            == usuario.organizacion_id,
        )
    )

    if metrica is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metrica no encontrada.",
        )

    return metrica


@router.post(
    "",
    response_model=MetricaResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_metrica(
    datos: MetricaCreate,
    registrador: Usuario = Depends(
        obtener_registrador_metricas
    ),
    db: Session = Depends(get_db),
) -> MetricaActivo:
    validar_activo(
        datos.activo_id,
        registrador.organizacion_id,
        db,
    )

    valores = datos.model_dump()

    if valores["capturada_en"] is None:
        valores["capturada_en"] = datetime.now(timezone.utc)

    metrica = MetricaActivo(**valores)

    db.add(metrica)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La metrica ya fue registrada para la misma fecha."
            ),
        ) from error

    db.refresh(metrica)

    return metrica


@router.get(
    "",
    response_model=list[MetricaResponse],
)
def listar_metricas(
    activo_id: int = Query(gt=0),
    offset: int = Query(default=0, ge=0),
    limite: int = Query(default=50, ge=1, le=100),
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> list[MetricaActivo]:
    validar_activo(
        activo_id,
        usuario.organizacion_id,
        db,
    )

    consulta = (
        select(MetricaActivo)
        .where(
            MetricaActivo.activo_id == activo_id
        )
        .order_by(
            MetricaActivo.capturada_en.desc()
        )
        .offset(offset)
        .limit(limite)
    )

    return list(db.scalars(consulta).all())


@router.get(
    "/{metrica_id}",
    response_model=MetricaResponse,
)
def consultar_metrica(
    metrica_id: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> MetricaActivo:
    return obtener_metrica_de_la_organizacion(
        metrica_id,
        usuario,
        db,
    )