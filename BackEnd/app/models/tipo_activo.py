"""Modelo ORM del catalogo de tipos de activo."""

from sqlalchemy import Identity, Integer, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


IDENTIFICADOR_TIPO = SmallInteger().with_variant(Integer, "sqlite")


class TipoActivo(Base):
    """Categoria disponible para clasificar un activo tecnologico."""

    __tablename__ = "tipos_activo"

    id: Mapped[int] = mapped_column(
        IDENTIFICADOR_TIPO,
        Identity(always=True),
        primary_key=True,
    )
    nombre: Mapped[str] = mapped_column(
        String(60),
        nullable=False,
        unique=True,
    )
    descripcion: Mapped[str | None] = mapped_column(String(250))