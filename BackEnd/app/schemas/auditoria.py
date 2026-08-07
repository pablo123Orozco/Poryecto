"""Esquemas de respuesta para los registros de auditoria."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, IPvAnyAddress



class AuditoriaResponse(BaseModel):
    """Informacion de una operacion registrada automaticamente."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    organizacion_id: int
    usuario_id: int | None
    accion: str
    entidad: str
    entidad_id: int | None
    detalles: dict[str, object]
    direccion_ip: IPvAnyAddress | None
    agente_usuario: str | None
    creado_en: datetime