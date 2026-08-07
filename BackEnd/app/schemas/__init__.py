"""Esquemas de entrada y salida de la API."""

from app.schemas.activo import (
    ActivoCreate,
    ActivoResponse,
    ActivoUpdate,
    EstadoActivoUpdate,
    TipoActivoResponse,
)
from app.schemas.auth import (
    LoginRequest,
    RegistroAdministrador,
    TokenResponse,
)
from app.schemas.organizacion import (
    OrganizacionCreate,
    OrganizacionResponse,
    OrganizacionUpdate,
)
from app.schemas.sede import (
    SedeCreate,
    SedeResponse,
    SedeUpdate,
)
from app.schemas.usuario import (
    EstadoUsuarioUpdate,
    UsuarioCreate,
    UsuarioResponse,
)
from app.schemas.mantenimiento import (
    EstadoMantenimientoUpdate,
    MantenimientoCreate,
    MantenimientoResponse,
    MantenimientoUpdate,
)

from app.schemas.incidente import (
    EstadoIncidenteUpdate,
    IncidenteCreate,
    IncidenteResponse,
    IncidenteUpdate,
)

from app.schemas.alerta import (
    AlertaCreate,
    AlertaResponse,
    AlertaUpdate,
    EstadoAlertaUpdate,
)

from app.schemas.metrica_activo import (
    MetricaCreate,
    MetricaResponse,
)

__all__ = [
    "ActivoCreate",
    "ActivoResponse",
    "ActivoUpdate",
    "EstadoActivoUpdate",
    "EstadoUsuarioUpdate",
    "LoginRequest",
    "OrganizacionCreate",
    "OrganizacionResponse",
    "OrganizacionUpdate",
    "RegistroAdministrador",
    "SedeCreate",
    "SedeResponse",
    "SedeUpdate",
    "TipoActivoResponse",
    "TokenResponse",
    "UsuarioCreate",
    "UsuarioResponse",
    "EstadoMantenimientoUpdate",
    "MantenimientoCreate",
    "MantenimientoResponse",
    "MantenimientoUpdate",
    "EstadoIncidenteUpdate",
    "IncidenteCreate",
    "IncidenteResponse",
    "IncidenteUpdate",
    "AlertaCreate",
    "AlertaResponse",
    "AlertaUpdate",
    "EstadoAlertaUpdate",
    "MetricaCreate",
    "MetricaResponse",
]