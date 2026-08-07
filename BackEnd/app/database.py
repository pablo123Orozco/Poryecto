"""Motor, sesiones y dependencia de acceso a PostgreSQL."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """Clase base para los modelos ORM que se agregaran posteriormente."""


engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """Crea una sesion por solicitud y garantiza su cierre."""

    database_session = SessionLocal()
    try:
        yield database_session
    except Exception:
        database_session.rollback()
        raise
    finally:
        database_session.close()
