"""Modelo ORM de la tabla incidentes."""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Identity,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


IDENTIFICADOR = BigInteger().with_variant(Integer, "sqlite")


class Incidente(Base):
    """Falla o evento operativo relacionado con un activo."""

    __tablename__ = "incidentes"
    __table_args__ = (
        ForeignKeyConstraint(
            ["activo_id", "organizacion_id"],
            ["activos.id", "activos.organizacion_id"],
            name="fk_incidentes_activo_misma_organizacion",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["asignado_a", "organizacion_id"],
            ["usuarios.id", "usuarios.organizacion_id"],
            name="fk_incidentes_usuario_misma_organizacion",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "organizacion_id",
            "codigo",
            name="uq_incidentes_organizacion_codigo",
        ),
        UniqueConstraint(
            "id",
            "organizacion_id",
            name="uq_incidentes_id_organizacion",
        ),
        CheckConstraint(
            "prioridad IN ('baja', 'media', 'alta', 'critica')",
            name="ck_incidentes_prioridad",
        ),
        CheckConstraint(
            "estado IN "
            "('abierto', 'en_investigacion', 'resuelto', 'cerrado')",
            name="ck_incidentes_estado",
        ),
        CheckConstraint(
            "(resuelto_en IS NULL OR resuelto_en >= abierto_en) AND "
            "(cerrado_en IS NULL OR cerrado_en >= abierto_en)",
            name="ck_incidentes_fechas",
        ),
        Index(
            "ix_incidentes_organizacion_estado",
            "organizacion_id",
            "estado",
            "prioridad",
        ),
        Index(
            "ix_incidentes_asignado",
            "asignado_a",
            "estado",
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
    asignado_a: Mapped[int | None] = mapped_column(IDENTIFICADOR)
    codigo: Mapped[str] = mapped_column(String(30), nullable=False)
    titulo: Mapped[str] = mapped_column(String(180), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    prioridad: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="media",
    )
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="abierto",
    )
    solucion: Mapped[str | None] = mapped_column(Text)
    abierto_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    resuelto_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    cerrado_en: Mapped[datetime | None] = mapped_column(
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