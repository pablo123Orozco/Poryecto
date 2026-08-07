"""Esquemas para generar y consultar reportes."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


TipoReporte = Literal[
    "activos",
    "alertas",
    "incidentes",
    "mantenimientos",
]


class ReporteCreate(BaseModel):
    """Datos necesarios para generar un reporte CSV."""

    nombre: str = Field(min_length=2, max_length=160)
    tipo: TipoReporte

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, value: str) -> str:
        nombre = value.strip()
        if len(nombre) < 2:
            raise ValueError(
                "El nombre debe contener al menos dos caracteres."
            )
        return nombre


class ReporteResponse(BaseModel):
    """Metadatos publicos de un reporte generado."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    organizacion_id: int
    generado_por: int
    nombre: str
    tipo: str
    formato: str
    parametros: dict[str, object]
    generado_en: datetime