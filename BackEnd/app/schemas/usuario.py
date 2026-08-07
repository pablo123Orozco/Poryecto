"""Validaciones para la administracion de usuarios."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


RolPermitido = Literal[
    "ADMIN_EMPRESA",
    "TECNICO",
    "ANALISTA_SEGURIDAD",
    "AUDITOR",
]


class UsuarioCreate(BaseModel):
    """Datos para registrar un usuario dentro de la organizacion actual."""

    rol: RolPermitido
    nombres: str = Field(min_length=2, max_length=100)
    apellidos: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    telefono: str | None = Field(default=None, max_length=30)

    @field_validator("nombres", "apellidos")
    @classmethod
    def limpiar_nombres(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("El campo debe contener al menos dos caracteres.")
        return value

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("telefono")
    @classmethod
    def limpiar_telefono(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class EstadoUsuarioUpdate(BaseModel):
    """Activa o desactiva una cuenta sin eliminar su historial."""

    activo: bool


class UsuarioResponse(BaseModel):
    """Informacion segura del usuario, sin incluir su password hash."""

    id: int
    organizacion_id: int
    rol: str
    nombres: str
    apellidos: str
    email: str
    telefono: str | None
    activo: bool
    ultimo_acceso_en: datetime | None
    creado_en: datetime
