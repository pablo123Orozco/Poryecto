"""Modelo ORM de la tabla suscripciones."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKeyConstraint,
    Identity,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


IDENTIFICADOR = BigInteger().with_variant(Integer, "sqlite")
IDENTIFICADOR_PLAN = SmallInteger().with_variant(Integer, "sqlite")


class Suscripcion(Base):
    """Contratacion de un plan realizada por una organizacion."""

    __tablename__ = "suscripciones"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organizacion_id"],
            ["organizaciones.id"],
            name="fk_suscripciones_organizacion",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["plan_id"],
            ["planes.id"],
            name="fk_suscripciones_plan",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "periodicidad IN ('mensual', 'anual')",
            name="ck_suscripciones_periodicidad",
        ),
        CheckConstraint(
            "estado IN "
            "('pendiente', 'activa', 'vencida', 'cancelada')",
            name="ck_suscripciones_estado",
        ),
        CheckConstraint(
            "precio_contratado >= 0",
            name="ck_suscripciones_precio",
        ),
        CheckConstraint(
            "termina_en IS NULL OR termina_en >= inicia_en",
            name="ck_suscripciones_fechas",
        ),
        Index(
            "uq_suscripciones_organizacion_activa",
            "organizacion_id",
            unique=True,
            postgresql_where=text("estado = 'activa'"),
            sqlite_where=text("estado = 'activa'"),
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
    plan_id: Mapped[int] = mapped_column(
        IDENTIFICADOR_PLAN,
        nullable=False,
    )
    periodicidad: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )
    precio_contratado: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="activa",
    )
    inicia_en: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    termina_en: Mapped[date | None] = mapped_column(Date)
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