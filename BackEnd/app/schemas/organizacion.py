"""Validaciones para el modulo de organizaciones."""

from datetime import datetime
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class OrganizacionCreate(BaseModel):
    """Datos necesarios para registrar una organizacion."""

    nombre: str = Field(min_length=2, max_length=150)
    nit: str | None = Field(default=None, max_length=25)
    sector: str | None = Field(default=None, max_length=80)
    correo_contacto: str | None = Field(default=None, max_length=255)
    telefono: str | None = Field(default=None, max_length=30)

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, value: str) -> str:
        nombre = value.strip()
        if len(nombre) < 2:
            raise ValueError("El nombre debe contener al menos dos caracteres.")
        return nombre

    @field_validator("nit", "sector", "correo_contacto", "telefono")
    @classmethod
    def limpiar_campos_opcionales(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class OrganizacionUpdate(BaseModel):
    """Campos que pueden modificarse en una organizacion."""

    nombre: str | None = Field(default=None, min_length=2, max_length=150)
    nit: str | None = Field(default=None, max_length=25)
    sector: str | None = Field(default=None, max_length=80)
    correo_contacto: str | None = Field(default=None, max_length=255)
    telefono: str | None = Field(default=None, max_length=30)
    estado: Literal["activa", "suspendida", "inactiva"] | None = None

    @model_validator(mode="after")
    def impedir_nulos_en_campos_requeridos(self) -> Self:
        if "nombre" in self.model_fields_set and self.nombre is None:
            raise ValueError("El nombre no puede ser nulo.")
        if "estado" in self.model_fields_set and self.estado is None:
            raise ValueError("El estado no puede ser nulo.")
        return self

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, value: str | None) -> str | None:
        if value is None:
            return None
        nombre = value.strip()
        if len(nombre) < 2:
            raise ValueError("El nombre debe contener al menos dos caracteres.")
        return nombre

    @field_validator("nit", "sector", "correo_contacto", "telefono")
    @classmethod
    def limpiar_campos_opcionales(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class OrganizacionResponse(BaseModel):
    """Informacion publica devuelta por el modulo."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    nit: str | None
    sector: str | None
    correo_contacto: str | None
    telefono: str | None
    estado: str
    creado_en: datetime
    actualizado_en: datetime
