"""Modelo ORM de la tabla sedes."""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKeyConstraint,
    Identity,
    String,
    UniqueConstraint,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Sede(Base):
    """Ubicación física perteneciente a una organización."""

    __tablename__ = "sedes"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organizacion_id"],
            ["organizaciones.id"],
            name="fk_sedes_organizacion",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "organizacion_id",
            "nombre",
            name="uq_sedes_organizacion_nombre",
        ),
        UniqueConstraint(
            "id",
            "organizacion_id",
            name="uq_sedes_id_organizacion",
        ),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        Identity(always=True),
        primary_key=True,
    )
    organizacion_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    direccion: Mapped[str | None] = mapped_column(String(300))
    ciudad: Mapped[str | None] = mapped_column(String(100))
    pais: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        server_default="Guatemala",
    )
    activa: Mapped[bool] = mapped_column(
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