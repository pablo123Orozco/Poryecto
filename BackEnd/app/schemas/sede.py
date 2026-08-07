"""Validaciones para el modulo de sedes."""

from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SedeCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    direccion: str | None = Field(default=None, max_length=300)
    ciudad: str | None = Field(default=None, max_length=100)
    pais: str = Field(default="Guatemala", min_length=2, max_length=100)

    @field_validator("nombre", "pais")
    @classmethod
    def limpiar_campos_requeridos(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("El campo debe contener al menos dos caracteres.")
        return value

    @field_validator("direccion", "ciudad")
    @classmethod
    def limpiar_campos_opcionales(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class SedeUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=120)
    direccion: str | None = Field(default=None, max_length=300)
    ciudad: str | None = Field(default=None, max_length=100)
    pais: str | None = Field(default=None, min_length=2, max_length=100)

    @model_validator(mode="after")
    def impedir_nulos_en_campos_requeridos(self) -> Self:
        if "nombre" in self.model_fields_set and self.nombre is None:
            raise ValueError("El nombre no puede ser nulo.")
        if "pais" in self.model_fields_set and self.pais is None:
            raise ValueError("El pais no puede ser nulo.")
        return self

    @field_validator("nombre", "pais")
    @classmethod
    def limpiar_requeridos(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if len(value) < 2:
            raise ValueError("El campo debe contener al menos dos caracteres.")
        return value

    @field_validator("direccion", "ciudad")
    @classmethod
    def limpiar_opcionales(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class SedeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organizacion_id: int
    nombre: str
    direccion: str | None
    ciudad: str | None
    pais: str
    activa: bool
    creado_en: datetime
    actualizado_en: datetime