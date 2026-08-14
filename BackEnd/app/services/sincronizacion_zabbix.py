"""Sincronizacion entre Zabbix y PostgreSQL."""

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.activo import Activo
from app.models.alerta import Alerta
from app.models.metrica_activo import MetricaActivo
from app.services.zabbix import (
    ZabbixError,
    listar_metricas_host_zabbix,
    listar_problemas_host_zabbix,
)


class SincronizacionZabbixError(Exception):
    """Error al guardar informacion de Zabbix."""


SEVERIDADES_ZABBIX = {
    "0": "informativa",
    "1": "informativa",
    "2": "baja",
    "3": "media",
    "4": "alta",
    "5": "critica",
}


def sincronizar_metricas_zabbix(
    activo: Activo,
    db: Session,
) -> dict[str, int]:
    """Guarda las metricas actuales de un activo."""

    if not activo.zabbix_host_id:
        raise SincronizacionZabbixError(
            "El activo no esta asociado con Zabbix."
        )

    metricas_zabbix = listar_metricas_host_zabbix(
        activo.zabbix_host_id
    )

    registradas = 0
    omitidas = 0

    for item in metricas_zabbix:
        try:
            clave = str(item["key_"]).strip()

            valor = Decimal(
                str(item["lastvalue"])
            )

            capturada_en = datetime.fromtimestamp(
                int(item["lastclock"]),
                tz=timezone.utc,
            )

        except (
            KeyError,
            TypeError,
            ValueError,
            InvalidOperation,
            OSError,
        ):
            omitidas += 1
            continue

        if not clave:
            omitidas += 1
            continue

        existente = db.scalar(
            select(MetricaActivo.id)
            .where(
                MetricaActivo.activo_id == activo.id,
                MetricaActivo.clave_metrica == clave,
                MetricaActivo.capturada_en
                == capturada_en,
            )
            .limit(1)
        )

        if existente is not None:
            omitidas += 1
            continue

        nombre = str(
            item.get("name") or clave
        ).strip()[:150]

        unidad = (
            str(item.get("units") or "")
            .strip()[:30]
            or None
        )

        metrica = MetricaActivo(
            activo_id=activo.id,
            clave_metrica=clave,
            nombre_metrica=nombre,
            valor_numerico=valor,
            valor_texto=None,
            unidad=unidad,
            capturada_en=capturada_en,
        )

        db.add(metrica)
        registradas += 1

    try:
        db.commit()

    except IntegrityError as error:
        db.rollback()

        raise SincronizacionZabbixError(
            "No fue posible guardar las metricas."
        ) from error

    return {
        "activo_id": activo.id,
        "procesadas": len(metricas_zabbix),
        "registradas": registradas,
        "omitidas": omitidas,
    }


def sincronizar_alertas_zabbix(
    activo: Activo,
    db: Session,
) -> dict[str, int]:
    """Convierte problemas de Zabbix en alertas."""

    if not activo.zabbix_host_id:
        raise SincronizacionZabbixError(
            "El activo no esta asociado con Zabbix."
        )

    problemas = listar_problemas_host_zabbix(
        activo.zabbix_host_id
    )

    registradas = 0
    actualizadas = 0
    omitidas = 0

    for problema in problemas:
        try:
            eventid = str(
                problema["eventid"]
            ).strip()

            nombre_completo = str(
                problema["name"]
            ).strip()

            detectada_en = datetime.fromtimestamp(
                int(problema["clock"]),
                tz=timezone.utc,
            )

        except (
            KeyError,
            TypeError,
            ValueError,
            OSError,
        ):
            omitidas += 1
            continue

        if not eventid or not nombre_completo:
            omitidas += 1
            continue

        severidad = SEVERIDADES_ZABBIX.get(
            str(problema.get("severity", "0")),
            "informativa",
        )

        evento_resuelto = (
            str(
                problema.get("r_eventid", "0")
            ) != "0"
        )

        resuelta_en = None

        if evento_resuelto:
            try:
                resuelta_en = datetime.fromtimestamp(
                    int(problema["r_clock"]),
                    tz=timezone.utc,
                )
            except (
                KeyError,
                TypeError,
                ValueError,
                OSError,
            ):
                resuelta_en = None

        alerta = db.scalar(
            select(Alerta).where(
                Alerta.activo_id == activo.id,
                Alerta.zabbix_event_id == eventid,
            )
        )

        if alerta is None:
            descripcion = nombre_completo

            opdata = str(
                problema.get("opdata") or ""
            ).strip()

            if opdata:
                descripcion = (
                    f"{nombre_completo}\n"
                    f"Datos operativos: {opdata}"
                )

            alerta = Alerta(
                organizacion_id=activo.organizacion_id,
                activo_id=activo.id,
                zabbix_event_id=eventid,
                titulo=nombre_completo[:180],
                descripcion=descripcion,
                severidad=severidad,
                estado=(
                    "resuelta"
                    if evento_resuelto
                    else "activa"
                ),
                detectada_en=detectada_en,
                resuelta_en=resuelta_en,
            )

            db.add(alerta)
            registradas += 1
            continue

        hubo_cambio = False

        if alerta.severidad != severidad:
            alerta.severidad = severidad
            hubo_cambio = True

        if (
            evento_resuelto
            and alerta.estado != "resuelta"
        ):
            alerta.estado = "resuelta"
            alerta.resuelta_en = resuelta_en
            hubo_cambio = True

        if hubo_cambio:
            actualizadas += 1
        else:
            omitidas += 1

    try:
        db.commit()

    except IntegrityError as error:
        db.rollback()

        raise SincronizacionZabbixError(
            "No fue posible guardar las alertas."
        ) from error

    return {
        "activo_id": activo.id,
        "procesadas": len(problemas),
        "registradas": registradas,
        "actualizadas": actualizadas,
        "omitidas": omitidas,
    }