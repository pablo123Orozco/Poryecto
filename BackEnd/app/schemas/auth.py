"""Esquemas de entrada y salida para autenticacion."""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegistroAdministrador(BaseModel):
    """Datos para crear el primer administrador de una organizacion."""

    organizacion_id: int = Field(gt=0)
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


class LoginRequest(BaseModel):
    """Credenciales necesarias para iniciar sesion."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class TokenResponse(BaseModel):
    """Token de acceso emitido al autenticar un usuario."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int

