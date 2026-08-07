"""Modelo ORM de la tabla usuarios."""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKeyConstraint,
    Identity,
    Index,
    Integer,
    SmallInteger,
    String,
    UniqueConstraint,
    false,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


IDENTIFICADOR_USUARIO = BigInteger().with_variant(Integer, "sqlite")
IDENTIFICADOR_ROL = SmallInteger().with_variant(Integer, "sqlite")


class Usuario(Base):
    """Usuario perteneciente a una organizacion cliente."""

    __tablename__ = "usuarios"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organizacion_id"],
            ["organizaciones.id"],
            name="fk_usuarios_organizacion",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["rol_id"],
            ["roles.id"],
            name="fk_usuarios_rol",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "id",
            "organizacion_id",
            name="uq_usuarios_id_organizacion",
        ),
    )

    id: Mapped[int] = mapped_column(
        IDENTIFICADOR_USUARIO,
        Identity(always=True),
        primary_key=True,
    )
    organizacion_id: Mapped[int] = mapped_column(IDENTIFICADOR_USUARIO, nullable=False)
    rol_id: Mapped[int] = mapped_column(IDENTIFICADOR_ROL, nullable=False)
    nombres: Mapped[str] = mapped_column(String(100), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(30))
    activo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=true(),
    )
    mfa_habilitado: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=false(),
    )
    ultimo_acceso_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
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


Index(
    "uq_usuarios_organizacion_email",
    Usuario.organizacion_id,
    func.lower(Usuario.email),
    unique=True,
)
