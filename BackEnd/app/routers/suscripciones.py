"""Rutas para administrar la suscripcion de una organizacion."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_admin_empresa
from app.models.plan import Plan
from app.models.suscripcion import Suscripcion
from app.models.usuario import Usuario
from app.schemas.suscripcion import (
    SuscripcionCreate,
    SuscripcionResponse,
)


router = APIRouter(
    prefix="/suscripciones",
    tags=["Suscripciones"],
)


def obtener_suscripcion_de_la_organizacion(
    suscripcion_id: int,
    usuario: Usuario,
    db: Session,
) -> Suscripcion:
    suscripcion = db.scalar(
        select(Suscripcion).where(
            Suscripcion.id == suscripcion_id,
            Suscripcion.organizacion_id
            == usuario.organizacion_id,
        )
    )

    if suscripcion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suscripcion no encontrada.",
        )

    return suscripcion


@router.post(
    "",
    response_model=SuscripcionResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_suscripcion(
    datos: SuscripcionCreate,
    administrador: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> Suscripcion:
    suscripcion_activa = db.scalar(
        select(Suscripcion.id).where(
            Suscripcion.organizacion_id
            == administrador.organizacion_id,
            Suscripcion.estado == "activa",
        )
    )

    if suscripcion_activa is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La organizacion ya tiene una "
                "suscripcion activa."
            ),
        )

    plan = db.scalar(
        select(Plan).where(
            Plan.id == datos.plan_id,
            Plan.activo.is_(True),
        )
    )

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan no encontrado o inactivo.",
        )

    precio = (
        plan.precio_mensual
        if datos.periodicidad == "mensual"
        else plan.precio_anual
    )

    suscripcion = Suscripcion(
        organizacion_id=administrador.organizacion_id,
        plan_id=plan.id,
        periodicidad=datos.periodicidad,
        precio_contratado=precio,
        estado="activa",
        inicia_en=date.today(),
    )

    try:
        db.add(suscripcion)
        db.commit()
        db.refresh(suscripcion)
    except IntegrityError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La organizacion ya tiene una "
                "suscripcion activa."
            ),
        ) from error

    return suscripcion


@router.get(
    "",
    response_model=list[SuscripcionResponse],
)
def listar_suscripciones(
    administrador: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> list[Suscripcion]:
    consulta = (
        select(Suscripcion)
        .where(
            Suscripcion.organizacion_id
            == administrador.organizacion_id
        )
        .order_by(
            Suscripcion.creado_en.desc(),
            Suscripcion.id.desc(),
        )
    )

    return list(db.scalars(consulta).all())


@router.get(
    "/actual",
    response_model=SuscripcionResponse,
)
def consultar_suscripcion_actual(
    administrador: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> Suscripcion:
    suscripcion = db.scalar(
        select(Suscripcion).where(
            Suscripcion.organizacion_id
            == administrador.organizacion_id,
            Suscripcion.estado == "activa",
        )
    )

    if suscripcion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "La organizacion no tiene una "
                "suscripcion activa."
            ),
        )

    return suscripcion


@router.patch(
    "/{suscripcion_id}/cancelar",
    response_model=SuscripcionResponse,
)
def cancelar_suscripcion(
    suscripcion_id: int,
    administrador: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> Suscripcion:
    suscripcion = obtener_suscripcion_de_la_organizacion(
        suscripcion_id,
        administrador,
        db,
    )

    if suscripcion.estado != "activa":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La suscripcion no se encuentra activa.",
        )

    suscripcion.estado = "cancelada"
    suscripcion.termina_en = date.today()

    db.commit()
    db.refresh(suscripcion)

    return suscripcion