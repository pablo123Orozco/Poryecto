"""Dependencias compartidas por rutas protegidas."""

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organizacion import Organizacion
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.security import decodificar_token


bearer_scheme = HTTPBearer(
    auto_error=False,
    scheme_name="JWT",
)


def error_credenciales() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales no validas.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def obtener_usuario_actual(
    request: Request,
    credenciales: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> Usuario:
    """Obtiene el usuario a partir de un token Bearer valido."""

    if (
        credenciales is None
        or credenciales.scheme.lower() != "bearer"
    ):
        raise error_credenciales()

    try:
        contenido = decodificar_token(
            credenciales.credentials
        )
        usuario_id = int(str(contenido["sub"]))
        organizacion_id = int(str(contenido["org"]))
        rol_id = int(str(contenido["rol"]))
    except (
        jwt.InvalidTokenError,
        KeyError,
        TypeError,
        ValueError,
    ) as error:
        raise error_credenciales() from error

    consulta = select(Usuario).where(
        Usuario.id == usuario_id,
        Usuario.organizacion_id == organizacion_id,
        Usuario.rol_id == rol_id,
        Usuario.activo.is_(True),
    )

    usuario = db.scalar(consulta)

    if usuario is None:
        raise error_credenciales()

    organizacion = db.get(
        Organizacion,
        usuario.organizacion_id,
    )

    if (
        organizacion is None
        or organizacion.estado != "activa"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La organizacion no se encuentra activa.",
        )

    request.state.usuario_actual = usuario

    return usuario


def obtener_admin_empresa(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> Usuario:
    """Permite continuar solamente a administradores de empresa."""

    rol = db.get(Rol, usuario.rol_id)

    if rol is None or rol.nombre != "ADMIN_EMPRESA":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere el rol ADMIN_EMPRESA.",
        )

    return usuario