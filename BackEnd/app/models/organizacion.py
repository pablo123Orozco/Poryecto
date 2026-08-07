"""Modelo ORM de la tabla organizaciones."""

from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, DateTime, Identity, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


# PostgreSQL usa BIGINT. La variante INTEGER permite ejecutar pruebas locales
# con SQLite sin cambiar el tipo utilizado en produccion.
IDENTIFICADOR = BigInteger().with_variant(Integer, "sqlite")


class Organizacion(Base):
    """Representa una empresa cliente de la plataforma."""

    __tablename__ = "organizaciones"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('activa', 'suspendida', 'inactiva')",
            name="ck_organizaciones_estado",
        ),
    )

    id: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        Identity(always=True),
        primary_key=True,
    )
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    nit: Mapped[str | None] = mapped_column(String(25), unique=True)
    sector: Mapped[str | None] = mapped_column(String(80))
    correo_contacto: Mapped[str | None] = mapped_column(String(255))
    telefono: Mapped[str | None] = mapped_column(String(30))
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="activa",
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
