"""Rutas para generar analisis preventivos con IA."""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.models.activo import Activo
from app.models.rol import Rol
from app.models.tipo_activo import TipoActivo
from app.models.usuario import Usuario
from app.schemas.ia import AnalisisActivoIAResponse
from app.services.ia import IAError, generar_analisis_preventivo
from app.services.zabbix import (
    ZabbixError,
    listar_metricas_host_zabbix,
    listar_problemas_host_zabbix,
)


router = APIRouter(
    prefix="/ia",
    tags=["Inteligencia artificial"],
)

ROLES_IA = {
    "ADMIN_EMPRESA",
    "TECNICO",
}

ADVERTENCIA_IA = (
    "Analisis generado automaticamente. Las recomendaciones deben "
    "ser verificadas por personal tecnico antes de aplicarse."
)


def obtener_usuario_ia(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Usuario:
    """Restringe el uso de IA a administradores y tecnicos."""

    rol = db.get(Rol, usuario.rol_id)

    if rol is None or rol.nombre not in ROLES_IA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Se requiere el rol ADMIN_EMPRESA o TECNICO."
            ),
        )

    return usuario


def obtener_activo(
    activo_id: int,
    usuario: Usuario,
    db: Session,
) -> Activo:
    """Obtiene un activo perteneciente a la organizacion actual."""

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


def preparar_metricas(
    metricas: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Selecciona solamente los datos tecnicos necesarios."""

    return [
        {
            "nombre": metrica.get("name"),
            "clave": metrica.get("key_"),
            "valor": metrica.get("lastvalue"),
            "unidad": metrica.get("units"),
            "ultima_lectura": metrica.get("lastclock"),
            "estado": metrica.get("state"),
            "error": metrica.get("error") or None,
        }
        for metrica in metricas[:80]
    ]


def preparar_problemas(
    problemas: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Selecciona los problemas que permanecen abiertos."""

    problemas_abiertos = [
        problema
        for problema in problemas
        if str(problema.get("r_eventid", "0")) in {"", "0"}
    ]

    return [
        {
            "evento_id": problema.get("eventid"),
            "nombre": problema.get("name"),
            "severidad_zabbix": problema.get("severity"),
            "detectado_en": problema.get("clock"),
            "reconocido": problema.get("acknowledged"),
            "datos_operativos": problema.get("opdata") or None,
        }
        for problema in problemas_abiertos[:20]
    ]


@router.post(
    "/activos/{activo_id}/analizar",
    response_model=AnalisisActivoIAResponse,
)
def analizar_activo_con_ia(
    activo_id: int,
    usuario: Usuario = Depends(obtener_usuario_ia),
    db: Session = Depends(get_db),
) -> AnalisisActivoIAResponse:
    """Analiza las metricas y problemas de un activo con Groq."""

    activo = obtener_activo(
        activo_id=activo_id,
        usuario=usuario,
        db=db,
    )

    if not activo.zabbix_host_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "El activo debe estar vinculado con un host de Zabbix."
            ),
        )

    tipo_activo = db.get(TipoActivo, activo.tipo_activo_id)

    try:
        metricas = listar_metricas_host_zabbix(
            activo.zabbix_host_id
        )
        problemas = listar_problemas_host_zabbix(
            activo.zabbix_host_id
        )
    except ZabbixError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    contexto = {
        "activo": {
            "id": activo.id,
            "nombre": activo.nombre,
            "tipo": (
                tipo_activo.nombre
                if tipo_activo is not None
                else "No especificado"
            ),
            "criticidad": activo.criticidad,
            "estado": activo.estado,
            "sistema_operativo": getattr(
                activo,
                "sistema_operativo",
                None,
            ),
            "fabricante": getattr(activo, "fabricante", None),
            "modelo": getattr(activo, "modelo", None),
        },
        "metricas_actuales": preparar_metricas(metricas),
        "problemas_abiertos": preparar_problemas(problemas),
    }

    try:
        resultado = generar_analisis_preventivo(contexto)
    except IAError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return AnalisisActivoIAResponse(
        **resultado.model_dump(),
        activo_id=activo.id,
        modelo=settings.groq_model,
        generado_en=datetime.now(timezone.utc),
        advertencia=ADVERTENCIA_IA,
    )