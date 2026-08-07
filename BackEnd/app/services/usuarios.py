"""Conversión segura de usuarios del ORM a respuestas de la API."""

from app.models.rol import Rol
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioResponse


def crear_respuesta_usuario(usuario: Usuario, rol: Rol) -> UsuarioResponse:
    return UsuarioResponse(
        id=usuario.id,
        organizacion_id=usuario.organizacion_id,
        rol=rol.nombre,
        nombres=usuario.nombres,
        apellidos=usuario.apellidos,
        email=usuario.email,
        telefono=usuario.telefono,
        activo=usuario.activo,
        ultimo_acceso_en=usuario.ultimo_acceso_en,
        creado_en=usuario.creado_en,
    )
