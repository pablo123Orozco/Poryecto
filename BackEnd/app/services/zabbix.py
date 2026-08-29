"""Cliente para consumir la API JSON-RPC de Zabbix."""

from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import settings


MAX_SEGUNDOS_SIN_DATOS = 600


class ZabbixError(Exception):
    """Error controlado al comunicarse con Zabbix."""


def llamar_api_zabbix(
    metodo: str,
    parametros: dict[str, Any] | None = None,
    requiere_token: bool = True,
) -> Any:
    """Ejecuta una solicitud JSON-RPC contra Zabbix."""

    if not settings.zabbix_api_url:
        raise ZabbixError("No se ha configurado ZABBIX_API_URL.")

    headers = {"Content-Type": "application/json-rpc"}

    if requiere_token:
        if not settings.zabbix_api_token:
            raise ZabbixError("No se ha configurado ZABBIX_API_TOKEN.")

        headers["Authorization"] = f"Bearer {settings.zabbix_api_token}"

    contenido = {
        "jsonrpc": "2.0",
        "method": metodo,
        "params": parametros or {},
        "id": 1,
    }

    try:
        respuesta = httpx.post(
            settings.zabbix_api_url,
            headers=headers,
            json=contenido,
            timeout=10.0,
        )
        respuesta.raise_for_status()
    except httpx.HTTPError as error:
        raise ZabbixError(
            "No fue posible comunicarse con Zabbix."
        ) from error

    try:
        datos = respuesta.json()
    except ValueError as error:
        raise ZabbixError(
            "Zabbix devolvio una respuesta no valida."
        ) from error

    if "error" in datos:
        detalle = datos["error"].get(
            "data",
            datos["error"].get(
                "message",
                "Error desconocido de Zabbix.",
            ),
        )
        raise ZabbixError(str(detalle))

    if "result" not in datos:
        raise ZabbixError("Zabbix no devolvio ningun resultado.")

    return datos["result"]


def comprobar_conexion_zabbix() -> dict[str, Any]:
    """Comprueba la API y el token configurado."""

    version = llamar_api_zabbix(
        "apiinfo.version",
        requiere_token=False,
    )
    total_hosts = llamar_api_zabbix(
        "host.get",
        {"countOutput": True},
    )

    return {
        "conectado": True,
        "version": str(version),
        "total_hosts": int(total_hosts),
    }


def listar_hosts_zabbix() -> list[dict[str, Any]]:
    """Obtiene los equipos registrados en Zabbix."""

    hosts = llamar_api_zabbix(
        "host.get",
        {
            "output": [
                "hostid",
                "host",
                "name",
                "status",
                "active_available",
                "maintenance_status",
                "maintenance_type",
                "maintenance_from",
            ],
            "selectInterfaces": [
                "interfaceid",
                "type",
                "ip",
                "dns",
                "port",
                "available",
                "error",
                "errors_from",
            ],
            "sortfield": "name",
        },
    )

    if not isinstance(hosts, list):
        raise ZabbixError("Zabbix devolvio una lista de hosts no valida.")

    return hosts


def obtener_host_zabbix(
    zabbix_host_id: str,
) -> dict[str, Any] | None:
    """Busca un host por su identificador."""

    hosts = llamar_api_zabbix(
        "host.get",
        {
            "hostids": [zabbix_host_id],
            "output": [
                "hostid",
                "host",
                "name",
                "status",
                "active_available",
                "maintenance_status",
                "maintenance_type",
                "maintenance_from",
            ],
            "selectInterfaces": [
                "interfaceid",
                "type",
                "ip",
                "dns",
                "port",
                "available",
                "error",
                "errors_from",
            ],
        },
    )

    if not isinstance(hosts, list):
        raise ZabbixError(
            "Zabbix devolvio una respuesta de host no valida."
        )

    if not hosts:
        return None

    return hosts[0]


def listar_metricas_host_zabbix(
    zabbix_host_id: str,
) -> list[dict[str, Any]]:
    """Obtiene las metricas principales de un host."""

    items = llamar_api_zabbix(
        "item.get",
        {
            "hostids": [zabbix_host_id],
            "monitored": True,
            "output": [
                "itemid",
                "name",
                "key_",
                "lastvalue",
                "lastclock",
                "units",
                "value_type",
                "state",
                "error",
            ],
        },
    )

    if not isinstance(items, list):
        raise ZabbixError("Zabbix devolvio metricas no validas.")

    claves_principales = {
        "agent.ping",
        "system.uptime",
        "system.hw.uptime[hrSystemUptime.0]",
        "system.net.uptime[sysUpTime.0]",
        "vm.memory.util",
        "zabbix[host,snmp,available]",
    }
    metricas: list[dict[str, Any]] = []

    for item in items:
        clave = str(item.get("key_", ""))
        es_cpu = clave.startswith("system.cpu.util")
        es_disco = (
            clave.startswith("vfs.fs.size[")
            and clave.endswith(",pused]")
        )
        es_interfaz_snmp = clave.startswith(
            (
                "net.if.in[",
                "net.if.out[",
                "net.if.status[",
                "net.if.speed[",
                "net.if.in.errors[",
                "net.if.out.errors[",
            )
        )
        tiene_valor = (
            item.get("lastclock") not in ("", "0", None)
            and item.get("lastvalue") not in ("", None)
        )

        if (
            clave in claves_principales
            or es_cpu
            or es_disco
            or es_interfaz_snmp
        ) and tiene_valor:
            metricas.append(item)

    return sorted(
        metricas,
        key=lambda metrica: str(metrica.get("name", "")),
    )


def obtener_historial_metrica_host_zabbix(
    zabbix_host_id: str,
    clave: str,
    horas: int = 1,
    limite: int = 300,
) -> dict[str, Any] | None:
    """Obtiene el historial numerico de una metrica."""

    items = llamar_api_zabbix(
        "item.get",
        {
            "hostids": [zabbix_host_id],
            "monitored": True,
            "filter": {"key_": [clave]},
            "output": [
                "itemid",
                "name",
                "key_",
                "units",
                "value_type",
            ],
        },
    )

    if not isinstance(items, list):
        raise ZabbixError(
            "Zabbix devolvio una metrica no valida."
        )

    if not items:
        return None

    item = items[0]

    try:
        tipo_valor = int(str(item.get("value_type", "")))
    except ValueError as error:
        raise ZabbixError(
            "La metrica no posee un tipo de valor valido."
        ) from error

    if tipo_valor not in (0, 3):
        raise ZabbixError(
            "La metrica seleccionada no es numerica."
        )

    hasta = int(datetime.now(timezone.utc).timestamp())
    desde = hasta - (horas * 60 * 60)

    historial = llamar_api_zabbix(
        "history.get",
        {
            "output": [
                "itemid",
                "clock",
                "value",
                "ns",
            ],
            "history": tipo_valor,
            "itemids": [str(item["itemid"])],
            "time_from": desde,
            "time_till": hasta,
            "sortfield": ["clock", "ns"],
            "sortorder": ["ASC", "ASC"],
            "limit": limite,
        },
    )

    if not isinstance(historial, list):
        raise ZabbixError(
            "Zabbix devolvio un historial no valido."
        )

    puntos: list[dict[str, int | float]] = []

    for registro in historial:
        try:
            puntos.append(
                {
                    "timestamp": int(str(registro["clock"])),
                    "valor": float(str(registro["value"])),
                }
            )
        except (KeyError, TypeError, ValueError):
            continue

    return {
        "item_id": str(item["itemid"]),
        "nombre": str(item.get("name", "")),
        "clave": str(item.get("key_", clave)),
        "unidad": str(item.get("units", "")),
        "desde": desde,
        "hasta": hasta,
        "puntos": puntos,
    }


def listar_problemas_host_zabbix(
    zabbix_host_id: str,
) -> list[dict[str, Any]]:
    """Obtiene problemas activos y recientes de un host."""

    problemas = llamar_api_zabbix(
        "problem.get",
        {
            "hostids": [zabbix_host_id],
            "output": [
                "eventid",
                "name",
                "severity",
                "clock",
                "r_eventid",
                "r_clock",
                "acknowledged",
                "opdata",
            ],
            "recent": True,
            "sortfield": ["eventid"],
            "sortorder": "DESC",
        },
    )

    if not isinstance(problemas, list):
        raise ZabbixError("Zabbix devolvio problemas no validos.")

    return problemas


def convertir_valor_numerico(valor: Any) -> float | None:
    """Convierte un valor de Zabbix a numero cuando es posible."""

    try:
        return round(float(valor), 2)
    except (TypeError, ValueError):
        return None


def obtener_valor_metrica(
    metricas: list[dict[str, Any]],
    clave_buscada: str,
) -> float | None:
    """Obtiene el ultimo valor de una metrica con clave exacta."""

    for metrica in metricas:
        if str(metrica.get("key_", "")) == clave_buscada:
            return convertir_valor_numerico(metrica.get("lastvalue"))

    return None


def obtener_valor_cpu(
    metricas: list[dict[str, Any]],
) -> float | None:
    """Obtiene el porcentaje de uso general del procesador."""

    for metrica in metricas:
        clave = str(metrica.get("key_", ""))
        if clave == "system.cpu.util":
            return convertir_valor_numerico(metrica.get("lastvalue"))

    for metrica in metricas:
        clave = str(metrica.get("key_", ""))
        if clave.startswith("system.cpu.util"):
            return convertir_valor_numerico(metrica.get("lastvalue"))

    return None


def obtener_valor_disco(
    metricas: list[dict[str, Any]],
) -> float | None:
    """Obtiene el mayor porcentaje de uso entre los discos."""

    valores: list[float] = []

    for metrica in metricas:
        clave = str(metrica.get("key_", ""))
        if clave.startswith("vfs.fs.size[") and clave.endswith(",pused]"):
            valor = convertir_valor_numerico(metrica.get("lastvalue"))
            if valor is not None:
                valores.append(valor)

    return max(valores) if valores else None


def obtener_ultima_comunicacion(
    metricas: list[dict[str, Any]],
) -> tuple[int | None, str | None]:
    """Obtiene la fecha de la metrica mas reciente del host."""

    marcas_tiempo: list[int] = []

    for metrica in metricas:
        try:
            marca = int(str(metrica.get("lastclock", "0")))
        except (TypeError, ValueError):
            continue

        if marca > 0:
            marcas_tiempo.append(marca)

    if not marcas_tiempo:
        return None, None

    ultima_marca = max(marcas_tiempo)
    fecha = datetime.fromtimestamp(
        ultima_marca,
        tz=timezone.utc,
    ).isoformat()

    return ultima_marca, fecha


def problema_se_encuentra_abierto(
    problema: dict[str, Any],
) -> bool:
    """Indica si un problema de Zabbix aun no ha sido resuelto."""

    return (
        str(problema.get("r_eventid", "0")) in ("", "0")
        and str(problema.get("r_clock", "0")) in ("", "0")
    )


def host_sin_conexion(host: dict[str, Any]) -> bool:
    """Determina si Zabbix reporta el host como no disponible."""

    if str(host.get("active_available", "0")) == "2":
        return True

    interfaces = host.get("interfaces", [])
    if not isinstance(interfaces, list):
        return False

    interfaces_monitoreo = [
        interfaz
        for interfaz in interfaces
        if str(interfaz.get("type", "")) in ("1", "2")
    ]

    return bool(interfaces_monitoreo) and all(
        str(interfaz.get("available", "0")) == "2"
        for interfaz in interfaces_monitoreo
    )


def obtener_disponibilidad_snmp(
    host: dict[str, Any],
) -> str:
    """Resume la disponibilidad de las interfaces SNMP del host."""

    interfaces = host.get("interfaces", [])
    if not isinstance(interfaces, list):
        return "0"

    disponibilidades = [
        str(interfaz.get("available", "0"))
        for interfaz in interfaces
        if str(interfaz.get("type", "")) == "2"
    ]

    if not disponibilidades:
        return "0"
    if "1" in disponibilidades:
        return "1"
    if all(valor == "2" for valor in disponibilidades):
        return "2"
    return "0"


def determinar_estado_host(
    host: dict[str, Any],
    metricas: list[dict[str, Any]],
    problemas_abiertos: list[dict[str, Any]],
    ultima_marca: int | None,
) -> str:
    """Calcula el estado funcional de un host monitoreado."""

    if str(host.get("status", "0")) == "1":
        return "deshabilitado"

    if str(host.get("maintenance_status", "0")) == "1":
        return "mantenimiento"

    if host_sin_conexion(host):
        return "sin_conexion"

    if not metricas or ultima_marca is None:
        return "sin_datos"

    ahora = int(datetime.now(timezone.utc).timestamp())
    if ahora - ultima_marca > MAX_SEGUNDOS_SIN_DATOS:
        return "sin_datos"

    severidades = [
        int(str(problema.get("severity", "0")))
        for problema in problemas_abiertos
        if str(problema.get("severity", "0")).isdigit()
    ]
    severidad_maxima = max(severidades, default=0)

    if severidad_maxima >= 5:
        return "critico"

    if severidad_maxima >= 2:
        return "degradado"

    return "saludable"


def obtener_estado_host_zabbix(
    zabbix_host_id: str,
) -> dict[str, Any]:
    """Construye el estado resumido de un host de Zabbix."""

    host = obtener_host_zabbix(zabbix_host_id)
    if host is None:
        raise ZabbixError("Host de Zabbix no encontrado.")

    metricas = listar_metricas_host_zabbix(zabbix_host_id)
    problemas = listar_problemas_host_zabbix(zabbix_host_id)
    problemas_abiertos = [
        problema
        for problema in problemas
        if problema_se_encuentra_abierto(problema)
    ]

    ultima_marca, ultima_comunicacion = obtener_ultima_comunicacion(
        metricas
    )
    estado = determinar_estado_host(
        host,
        metricas,
        problemas_abiertos,
        ultima_marca,
    )
    severidad_maxima = max(
        (
            int(str(problema.get("severity", "0")))
            for problema in problemas_abiertos
            if str(problema.get("severity", "0")).isdigit()
        ),
        default=0,
    )

    return {
        "zabbix_host_id": str(host.get("hostid", zabbix_host_id)),
        "host": str(host.get("host", "")),
        "nombre": str(host.get("name", host.get("host", ""))),
        "estado": estado,
        "habilitado": str(host.get("status", "0")) == "0",
        "disponibilidad_activa": str(
            host.get("active_available", "0")
        ),
        "disponibilidad_snmp": obtener_disponibilidad_snmp(host),
        "en_mantenimiento": str(
            host.get("maintenance_status", "0")
        ) == "1",
        "ultima_comunicacion": ultima_comunicacion,
        "problemas_abiertos": len(problemas_abiertos),
        "severidad_maxima": severidad_maxima,
        "cpu": obtener_valor_cpu(metricas),
        "memoria": obtener_valor_metrica(
            metricas,
            "vm.memory.util",
        ),
        "disco": obtener_valor_disco(metricas),
    }


def determinar_estado_general(
    conteos: dict[str, int],
    total_hosts: int,
) -> str:
    """Calcula el estado general usando los estados de todos los hosts."""

    if total_hosts == 0:
        return "sin_datos"
    if conteos["critico"] > 0:
        return "critico"
    if conteos["sin_conexion"] > 0:
        return "sin_conexion"
    if conteos["degradado"] > 0:
        return "degradado"
    if conteos["sin_datos"] > 0:
        return "sin_datos"
    if conteos["saludable"] > 0:
        return "saludable"
    if conteos["mantenimiento"] > 0:
        return "mantenimiento"
    return "deshabilitado"


def obtener_estado_infraestructura_zabbix(
    zabbix_host_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Calcula el estado general y el detalle de los hosts solicitados.

    Si ``zabbix_host_ids`` es ``None``, procesa todos los hosts de Zabbix.
    Si recibe una lista vacia, devuelve una infraestructura sin hosts.
    """

    hosts_zabbix = listar_hosts_zabbix()

    if zabbix_host_ids is not None:
        ids_permitidos = {str(host_id) for host_id in zabbix_host_ids}
        hosts_zabbix = [
            host
            for host in hosts_zabbix
            if str(host.get("hostid", "")) in ids_permitidos
        ]

    estados_hosts: list[dict[str, Any]] = []

    for host in hosts_zabbix:
        host_id = str(host.get("hostid", ""))
        if not host_id:
            continue

        try:
            estado_host = obtener_estado_host_zabbix(host_id)
        except ZabbixError as error:
            estado_host = {
                "zabbix_host_id": host_id,
                "host": str(host.get("host", "")),
                "nombre": str(
                    host.get("name", host.get("host", ""))
                ),
                "estado": "sin_datos",
                "habilitado": str(host.get("status", "0")) == "0",
                "disponibilidad_activa": str(
                    host.get("active_available", "0")
                ),
                "disponibilidad_snmp": obtener_disponibilidad_snmp(
                    host
                ),
                "en_mantenimiento": str(
                    host.get("maintenance_status", "0")
                ) == "1",
                "ultima_comunicacion": None,
                "problemas_abiertos": 0,
                "severidad_maxima": 0,
                "cpu": None,
                "memoria": None,
                "disco": None,
                "error": str(error),
            }

        estados_hosts.append(estado_host)

    nombres_estados = (
        "saludable",
        "degradado",
        "critico",
        "sin_conexion",
        "sin_datos",
        "mantenimiento",
        "deshabilitado",
    )
    conteos = {
        nombre: sum(
            1
            for host in estados_hosts
            if host.get("estado") == nombre
        )
        for nombre in nombres_estados
    }
    problemas_abiertos = sum(
        int(host.get("problemas_abiertos", 0))
        for host in estados_hosts
    )
    estado_general = determinar_estado_general(
        conteos,
        len(estados_hosts),
    )

    return {
        "estado_general": estado_general,
        "total_hosts": len(estados_hosts),
        "saludables": conteos["saludable"],
        "degradados": conteos["degradado"],
        "criticos": conteos["critico"],
        "sin_conexion": conteos["sin_conexion"],
        "sin_datos": conteos["sin_datos"],
        "en_mantenimiento": conteos["mantenimiento"],
        "deshabilitados": conteos["deshabilitado"],
        "problemas_abiertos": problemas_abiertos,
        "hosts": estados_hosts,
    }