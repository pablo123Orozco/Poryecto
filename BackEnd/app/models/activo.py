"""Modelo ORM de la tabla activos."""

from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKeyConstraint,
    Identity,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


IDENTIFICADOR = BigInteger().with_variant(Integer, "sqlite")
IDENTIFICADOR_TIPO = SmallInteger().with_variant(Integer, "sqlite")
DIRECCION_IP = INET().with_variant(String(45), "sqlite")


class Activo(Base):
    """Equipo tecnologico registrado por una organizacion."""

    __tablename__ = "activos"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organizacion_id"],
            ["organizaciones.id"],
            name="fk_activos_organizacion",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["sede_id", "organizacion_id"],
            ["sedes.id", "sedes.organizacion_id"],
            name="fk_activos_sede_misma_organizacion",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["tipo_activo_id"],
            ["tipos_activo.id"],
            name="fk_activos_tipo",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "organizacion_id",
            "codigo_interno",
            name="uq_activos_organizacion_codigo",
        ),
        UniqueConstraint(
            "id",
            "organizacion_id",
            name="uq_activos_id_organizacion",
        ),
        CheckConstraint(
            "criticidad IN ('baja', 'media', 'alta', 'critica')",
            name="ck_activos_criticidad",
        ),
        CheckConstraint(
            "estado IN ('activo', 'inactivo', 'mantenimiento', 'retirado')",
            name="ck_activos_estado",
        ),
        Index("ix_activos_organizacion", "organizacion_id"),
        Index("ix_activos_sede", "sede_id"),
        Index("ix_activos_direccion_ip", "direccion_ip"),
    )

    id: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        Identity(always=True),
        primary_key=True,
    )
    organizacion_id: Mapped[int] = mapped_column(IDENTIFICADOR, nullable=False)
    sede_id: Mapped[int | None] = mapped_column(IDENTIFICADOR)
    tipo_activo_id: Mapped[int] = mapped_column(
        IDENTIFICADOR_TIPO,
        nullable=False,
    )
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    codigo_interno: Mapped[str | None] = mapped_column(String(80))
    direccion_ip: Mapped[str | None] = mapped_column(DIRECCION_IP)
    nombre_host: Mapped[str | None] = mapped_column(String(255))
    sistema_operativo: Mapped[str | None] = mapped_column(String(150))
    fabricante: Mapped[str | None] = mapped_column(String(100))
    modelo: Mapped[str | None] = mapped_column(String(100))
    numero_serie: Mapped[str | None] = mapped_column(String(120))
    criticidad: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="media",
    )
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="activo",
    )
    fecha_adquisicion: Mapped[date | None] = mapped_column(Date)
    descripcion: Mapped[str | None] = mapped_column(Text)
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