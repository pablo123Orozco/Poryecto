"""Rutas para evaluaciones de riesgo alineadas con NIST."""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.models.activo import Activo
from app.models.evaluacion_riesgo import EvaluacionRiesgo
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.schemas.riesgos import (
    EvaluacionRiesgoCreate,
    EvaluacionRiesgoResponse,
    EvaluacionRiesgoUpdate,
)


router = APIRouter(
    prefix="/riesgos",
    tags=["Evaluacion de riesgos NIST"],
)

ROLES_LECTURA = {
    "ADMIN_EMPRESA",
    "TECNICO",
    "ANALISTA_SEGURIDAD",
    "AUDITOR",
}
ROLES_GESTION = {
    "ADMIN_EMPRESA",
    "ANALISTA_SEGURIDAD",
}

CATEGORIAS_NIST = {
    "GV": {"GV.OC", "GV.RM", "GV.RR", "GV.PO", "GV.OV", "GV.SC"},
    "ID": {"ID.AM", "ID.RA", "ID.IM"},
    "PR": {"PR.AA", "PR.AT", "PR.DS", "PR.PS", "PR.IR"},
    "DE": {"DE.CM", "DE.AE"},
    "RS": {"RS.MA", "RS.AN", "RS.CO", "RS.MI"},
    "RC": {"RC.RP", "RC.CO"},
}


def obtener_usuario_con_rol(
    roles_permitidos: set[str],
    usuario: Usuario,
    db: Session,
) -> Usuario:
    rol = db.get(Rol, usuario.rol_id)
    if rol is None or rol.nombre not in roles_permitidos:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta operacion.",
        )
    return usuario


def obtener_lector_riesgos(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Usuario:
    return obtener_usuario_con_rol(ROLES_LECTURA, usuario, db)


def obtener_gestor_riesgos(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Usuario:
    return obtener_usuario_con_rol(ROLES_GESTION, usuario, db)


def calcular_nivel(puntaje: int) -> str:
    """Convierte la matriz 5x5 en un nivel cualitativo."""

    if puntaje <= 4:
        return "bajo"
    if puntaje <= 9:
        return "medio"
    if puntaje <= 16:
        return "alto"
    return "critico"


def calcular_riesgo(probabilidad: int, impacto: int) -> tuple[int, str]:
    puntaje = probabilidad * impacto
    return puntaje, calcular_nivel(puntaje)


def validar_clasificacion_nist(funcion: str, categoria: str) -> None:
    if categoria not in CATEGORIAS_NIST.get(funcion, set()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="La categoria no pertenece a la funcion NIST seleccionada.",
        )


def validar_relaciones(
    activo_id: int,
    responsable_id: int | None,
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

    if responsable_id is not None:
        responsable = db.scalar(
            select(Usuario.id).where(
                Usuario.id == responsable_id,
                Usuario.organizacion_id == organizacion_id,
                Usuario.activo.is_(True),
            )
        )
        if responsable is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Responsable no encontrado o inactivo.",
            )


def obtener_evaluacion(
    evaluacion_id: int,
    organizacion_id: int,
    db: Session,
) -> EvaluacionRiesgo:
    evaluacion = db.scalar(
        select(EvaluacionRiesgo).where(
            EvaluacionRiesgo.id == evaluacion_id,
            EvaluacionRiesgo.organizacion_id == organizacion_id,
        )
    )
    if evaluacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluacion de riesgo no encontrada.",
        )
    return evaluacion


def preparar_riesgo_residual(
    probabilidad: int | None,
    impacto: int | None,
) -> tuple[int | None, str | None]:
    if (probabilidad is None) != (impacto is None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                "La probabilidad y el impacto residual deben "
                "estar informados juntos."
            ),
        )
    if probabilidad is None or impacto is None:
        return None, None
    return calcular_riesgo(probabilidad, impacto)


@router.post(
    "",
    response_model=EvaluacionRiesgoResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_evaluacion(
    datos: EvaluacionRiesgoCreate,
    usuario: Usuario = Depends(obtener_gestor_riesgos),
    db: Session = Depends(get_db),
) -> EvaluacionRiesgo:
    validar_relaciones(
        datos.activo_id,
        datos.responsable_id,
        usuario.organizacion_id,
        db,
    )
    validar_clasificacion_nist(datos.nist_funcion, datos.nist_categoria)

    puntaje, nivel = calcular_riesgo(datos.probabilidad, datos.impacto)
    puntaje_residual, nivel_residual = preparar_riesgo_residual(
        datos.probabilidad_residual,
        datos.impacto_residual,
    )

    valores = datos.model_dump()
    evaluacion = EvaluacionRiesgo(
        organizacion_id=usuario.organizacion_id,
        creado_por=usuario.id,
        codigo=(
            f"RISK-{datetime.now(timezone.utc).year}-"
            f"{uuid4().hex[:8].upper()}"
        ),
        puntaje_inherente=puntaje,
        nivel_inherente=nivel,
        puntaje_residual=puntaje_residual,
        nivel_residual=nivel_residual,
        **valores,
    )
    db.add(evaluacion)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No fue posible registrar la evaluacion.",
        ) from error

    db.refresh(evaluacion)
    return evaluacion


@router.get("", response_model=list[EvaluacionRiesgoResponse])
def listar_evaluaciones(
    offset: int = Query(default=0, ge=0),
    limite: int = Query(default=100, ge=1, le=100),
    activo_id: int | None = Query(default=None, gt=0),
    nivel: str | None = Query(default=None),
    estado_riesgo: str | None = Query(default=None, alias="estado"),
    nist_funcion: str | None = Query(default=None),
    usuario: Usuario = Depends(obtener_lector_riesgos),
    db: Session = Depends(get_db),
) -> list[EvaluacionRiesgo]:
    consulta = select(EvaluacionRiesgo).where(
        EvaluacionRiesgo.organizacion_id == usuario.organizacion_id
    )

    if activo_id is not None:
        consulta = consulta.where(EvaluacionRiesgo.activo_id == activo_id)
    if nivel is not None:
        consulta = consulta.where(EvaluacionRiesgo.nivel_inherente == nivel)
    if estado_riesgo is not None:
        consulta = consulta.where(EvaluacionRiesgo.estado == estado_riesgo)
    if nist_funcion is not None:
        consulta = consulta.where(EvaluacionRiesgo.nist_funcion == nist_funcion)

    consulta = (
        consulta.order_by(
            EvaluacionRiesgo.puntaje_inherente.desc(),
            EvaluacionRiesgo.actualizado_en.desc(),
        )
        .offset(offset)
        .limit(limite)
    )
    return list(db.scalars(consulta).all())


@router.get(
    "/{evaluacion_id}",
    response_model=EvaluacionRiesgoResponse,
)
def consultar_evaluacion(
    evaluacion_id: int,
    usuario: Usuario = Depends(obtener_lector_riesgos),
    db: Session = Depends(get_db),
) -> EvaluacionRiesgo:
    return obtener_evaluacion(
        evaluacion_id,
        usuario.organizacion_id,
        db,
    )


@router.patch(
    "/{evaluacion_id}",
    response_model=EvaluacionRiesgoResponse,
)
def actualizar_evaluacion(
    evaluacion_id: int,
    datos: EvaluacionRiesgoUpdate,
    usuario: Usuario = Depends(obtener_gestor_riesgos),
    db: Session = Depends(get_db),
) -> EvaluacionRiesgo:
    evaluacion = obtener_evaluacion(
        evaluacion_id,
        usuario.organizacion_id,
        db,
    )
    cambios = datos.model_dump(exclude_unset=True)
    if not cambios:
        return evaluacion

    activo_id = cambios.get("activo_id", evaluacion.activo_id)
    responsable_id = cambios.get("responsable_id", evaluacion.responsable_id)
    validar_relaciones(
        activo_id,
        responsable_id,
        usuario.organizacion_id,
        db,
    )

    funcion = cambios.get("nist_funcion", evaluacion.nist_funcion)
    categoria = cambios.get("nist_categoria", evaluacion.nist_categoria)
    validar_clasificacion_nist(funcion, categoria)

    for campo, valor in cambios.items():
        setattr(evaluacion, campo, valor)

    puntaje, nivel = calcular_riesgo(
        evaluacion.probabilidad,
        evaluacion.impacto,
    )
    evaluacion.puntaje_inherente = puntaje
    evaluacion.nivel_inherente = nivel

    puntaje_residual, nivel_residual = preparar_riesgo_residual(
        evaluacion.probabilidad_residual,
        evaluacion.impacto_residual,
    )
    evaluacion.puntaje_residual = puntaje_residual
    evaluacion.nivel_residual = nivel_residual

    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No fue posible actualizar la evaluacion.",
        ) from error

    db.refresh(evaluacion)
    return evaluacion
