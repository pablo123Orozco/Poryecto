"""Rutas de solo lectura para consultar la auditoria."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.models.auditoria import Auditoria
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.schemas.auditoria import AuditoriaResponse


router = APIRouter(
    prefix="/auditoria",
    tags=["Auditoria"],
)

ROLES_CONSULTA = {
    "ADMIN_EMPRESA",
    "AUDITOR",
}


def obtener_consultor_auditoria(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Usuario:
    rol = db.get(Rol, usuario.rol_id)

    if rol is None or rol.nombre not in ROLES_CONSULTA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere el rol ADMIN_EMPRESA o AUDITOR.",
        )

    return usuario


def obtener_registro_de_la_organizacion(
    auditoria_id: int,
    usuario: Usuario,
    db: Session,
) -> Auditoria:
    registro = db.scalar(
        select(Auditoria).where(
            Auditoria.id == auditoria_id,
            Auditoria.organizacion_id
            == usuario.organizacion_id,
        )
    )

    if registro is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de auditoria no encontrado.",
        )

    return registro


@router.get(
    "",
    response_model=list[AuditoriaResponse],
)
def listar_auditoria(
    offset: int = Query(default=0, ge=0),
    limite: int = Query(default=50, ge=1, le=100),
    usuario: Usuario = Depends(obtener_consultor_auditoria),
    db: Session = Depends(get_db),
) -> list[Auditoria]:
    consulta = (
        select(Auditoria)
        .where(
            Auditoria.organizacion_id
            == usuario.organizacion_id
        )
        .order_by(
            Auditoria.creado_en.desc(),
            Auditoria.id.desc(),
        )
        .offset(offset)
        .limit(limite)
    )

    return list(db.scalars(consulta).all())


@router.get(
    "/{auditoria_id}",
    response_model=AuditoriaResponse,
)
def consultar_auditoria(
    auditoria_id: int,
    usuario: Usuario = Depends(obtener_consultor_auditoria),
    db: Session = Depends(get_db),
) -> Auditoria:
    return obtener_registro_de_la_organizacion(
        auditoria_id,
        usuario,
        db,
    )