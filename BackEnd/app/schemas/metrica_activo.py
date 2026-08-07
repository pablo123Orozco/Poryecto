"""Validaciones para el modulo de metricas de activos."""

from datetime import datetime
from decimal import Decimal
from typing import Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class MetricaCreate(BaseModel):
    activo_id: int = Field(gt=0)
    clave_metrica: str = Field(min_length=1, max_length=150)
    nombre_metrica: str = Field(min_length=2, max_length=150)
    valor_numerico: Decimal | None = Field(
        default=None,
        max_digits=20,
        decimal_places=6,
    )
    valor_texto: str | None = None
    unidad: str | None = Field(default=None, max_length=30)
    capturada_en: datetime | None = None

    @field_validator(
        "clave_metrica",
        "nombre_metrica",
    )
    @classmethod
    def limpiar_campos_requeridos(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("El campo no puede estar vacio.")

        return value

    @field_validator(
        "valor_texto",
        "unidad",
    )
    @classmethod
    def limpiar_campos_opcionales(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return value.strip() or None

    @model_validator(mode="after")
    def validar_un_solo_valor(self) -> Self:
        tiene_numero = self.valor_numerico is not None
        tiene_texto = self.valor_texto is not None

        if tiene_numero == tiene_texto:
            raise ValueError(
                "Debe enviar valor_numerico o valor_texto, "
                "pero no ambos."
            )

        return self


class MetricaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activo_id: int
    clave_metrica: str
    nombre_metrica: str
    valor_numerico: Decimal | None
    valor_texto: str | None
    unidad: str | None
    capturada_en: datetime
    creado_en: datetime