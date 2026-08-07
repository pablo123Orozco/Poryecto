"""Esquemas de respuesta para los planes."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class PlanResponse(BaseModel):
    """Informacion de un plan comercial disponible."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    limite_usuarios: int
    limite_activos: int
    incluye_ia: bool
    precio_mensual: Decimal
    precio_anual: Decimal
    activo: bool
    creado_en: datetime
    actualizado_en: datetime