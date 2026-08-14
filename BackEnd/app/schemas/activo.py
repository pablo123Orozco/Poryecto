"""Validaciones para el inventario de activos."""

from datetime import date, datetime
from typing import Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    IPvAnyAddress,
    field_validator,
    model_validator,
)


CriticidadActivo = Literal["baja", "media", "alta", "critica"]
EstadoActivo = Literal["activo", "inactivo", "mantenimiento", "retirado"]


class ActivoCreate(BaseModel):
    sede_id: int | None = Field(default=None, gt=0)
    tipo_activo_id: int = Field(gt=0)
    nombre: str = Field(min_length=2, max_length=150)
    codigo_interno: str | None = Field(default=None, max_length=80)
    direccion_ip: IPvAnyAddress | None = None
    nombre_host: str | None = Field(default=None, max_length=255)
    sistema_operativo: str | None = Field(default=None, max_length=150)
    fabricante: str | None = Field(default=None, max_length=100)
    modelo: str | None = Field(default=None, max_length=100)
    numero_serie: str | None = Field(default=None, max_length=120)
    criticidad: CriticidadActivo = "media"
    fecha_adquisicion: date | None = None
    descripcion: str | None = None

    @field_validator("nombre")
    @classmethod
    def limpiar_nombre(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError(
                "El nombre debe contener al menos dos caracteres."
            )
        return value

    @field_validator(
        "codigo_interno",
        "nombre_host",
        "sistema_operativo",
        "fabricante",
        "modelo",
        "numero_serie",
        "descripcion",
    )
    @classmethod
    def limpiar_textos_opcionales(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class ActivoUpdate(BaseModel):
    sede_id: int | None = Field(default=None, gt=0)
    tipo_activo_id: int | None = Field(default=None, gt=0)
    nombre: str | None = Field(default=None, min_length=2, max_length=150)
    codigo_interno: str | None = Field(default=None, max_length=80)
    direccion_ip: IPvAnyAddress | None = None
    nombre_host: str | None = Field(default=None, max_length=255)
    sistema_operativo: str | None = Field(default=None, max_length=150)
    fabricante: str | None = Field(default=None, max_length=100)
    modelo: str | None = Field(default=None, max_length=100)
    numero_serie: str | None = Field(default=None, max_length=120)
    criticidad: CriticidadActivo | None = None
    fecha_adquisicion: date | None = None
    descripcion: str | None = None

    @model_validator(mode="after")
    def impedir_nulos_requeridos(self) -> Self:
        for campo in ("tipo_activo_id", "nombre", "criticidad"):
            if campo in self.model_fields_set and getattr(self, campo) is None:
                raise ValueError(
                    f"El campo {campo} no puede ser nulo."
                )
        return self

    @field_validator("nombre")
    @classmethod
    def limpiar_nombre(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()
        if len(value) < 2:
            raise ValueError(
                "El nombre debe contener al menos dos caracteres."
            )
        return value

    @field_validator(
        "codigo_interno",
        "nombre_host",
        "sistema_operativo",
        "fabricante",
        "modelo",
        "numero_serie",
        "descripcion",
    )
    @classmethod
    def limpiar_textos_opcionales(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None
        return value.strip() or None

class ZabbixHostUpdate(BaseModel):
    """Host de Zabbix asociado al activo."""

    zabbix_host_id: str | None = Field(
        default=None,
        max_length=100,
    )

    @field_validator("zabbix_host_id")
    @classmethod
    def limpiar_zabbix_host_id(
        cls,
        value: str | None,
    ) -> str | None:
        if value is None:
            return None

        return value.strip() or None

class EstadoActivoUpdate(BaseModel):
    estado: EstadoActivo


class ActivoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organizacion_id: int
    sede_id: int | None
    tipo_activo_id: int
    nombre: str
    codigo_interno: str | None
    direccion_ip: IPvAnyAddress | None
    nombre_host: str | None
    nombre_host: str | None
    zabbix_host_id: str | None
    sistema_operativo: str | None
    sistema_operativo: str | None
    fabricante: str | None
    modelo: str | None
    numero_serie: str | None
    criticidad: CriticidadActivo
    estado: EstadoActivo
    fecha_adquisicion: date | None
    descripcion: str | None
    creado_en: datetime
    actualizado_en: datetime


class TipoActivoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None