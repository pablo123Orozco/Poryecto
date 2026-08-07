"""Modelo ORM de la tabla alertas."""

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


class Alerta(Base):
    """Evento de monitoreo asociado a un activo tecnologico."""

    __tablename__ = "alertas"
    __table_args__ = (
        ForeignKeyConstraint(
            ["activo_id", "organizacion_id"],
            ["activos.id", "activos.organizacion_id"],
            name="fk_alertas_activo_misma_organizacion",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "activo_id",
            "zabbix_event_id",
            name="uq_alertas_activo_evento",
        ),
        UniqueConstraint(
            "id",
            "activo_id",
            "organizacion_id",
            name="uq_alertas_id_activo_organizacion",
        ),
        CheckConstraint(
            "severidad IN "
            "('informativa', 'baja', 'media', 'alta', 'critica')",
            name="ck_alertas_severidad",
        ),
        CheckConstraint(
            "estado IN "
            "('activa', 'reconocida', 'resuelta', 'descartada')",
            name="ck_alertas_estado",
        ),
        CheckConstraint(
            "resuelta_en IS NULL OR resuelta_en >= detectada_en",
            name="ck_alertas_fechas",
        ),
        Index(
            "ix_alertas_organizacion_estado",
            "organizacion_id",
            "estado",
            "detectada_en",
        ),
        Index(
            "ix_alertas_activo_fecha",
            "activo_id",
            "detectada_en",
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
    zabbix_event_id: Mapped[str | None] = mapped_column(
        String(100)
    )
    titulo: Mapped[str] = mapped_column(
        String(180),
        nullable=False,
    )
    descripcion: Mapped[str | None] = mapped_column(Text)
    severidad: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    estado: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="activa",
    )
    detectada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    resuelta_en: Mapped[datetime | None] = mapped_column(
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