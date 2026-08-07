"""Esquemas para crear y consultar suscripciones."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SuscripcionCreate(BaseModel):
    """Plan y periodicidad que contratara la organizacion."""

    plan_id: int = Field(gt=0)
    periodicidad: Literal["mensual", "anual"]


class SuscripcionResponse(BaseModel):
    """Informacion de una suscripcion de la organizacion."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    organizacion_id: int
    plan_id: int
    periodicidad: str
    precio_contratado: Decimal
    estado: str
    inicia_en: date
    termina_en: date | None
    creado_en: datetime
    actualizado_en: datetime