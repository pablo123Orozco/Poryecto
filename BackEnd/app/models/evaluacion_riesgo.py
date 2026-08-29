"""Modelo ORM para evaluaciones de riesgo alineadas con NIST."""

from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


IDENTIFICADOR = BigInteger().with_variant(Integer, "sqlite")
PUNTUACION = SmallInteger().with_variant(Integer, "sqlite")


class EvaluacionRiesgo(Base):
    """Riesgo identificado y evaluado para un activo tecnologico."""

    __tablename__ = "evaluaciones_riesgo"
    __table_args__ = (
        UniqueConstraint(
            "id",
            "organizacion_id",
            name="uq_riesgos_id_organizacion",
        ),
        UniqueConstraint(
            "organizacion_id",
            "codigo",
            name="uq_riesgos_organizacion_codigo",
        ),
        CheckConstraint(
            "probabilidad BETWEEN 1 AND 5",
            name="ck_riesgos_probabilidad",
        ),
        CheckConstraint(
            "impacto BETWEEN 1 AND 5",
            name="ck_riesgos_impacto",
        ),
        CheckConstraint(
            "puntaje_inherente BETWEEN 1 AND 25",
            name="ck_riesgos_puntaje_inherente",
        ),
        CheckConstraint(
            "nivel_inherente IN ('bajo', 'medio', 'alto', 'critico')",
            name="ck_riesgos_nivel_inherente",
        ),
        CheckConstraint(
            "tratamiento IN ('aceptar', 'reducir', 'transferir', 'evitar')",
            name="ck_riesgos_tratamiento",
        ),
        CheckConstraint(
            "estado IN ('identificado', 'en_tratamiento', 'aceptado', 'cerrado')",
            name="ck_riesgos_estado",
        ),
        CheckConstraint(
            "nist_funcion IN ('GV', 'ID', 'PR', 'DE', 'RS', 'RC')",
            name="ck_riesgos_nist_funcion",
        ),
        CheckConstraint(
            "probabilidad_residual IS NULL OR "
            "probabilidad_residual BETWEEN 1 AND 5",
            name="ck_riesgos_probabilidad_residual",
        ),
        CheckConstraint(
            "impacto_residual IS NULL OR impacto_residual BETWEEN 1 AND 5",
            name="ck_riesgos_impacto_residual",
        ),
        CheckConstraint(
            "puntaje_residual IS NULL OR puntaje_residual BETWEEN 1 AND 25",
            name="ck_riesgos_puntaje_residual",
        ),
        CheckConstraint(
            "nivel_residual IS NULL OR "
            "nivel_residual IN ('bajo', 'medio', 'alto', 'critico')",
            name="ck_riesgos_nivel_residual",
        ),
        Index(
            "ix_riesgos_organizacion_nivel",
            "organizacion_id",
            "nivel_inherente",
        ),
        Index(
            "ix_riesgos_activo_estado",
            "activo_id",
            "estado",
        ),
        Index(
            "ix_riesgos_nist",
            "nist_funcion",
            "nist_categoria",
        ),
    )

    id: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        Identity(always=True),
        primary_key=True,
    )
    organizacion_id: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        ForeignKey(
            "organizaciones.id",
            name="fk_riesgos_organizacion",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )
    activo_id: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        ForeignKey(
            "activos.id",
            name="fk_riesgos_activo",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )
    creado_por: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        ForeignKey(
            "usuarios.id",
            name="fk_riesgos_creador",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )
    responsable_id: Mapped[int | None] = mapped_column(
        IDENTIFICADOR,
        ForeignKey(
            "usuarios.id",
            name="fk_riesgos_responsable",
            ondelete="RESTRICT",
        ),
    )
    codigo: Mapped[str] = mapped_column(String(40), nullable=False)
    titulo: Mapped[str] = mapped_column(String(160), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    amenaza: Mapped[str] = mapped_column(String(500), nullable=False)
    vulnerabilidad: Mapped[str] = mapped_column(String(500), nullable=False)
    controles_existentes: Mapped[str | None] = mapped_column(Text)
    probabilidad: Mapped[int] = mapped_column(PUNTUACION, nullable=False)
    impacto: Mapped[int] = mapped_column(PUNTUACION, nullable=False)
    puntaje_inherente: Mapped[int] = mapped_column(
        PUNTUACION,
        nullable=False,
    )
    nivel_inherente: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )
    tratamiento: Mapped[str] = mapped_column(String(12), nullable=False)
    plan_tratamiento: Mapped[str | None] = mapped_column(Text)
    probabilidad_residual: Mapped[int | None] = mapped_column(PUNTUACION)
    impacto_residual: Mapped[int | None] = mapped_column(PUNTUACION)
    puntaje_residual: Mapped[int | None] = mapped_column(PUNTUACION)
    nivel_residual: Mapped[str | None] = mapped_column(String(10))
    nist_funcion: Mapped[str] = mapped_column(String(2), nullable=False)
    nist_categoria: Mapped[str] = mapped_column(String(8), nullable=False)
    nist_subcategoria: Mapped[str | None] = mapped_column(String(20))
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="identificado",
    )
    fecha_revision: Mapped[date | None] = mapped_column(Date)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
