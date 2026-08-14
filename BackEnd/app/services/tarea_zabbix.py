"""Tarea periodica para sincronizar datos de Zabbix."""

import asyncio
import logging

from sqlalchemy import select

from app.database import SessionLocal
from app.models.activo import Activo
from app.services.sincronizacion_zabbix import (
    SincronizacionZabbixError,
    sincronizar_alertas_zabbix,
    sincronizar_metricas_zabbix,
)
from app.services.zabbix import ZabbixError


logger = logging.getLogger(__name__)

INTERVALO_SINCRONIZACION_SEGUNDOS = 300


def obtener_activos_configurados() -> list[Activo]:
    """Obtiene los activos vinculados con Zabbix."""

    with SessionLocal() as db:
        consulta = (
            select(Activo)
            .where(
                Activo.zabbix_host_id.is_not(None),
                Activo.estado != "retirado",
            )
            .order_by(Activo.id)
        )

        return list(db.scalars(consulta).all())


def sincronizar_activo(
    activo_id: int,
) -> None:
    """Sincroniza las metricas y alertas de un activo."""

    with SessionLocal() as db:
        activo = db.get(Activo, activo_id)

        if (
            activo is None
            or not activo.zabbix_host_id
            or activo.estado == "retirado"
        ):
            return

        try:
            resultado_metricas = (
                sincronizar_metricas_zabbix(
                    activo=activo,
                    db=db,
                )
            )

            logger.info(
                "Metricas sincronizadas para el activo "
                "%s: %s",
                activo.id,
                resultado_metricas,
            )

        except (
            ZabbixError,
            SincronizacionZabbixError,
        ) as error:
            db.rollback()

            logger.warning(
                "No se sincronizaron las metricas "
                "del activo %s: %s",
                activo.id,
                error,
            )

        try:
            resultado_alertas = (
                sincronizar_alertas_zabbix(
                    activo=activo,
                    db=db,
                )
            )

            logger.info(
                "Alertas sincronizadas para el activo "
                "%s: %s",
                activo.id,
                resultado_alertas,
            )

        except (
            ZabbixError,
            SincronizacionZabbixError,
        ) as error:
            db.rollback()

            logger.warning(
                "No se sincronizaron las alertas "
                "del activo %s: %s",
                activo.id,
                error,
            )


def sincronizar_activos_configurados() -> None:
    """Sincroniza todos los activos vinculados."""

    activos = obtener_activos_configurados()

    for activo in activos:
        sincronizar_activo(activo.id)


async def ejecutar_tarea_zabbix() -> None:
    """Ejecuta la sincronizacion cada cinco minutos."""

    while True:
        await asyncio.sleep(
            INTERVALO_SINCRONIZACION_SEGUNDOS
        )

        try:
            await asyncio.to_thread(
                sincronizar_activos_configurados
            )

        except asyncio.CancelledError:
            raise

        except Exception:
            logger.exception(
                "Error inesperado en la tarea "
                "automatica de Zabbix."
            )