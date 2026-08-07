"""Modelo ORM de la tabla planes."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Identity,
    Integer,
    Numeric,
    SmallInteger,
    String,
    false,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


IDENTIFICADOR = SmallInteger().with_variant(Integer, "sqlite")


class Plan(Base):
    """Plan comercial disponible para las organizaciones."""

    __tablename__ = "planes"
    __table_args__ = (
        CheckConstraint(
            "limite_usuarios > 0 AND limite_activos > 0",
            name="ck_planes_limites",
        ),
        CheckConstraint(
            "precio_mensual >= 0 AND precio_anual >= 0",
            name="ck_planes_precios",
        ),
    )

    id: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        Identity(always=True),
        primary_key=True,
    )
    nombre: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
        unique=True,
    )
    descripcion: Mapped[str | None] = mapped_column(String(300))
    limite_usuarios: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    limite_activos: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    incluye_ia: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=false(),
    )
    precio_mensual: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    precio_anual: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    activo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=true(),
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