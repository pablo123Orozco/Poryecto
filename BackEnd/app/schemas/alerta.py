"""Validaciones para el modulo de alertas."""

from datetime import datetime
from typing import Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


SeveridadAlerta = Literal[
    "informativa",
    "baja",
    "media",
    "alta",
    "critica",
]

EstadoAlerta = Literal[
    "activa",
    "reconocida",
    "resuelta",
    "descartada",
]


class AlertaCreate(BaseModel):
    activo_id: int = Field(gt=0)
    titulo: str = Field(min_length=2, max_length=180)
    descripcion: str | None = None
    severidad: SeveridadAlerta

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


class AlertaUpdate(BaseModel):
    titulo: str | None = Field(
        default=None,
        min_length=2,
        max_length=180,
    )
    descripcion: str | None = None
    severidad: SeveridadAlerta | None = None

    @model_validator(mode="after")
    def impedir_nulos_requeridos(self) -> Self:
        for campo in ("titulo", "severidad"):
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

    @field_validator("descripcion")
    @classmethod
    def limpiar_descripcion(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return value.strip() or None


class EstadoAlertaUpdate(BaseModel):
    estado: EstadoAlerta


class AlertaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organizacion_id: int
    activo_id: int
    zabbix_event_id: str | None
    titulo: str
    descripcion: str | None
    severidad: SeveridadAlerta
    estado: EstadoAlerta
    detectada_en: datetime
    resuelta_en: datetime | None
    creado_en: datetime
    actualizado_en: datetime