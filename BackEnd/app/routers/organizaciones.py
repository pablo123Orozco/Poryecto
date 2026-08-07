"""Rutas CRUD del modulo de organizaciones."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_admin_empresa, obtener_usuario_actual
from app.models.organizacion import Organizacion
from app.models.usuario import Usuario
from app.schemas.organizacion import (
    OrganizacionCreate,
    OrganizacionResponse,
    OrganizacionUpdate,
)


router = APIRouter(prefix="/organizaciones", tags=["Organizaciones"])


def obtener_organizacion_o_404(
    organizacion_id: int,
    usuario: Usuario,
    db: Session,
) -> Organizacion:
    if organizacion_id != usuario.organizacion_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organizacion no encontrada.",
        )
    organizacion = db.get(Organizacion, organizacion_id)
    if organizacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organizacion no encontrada.",
        )
    return organizacion


@router.post(
    "",
    response_model=OrganizacionResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_organizacion(
    datos: OrganizacionCreate,
    db: Session = Depends(get_db),
) -> Organizacion:
    organizacion = Organizacion(**datos.model_dump())
    db.add(organizacion)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una organizacion con el mismo NIT.",
        ) from error

    db.refresh(organizacion)
    return organizacion


@router.get("", response_model=list[OrganizacionResponse])
def listar_organizaciones(
    offset: int = Query(default=0, ge=0),
    limite: int = Query(default=50, ge=1, le=100),
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> list[Organizacion]:
    consulta = (
        select(Organizacion)
        .where(Organizacion.id == usuario.organizacion_id)
        .order_by(Organizacion.id)
        .offset(offset)
        .limit(limite)
    )
    return list(db.scalars(consulta).all())


@router.get("/{organizacion_id}", response_model=OrganizacionResponse)
def consultar_organizacion(
    organizacion_id: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Organizacion:
    return obtener_organizacion_o_404(organizacion_id, usuario, db)


@router.patch("/{organizacion_id}", response_model=OrganizacionResponse)
def actualizar_organizacion(
    organizacion_id: int,
    datos: OrganizacionUpdate,
    usuario: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> Organizacion:
    organizacion = obtener_organizacion_o_404(organizacion_id, usuario, db)

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(organizacion, campo, valor)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una organizacion con el mismo NIT.",
        ) from error

    db.refresh(organizacion)
    return organizacion


@router.patch(
    "/{organizacion_id}/desactivar",
    response_model=OrganizacionResponse,
)
def desactivar_organizacion(
    organizacion_id: int,
    usuario: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> Organizacion:
    organizacion = obtener_organizacion_o_404(organizacion_id, usuario, db)
    organizacion.estado = "inactiva"
    db.commit()
    db.refresh(organizacion)
    return organizacion
