"""Rutas para la integracion con Zabbix."""

from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.models.activo import Activo
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.services.sincronizacion_zabbix import (
    SincronizacionZabbixError,
    sincronizar_alertas_zabbix,
    sincronizar_metricas_zabbix,
)
from app.services.zabbix import (
    ZabbixError,
    comprobar_conexion_zabbix,
    listar_hosts_zabbix,
    listar_metricas_host_zabbix,
    listar_problemas_host_zabbix,
    obtener_estado_infraestructura_zabbix,
)


router = APIRouter(
    prefix="/zabbix",
    tags=["Zabbix"],
)

ROLES_SINCRONIZACION = {
    "ADMIN_EMPRESA",
    "TECNICO",
}


def obtener_gestor_zabbix(
    usuario: Usuario = Depends(
        obtener_usuario_actual
    ),
    db: Session = Depends(get_db),
) -> Usuario:
    """Permite sincronizar al administrador y tecnico."""

    rol = db.get(Rol, usuario.rol_id)

    if (
        rol is None
        or rol.nombre not in ROLES_SINCRONIZACION
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Se requiere el rol ADMIN_EMPRESA "
                "o TECNICO."
            ),
        )

    return usuario


def obtener_activo_vinculado(
    activo_id: int,
    usuario: Usuario,
    db: Session,
) -> Activo:
    """Obtiene un activo asociado con Zabbix."""

    activo = db.scalar(
        select(Activo).where(
            Activo.id == activo_id,
            Activo.organizacion_id
            == usuario.organizacion_id,
        )
    )

    if activo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activo no encontrado.",
        )

    if not activo.zabbix_host_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "El activo no esta asociado "
                "con un host de Zabbix."
            ),
        )

    return activo


@router.get("/estado")
def consultar_estado_zabbix(
    usuario: Usuario = Depends(
        obtener_usuario_actual
    ),
) -> dict[str, Any]:
    """Comprueba la conexion con Zabbix."""

    del usuario

    try:
        return comprobar_conexion_zabbix()

    except ZabbixError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error


@router.get("/hosts")
def consultar_hosts_zabbix(
    usuario: Usuario = Depends(
        obtener_usuario_actual
    ),
) -> list[dict[str, Any]]:
    """Lista los equipos registrados en Zabbix."""

    del usuario

    try:
        return listar_hosts_zabbix()

    except ZabbixError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error


@router.get("/activos/{activo_id}/metricas")
def consultar_metricas_activo_zabbix(
    activo_id: int,
    usuario: Usuario = Depends(
        obtener_usuario_actual
    ),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Consulta las metricas actuales de un activo."""

    activo = obtener_activo_vinculado(
        activo_id=activo_id,
        usuario=usuario,
        db=db,
    )

    try:
        return listar_metricas_host_zabbix(
            activo.zabbix_host_id
        )

    except ZabbixError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error


@router.get("/activos/{activo_id}/problemas")
def consultar_problemas_activo_zabbix(
    activo_id: int,
    usuario: Usuario = Depends(
        obtener_usuario_actual
    ),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Consulta los problemas detectados por Zabbix."""

    activo = obtener_activo_vinculado(
        activo_id=activo_id,
        usuario=usuario,
        db=db,
    )

    try:
        return listar_problemas_host_zabbix(
            activo.zabbix_host_id
        )

    except ZabbixError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error


@router.post("/activos/{activo_id}/sincronizar")
def sincronizar_metricas_activo(
    activo_id: int,
    gestor: Usuario = Depends(
        obtener_gestor_zabbix
    ),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    """Guarda en PostgreSQL las metricas actuales."""

    activo = obtener_activo_vinculado(
        activo_id=activo_id,
        usuario=gestor,
        db=db,
    )

    try:
        return sincronizar_metricas_zabbix(
            activo=activo,
            db=db,
        )

    except ZabbixError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error

    except SincronizacionZabbixError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.post(
    "/activos/{activo_id}/sincronizar-alertas"
)
def sincronizar_alertas_activo(
    activo_id: int,
    gestor: Usuario = Depends(
        obtener_gestor_zabbix
    ),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    """Guarda los problemas de Zabbix como alertas."""

    activo = obtener_activo_vinculado(
        activo_id=activo_id,
        usuario=gestor,
        db=db,
    )

    try:
        return sincronizar_alertas_zabbix(
            activo=activo,
            db=db,
        )

    except ZabbixError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error

    except SincronizacionZabbixError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.get("/infraestructura")
def consultar_estado_infraestructura(
    usuario: Usuario = Depends(
        obtener_usuario_actual
    ),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Consulta el estado de la infraestructura vinculada."""

    consulta = (
        select(Activo.zabbix_host_id)
        .where(
            Activo.organizacion_id
            == usuario.organizacion_id,
            Activo.zabbix_host_id.is_not(None),
        )
        .distinct()
    )
    zabbix_host_ids = [
        str(host_id)
        for host_id in db.scalars(consulta).all()
        if host_id
    ]

    try:
        return obtener_estado_infraestructura_zabbix(
            zabbix_host_ids
        )

    except ZabbixError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=str(error),
        ) from error