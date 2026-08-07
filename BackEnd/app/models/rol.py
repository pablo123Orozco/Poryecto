"""Modelo ORM de la tabla roles."""

from datetime import datetime

from sqlalchemy import Identity, Integer, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


IDENTIFICADOR_ROL = SmallInteger().with_variant(Integer, "sqlite")


class Rol(Base):
    """Rol asignable a un usuario de la plataforma."""

    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(
        IDENTIFICADOR_ROL,
        Identity(always=True),
        primary_key=True,
    )
    nombre: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    descripcion: Mapped[str | None] = mapped_column(String(250))
    creado_en: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=func.now(),
    )
