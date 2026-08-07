"""Validaciones para el modulo de incidentes."""

from datetime import datetime
from typing import Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


PrioridadIncidente = Literal[
    "baja",
    "media",
    "alta",
    "critica",
]

EstadoIncidente = Literal[
    "abierto",
    "en_investigacion",
    "resuelto",
    "cerrado",
]


class IncidenteCreate(BaseModel):
    activo_id: int = Field(gt=0)
    asignado_a: int | None = Field(default=None, gt=0)
    titulo: str = Field(min_length=2, max_length=180)
    descripcion: str | None = None
    prioridad: PrioridadIncidente = "media"

    @field_validator("titulo")
    @classmethod
    def limpiar_titulo(cls, value: str) -> str:
        value = value.strip()

        if len(value) < 2:
            raise ValueError(
                "El titulo debe contener al menos dos caracteres."
            )

        return value

    @field_validator("descripcion")
    @classmethod
    def limpiar_descripcion(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return value.strip() or None


class IncidenteUpdate(BaseModel):
    asignado_a: int | None = Field(default=None, gt=0)
    titulo: str | None = Field(
        default=None,
        min_length=2,
        max_length=180,
    )
    descripcion: str | None = None
    prioridad: PrioridadIncidente | None = None
    solucion: str | None = None

    @model_validator(mode="after")
    def impedir_nulos_requeridos(self) -> Self:
        for campo in ("titulo", "prioridad"):
            if (
                campo in self.model_fields_set
                and getattr(self, campo) is None
            ):
                raise ValueError(
                    f"El campo {campo} no puede ser nulo."
                )

        return self

    @field_validator("titulo")
    @classmethod
    def limpiar_titulo(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if len(value) < 2:
            raise ValueError(
                "El titulo debe contener al menos dos caracteres."
            )

        return value

    @field_validator("descripcion", "solucion")
    @classmethod
    def limpiar_textos_opcionales(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return value.strip() or None


class EstadoIncidenteUpdate(BaseModel):
    estado: EstadoIncidente


class IncidenteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organizacion_id: int
    activo_id: int
    asignado_a: int | None
    codigo: str
    titulo: str
    descripcion: str | None
    prioridad: PrioridadIncidente
    estado: EstadoIncidente
    solucion: str | None
    abierto_en: datetime
    resuelto_en: datetime | None
    cerrado_en: datetime | None
    creado_en: datetime
    actualizado_en: datetime