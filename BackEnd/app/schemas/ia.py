"""Esquemas para el analisis preventivo generado con IA."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


NivelRiesgo = Literal["bajo", "medio", "alto", "critico"]
PrioridadRecomendacion = Literal[
    "baja",
    "media",
    "alta",
    "critica",
]


class RecomendacionIA(BaseModel):
    """Accion preventiva propuesta por el modelo."""

    model_config = ConfigDict(extra="forbid")

    titulo: str = Field(min_length=3, max_length=120)
    prioridad: PrioridadRecomendacion
    descripcion: str = Field(min_length=10, max_length=500)
    accion: str = Field(min_length=5, max_length=300)


class ResultadoGeneradoIA(BaseModel):
    """Contenido que Groq debe devolver en formato estructurado."""

    model_config = ConfigDict(extra="forbid")

    nivel_riesgo: NivelRiesgo
    resumen: str = Field(min_length=20, max_length=1000)
    hallazgos: list[str] = Field(min_length=1, max_length=8)
    recomendaciones: list[RecomendacionIA] = Field(
        min_length=1,
        max_length=6,
    )


class AnalisisActivoIAResponse(ResultadoGeneradoIA):
    """Respuesta final entregada por el endpoint de la plataforma."""

    activo_id: int
    modelo: str
    generado_en: datetime
    advertencia: str
