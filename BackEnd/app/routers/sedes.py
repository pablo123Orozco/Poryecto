"""Rutas para administrar las sedes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_admin_empresa, obtener_usuario_actual
from app.models.sede import Sede
from app.models.usuario import Usuario
from app.schemas.sede import SedeCreate, SedeResponse, SedeUpdate


router = APIRouter(prefix="/sedes", tags=["Sedes"])


def obtener_sede_de_la_organizacion(
    sede_id: int,
    usuario: Usuario,
    db: Session,
) -> Sede:
    sede = db.scalar(
        select(Sede).where(
            Sede.id == sede_id,
            Sede.organizacion_id == usuario.organizacion_id,
        )
    )

    if sede is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sede no encontrada.",
        )

    return sede


@router.post(
    "",
    response_model=SedeResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_sede(
    datos: SedeCreate,
    administrador: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> Sede:
    sede = Sede(
        organizacion_id=administrador.organizacion_id,
        **datos.model_dump(),
    )
    db.add(sede)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una sede con el mismo nombre.",
        ) from error

    db.refresh(sede)
    return sede


@router.get("", response_model=list[SedeResponse])
def listar_sedes(
    offset: int = Query(default=0, ge=0),
    limite: int = Query(default=50, ge=1, le=100),
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> list[Sede]:
    consulta = (
        select(Sede)
        .where(Sede.organizacion_id == usuario.organizacion_id)
        .order_by(Sede.id)
        .offset(offset)
        .limit(limite)
    )

    return list(db.scalars(consulta).all())


@router.get("/{sede_id}", response_model=SedeResponse)
def consultar_sede(
    sede_id: int,
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Sede:
    return obtener_sede_de_la_organizacion(sede_id, usuario, db)


@router.patch("/{sede_id}", response_model=SedeResponse)
def actualizar_sede(
    sede_id: int,
    datos: SedeUpdate,
    administrador: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> Sede:
    sede = obtener_sede_de_la_organizacion(sede_id, administrador, db)

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(sede, campo, valor)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una sede con el mismo nombre.",
        ) from error

    db.refresh(sede)
    return sede


@router.patch("/{sede_id}/desactivar", response_model=SedeResponse)
def desactivar_sede(
    sede_id: int,
    administrador: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> Sede:
    sede = obtener_sede_de_la_organizacion(sede_id, administrador, db)

    sede.activa = False
    db.commit()
    db.refresh(sede)

    return sede