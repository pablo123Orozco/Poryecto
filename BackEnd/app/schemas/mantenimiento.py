"""Validaciones para el modulo de mantenimientos."""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


TipoMantenimiento = Literal["preventivo", "correctivo"]

EstadoMantenimiento = Literal[
    "programado",
    "en_proceso",
    "completado",
    "cancelado",
]


class MantenimientoCreate(BaseModel):
    activo_id: int = Field(gt=0)
    responsable_id: int | None = Field(default=None, gt=0)
    tipo: TipoMantenimiento
    descripcion: str = Field(min_length=2)
    costo: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    programado_para: datetime | None = None

    @field_validator("descripcion")
    @classmethod
    def limpiar_descripcion(cls, value: str) -> str:
        value = value.strip()

        if len(value) < 2:
            raise ValueError(
                "La descripcion debe contener al menos dos caracteres."
            )

        return value


class MantenimientoUpdate(BaseModel):
    responsable_id: int | None = Field(default=None, gt=0)
    tipo: TipoMantenimiento | None = None
    descripcion: str | None = Field(default=None, min_length=2)
    resultado: str | None = None
    costo: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    programado_para: datetime | None = None

    @model_validator(mode="after")
    def impedir_nulos_requeridos(self) -> Self:
        for campo in ("tipo", "descripcion"):
            if (
                campo in self.model_fields_set
                and getattr(self, campo) is None
            ):
                raise ValueError(
                    f"El campo {campo} no puede ser nulo."
                )

        return self

    @field_validator("descripcion")
    @classmethod
    def limpiar_descripcion(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        value = value.strip()

        if len(value) < 2:
            raise ValueError(
                "La descripcion debe contener al menos dos caracteres."
            )

        return value

    @field_validator("resultado")
    @classmethod
    def limpiar_resultado(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return value.strip() or None


class EstadoMantenimientoUpdate(BaseModel):
    estado: EstadoMantenimiento


class MantenimientoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organizacion_id: int
    activo_id: int
    responsable_id: int | None
    tipo: TipoMantenimiento
    estado: EstadoMantenimiento
    descripcion: str
    resultado: str | None
    costo: Decimal | None
    programado_para: datetime | None
    iniciado_en: datetime | None
    finalizado_en: datetime | None
    creado_en: datetime
    actualizado_en: datetime