"""Modelo ORM de la tabla auditoria."""

from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    DateTime,
    ForeignKeyConstraint,
    Identity,
    Index,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


IDENTIFICADOR = BigInteger().with_variant(Integer, "sqlite")
DETALLES_JSON = JSONB().with_variant(JSON(), "sqlite")
DIRECCION_IP = INET().with_variant(String(45), "sqlite")


class Auditoria(Base):
    """Registro inmutable de una operacion realizada por un usuario."""

    __tablename__ = "auditoria"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organizacion_id"],
            ["organizaciones.id"],
            name="fk_auditoria_organizacion",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["usuario_id", "organizacion_id"],
            ["usuarios.id", "usuarios.organizacion_id"],
            name="fk_auditoria_usuario_misma_organizacion",
            ondelete="RESTRICT",
        ),
        Index(
            "ix_auditoria_organizacion_fecha",
            "organizacion_id",
            "creado_en",
        ),
        Index(
            "ix_auditoria_entidad",
            "entidad",
            "entidad_id",
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
    usuario_id: Mapped[int | None] = mapped_column(IDENTIFICADOR)
    accion: Mapped[str] = mapped_column(String(80), nullable=False)
    entidad: Mapped[str] = mapped_column(String(80), nullable=False)
    entidad_id: Mapped[int | None] = mapped_column(IDENTIFICADOR)
    detalles: Mapped[dict[str, object]] = mapped_column(
        DETALLES_JSON,
        nullable=False,
        default=dict,
        server_default=text("'{}'"),
    )
    direccion_ip: Mapped[str | None] = mapped_column(DIRECCION_IP)
    agente_usuario: Mapped[str | None] = mapped_column(String(500))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )