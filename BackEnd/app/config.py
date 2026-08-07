"""Configuracion central de la aplicacion."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Carga y valida las variables de entorno del backend."""

    app_name: str = "Plataforma de Monitoreo API"
    app_environment: Literal["development", "test", "production"] = "development"
    database_url: str
    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: Literal["HS256"] = "HS256"
    access_token_expire_minutes: int = Field(default=30, gt=0, le=1440)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Devuelve una unica instancia de configuracion por proceso."""

    return Settings()


settings = get_settings()
