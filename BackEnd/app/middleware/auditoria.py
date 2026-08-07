"""Registro automatico de operaciones autenticadas."""

from collections.abc import Awaitable, Callable
from ipaddress import ip_address

from fastapi import Request, Response
from sqlalchemy.exc import SQLAlchemyError

from app.database import SessionLocal
from app.models.auditoria import Auditoria


ACCIONES = {
    "POST": "crear",
    "PUT": "actualizar",
    "PATCH": "actualizar",
    "DELETE": "eliminar",
}


def obtener_entidad_y_id(
    ruta: str,
) -> tuple[str | None, int | None]:
    partes = [
        parte
        for parte in ruta.split("/")
        if parte
    ]

    if len(partes) < 3 or partes[:2] != ["api", "v1"]:
        return None, None

    entidad = partes[2][:80]
    entidad_id = None

    for parte in partes[3:]:
        if parte.isdigit():
            entidad_id = int(parte)
            break

    return entidad, entidad_id


def obtener_ip(request: Request) -> str | None:
    if request.client is None:
        return None

    valor = request.client.host

    try:
        ip_address(valor)
    except ValueError:
        return None

    return valor


async def registrar_auditoria(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Guarda operaciones autenticadas que terminaron correctamente."""

    response = await call_next(request)

    accion = ACCIONES.get(request.method)
    usuario = getattr(
        request.state,
        "usuario_actual",
        None,
    )
    entidad, entidad_id = obtener_entidad_y_id(
        request.url.path
    )

    if (
        accion is None
        or usuario is None
        or entidad is None
        or not 200 <= response.status_code < 300
    ):
        return response

    registro = Auditoria(
        organizacion_id=usuario.organizacion_id,
        usuario_id=usuario.id,
        accion=accion,
        entidad=entidad,
        entidad_id=entidad_id,
        detalles={
            "metodo": request.method,
            "ruta": request.url.path,
            "codigo_respuesta": response.status_code,
        },
        direccion_ip=obtener_ip(request),
        agente_usuario=(
            request.headers.get("user-agent", "")[:500]
            or None
        ),
    )

    with SessionLocal() as db:
        try:
            db.add(registro)
            db.commit()
        except SQLAlchemyError:
            db.rollback()

    return response