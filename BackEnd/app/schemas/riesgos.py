"""Esquemas para evaluaciones de riesgo alineadas con NIST."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


NivelRiesgo = Literal["bajo", "medio", "alto", "critico"]
FuncionNIST = Literal["GV", "ID", "PR", "DE", "RS", "RC"]
TratamientoRiesgo = Literal["aceptar", "reducir", "transferir", "evitar"]
EstadoRiesgo = Literal[
    "identificado",
    "en_tratamiento",
    "aceptado",
    "cerrado",
]


class EvaluacionRiesgoCreate(BaseModel):
    """Datos necesarios para registrar una evaluacion."""

    activo_id: int = Field(gt=0)
    responsable_id: int | None = Field(default=None, gt=0)
    titulo: str = Field(min_length=3, max_length=160)
    descripcion: str | None = Field(default=None, max_length=3000)
    amenaza: str = Field(min_length=3, max_length=500)
    vulnerabilidad: str = Field(min_length=3, max_length=500)
    controles_existentes: str | None = Field(default=None, max_length=3000)
    probabilidad: int = Field(ge=1, le=5)
    impacto: int = Field(ge=1, le=5)
    tratamiento: TratamientoRiesgo
    plan_tratamiento: str | None = Field(default=None, max_length=3000)
    probabilidad_residual: int | None = Field(default=None, ge=1, le=5)
    impacto_residual: int | None = Field(default=None, ge=1, le=5)
    nist_funcion: FuncionNIST
    nist_categoria: str = Field(pattern=r"^(GV|ID|PR|DE|RS|RC)\.[A-Z]{2}$")
    nist_subcategoria: str | None = Field(
        default=None,
        pattern=r"^(GV|ID|PR|DE|RS|RC)\.[A-Z]{2}-\d{2}$",
    )
    estado: EstadoRiesgo = "identificado"
    fecha_revision: date | None = None

    @model_validator(mode="after")
    def validar_riesgo_residual(self) -> "EvaluacionRiesgoCreate":
        if (self.probabilidad_residual is None) != (
            self.impacto_residual is None
        ):
            raise ValueError(
                "La probabilidad y el impacto residual deben enviarse juntos."
            )
        return self


class EvaluacionRiesgoUpdate(BaseModel):
    """Campos modificables de una evaluacion existente."""

    activo_id: int | None = Field(default=None, gt=0)
    responsable_id: int | None = Field(default=None, gt=0)
    titulo: str | None = Field(default=None, min_length=3, max_length=160)
    descripcion: str | None = Field(default=None, max_length=3000)
    amenaza: str | None = Field(default=None, min_length=3, max_length=500)
    vulnerabilidad: str | None = Field(default=None, min_length=3, max_length=500)
    controles_existentes: str | None = Field(default=None, max_length=3000)
    probabilidad: int | None = Field(default=None, ge=1, le=5)
    impacto: int | None = Field(default=None, ge=1, le=5)
    tratamiento: TratamientoRiesgo | None = None
    plan_tratamiento: str | None = Field(default=None, max_length=3000)
    probabilidad_residual: int | None = Field(default=None, ge=1, le=5)
    impacto_residual: int | None = Field(default=None, ge=1, le=5)
    nist_funcion: FuncionNIST | None = None
    nist_categoria: str | None = Field(
        default=None,
        pattern=r"^(GV|ID|PR|DE|RS|RC)\.[A-Z]{2}$",
    )
    nist_subcategoria: str | None = Field(
        default=None,
        pattern=r"^(GV|ID|PR|DE|RS|RC)\.[A-Z]{2}-\d{2}$",
    )
    estado: EstadoRiesgo | None = None
    fecha_revision: date | None = None


class EvaluacionRiesgoResponse(BaseModel):
    """Evaluacion completa calculada por la plataforma."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    organizacion_id: int
    activo_id: int
    creado_por: int
    responsable_id: int | None
    codigo: str
    titulo: str
    descripcion: str | None
    amenaza: str
    vulnerabilidad: str
    controles_existentes: str | None
    probabilidad: int
    impacto: int
    puntaje_inherente: int
    nivel_inherente: NivelRiesgo
    tratamiento: TratamientoRiesgo
    plan_tratamiento: str | None
    probabilidad_residual: int | None
    impacto_residual: int | None
    puntaje_residual: int | None
    nivel_residual: NivelRiesgo | None
    nist_funcion: FuncionNIST
    nist_categoria: str
    nist_subcategoria: str | None
    estado: EstadoRiesgo
    fecha_revision: date | None
    creado_en: datetime
    actualizado_en: datetime
