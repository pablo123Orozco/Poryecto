"""Modelo ORM de la tabla mantenimientos."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Identity,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


IDENTIFICADOR = BigInteger().with_variant(Integer, "sqlite")


class Mantenimiento(Base):
    """Trabajo preventivo o correctivo realizado sobre un activo."""

    __tablename__ = "mantenimientos"
    __table_args__ = (
        ForeignKeyConstraint(
            ["activo_id", "organizacion_id"],
            ["activos.id", "activos.organizacion_id"],
            name="fk_mantenimientos_activo_misma_organizacion",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["responsable_id", "organizacion_id"],
            ["usuarios.id", "usuarios.organizacion_id"],
            name="fk_mantenimientos_usuario_misma_organizacion",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "tipo IN ('preventivo', 'correctivo')",
            name="ck_mantenimientos_tipo",
        ),
        CheckConstraint(
            "estado IN "
            "('programado', 'en_proceso', 'completado', 'cancelado')",
            name="ck_mantenimientos_estado",
        ),
        CheckConstraint(
            "costo IS NULL OR costo >= 0",
            name="ck_mantenimientos_costo",
        ),
        CheckConstraint(
            "finalizado_en IS NULL OR iniciado_en IS NULL "
            "OR finalizado_en >= iniciado_en",
            name="ck_mantenimientos_fechas",
        ),
        Index(
            "ix_mantenimientos_activo_fecha",
            "activo_id",
            "programado_para",
        ),
    )

    id: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        Identity(always=True),
        primary_key=True,
    )
    organizacion_id: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        nullable=False,
    )
    activo_id: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        nullable=False,
    )
    responsable_id: Mapped[int | None] = mapped_column(IDENTIFICADOR)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="programado",
    )
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    resultado: Mapped[str | None] = mapped_column(Text)
    costo: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    programado_para: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    iniciado_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    finalizado_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
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