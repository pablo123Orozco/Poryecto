"""Modelo ORM de la tabla metricas_activo."""

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
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


IDENTIFICADOR = BigInteger().with_variant(Integer, "sqlite")


class MetricaActivo(Base):
    """Valor historico capturado para un activo tecnologico."""

    __tablename__ = "metricas_activo"
    __table_args__ = (
        ForeignKeyConstraint(
            ["activo_id"],
            ["activos.id"],
            name="fk_metricas_activo",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "activo_id",
            "clave_metrica",
            "capturada_en",
            name="uq_metricas_activo_clave_fecha",
        ),
        CheckConstraint(
            "(valor_numerico IS NOT NULL "
            "AND valor_texto IS NULL) OR "
            "(valor_numerico IS NULL "
            "AND valor_texto IS NOT NULL)",
            name="ck_metricas_un_solo_tipo_valor",
        ),
        Index(
            "ix_metricas_activo_fecha",
            "activo_id",
            "capturada_en",
        ),
    )

    id: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        Identity(always=True),
        primary_key=True,
    )
    activo_id: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        nullable=False,
    )
    clave_metrica: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    nombre_metrica: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    valor_numerico: Mapped[Decimal | None] = mapped_column(
        Numeric(20, 6)
    )
    valor_texto: Mapped[str | None] = mapped_column(Text)
    unidad: Mapped[str | None] = mapped_column(String(30))
    capturada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )