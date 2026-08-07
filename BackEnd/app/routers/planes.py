"""Rutas de consulta para el catalogo de planes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.models.plan import Plan
from app.models.usuario import Usuario
from app.schemas.plan import PlanResponse


router = APIRouter(prefix="/planes", tags=["Planes"])


@router.get("", response_model=list[PlanResponse])
def listar_planes(
    _: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> list[Plan]:
    consulta = (
        select(Plan)
        .where(Plan.activo.is_(True))
        .order_by(Plan.id)
    )

    return list(db.scalars(consulta).all())


@router.get("/{plan_id}", response_model=PlanResponse)
def consultar_plan(
    plan_id: int,
    _: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Plan:
    plan = db.scalar(
        select(Plan).where(
            Plan.id == plan_id,
            Plan.activo.is_(True),
        )
    )

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan no encontrado.",
        )

    return plan