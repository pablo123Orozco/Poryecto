"""Modelo ORM de la tabla reportes."""

from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKeyConstraint,
    Identity,
    Index,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


IDENTIFICADOR = BigInteger().with_variant(Integer, "sqlite")
PARAMETROS_JSON = JSONB().with_variant(JSON(), "sqlite")


class Reporte(Base):
    """Archivo generado con informacion de una organizacion."""

    __tablename__ = "reportes"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organizacion_id"],
            ["organizaciones.id"],
            name="fk_reportes_organizacion",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["generado_por", "organizacion_id"],
            ["usuarios.id", "usuarios.organizacion_id"],
            name="fk_reportes_usuario_misma_organizacion",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "formato IN ('PDF', 'XLSX', 'CSV')",
            name="ck_reportes_formato",
        ),
        Index(
            "ix_reportes_organizacion_fecha",
            "organizacion_id",
            "generado_en",
        ),
    )

    id: Mapped[int] = mapped_column(
        IDENTIFICADOR,
        Identity(always=True),
        primary_key=True,
    )
    organizacion_id: Mapped[int] = mapped_column(IDENTIFICADOR, nullable=False)
    generado_por: Mapped[int] = mapped_column(IDENTIFICADOR, nullable=False)
    nombre: Mapped[str] = mapped_column(String(160), nullable=False)
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    formato: Mapped[str] = mapped_column(String(10), nullable=False)
    ruta_archivo: Mapped[str] = mapped_column(String(500), nullable=False)
    parametros: Mapped[dict[str, object]] = mapped_column(
        PARAMETROS_JSON,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
    )
    generado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )