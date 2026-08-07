"""Registro inicial, inicio de sesion y usuario autenticado."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import obtener_usuario_actual
from app.models.organizacion import Organizacion
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.schemas.auth import (
    LoginRequest,
    RegistroAdministrador,
    TokenResponse,
)
from app.schemas.usuario import UsuarioResponse
from app.security import (
    DUMMY_PASSWORD_HASH,
    crear_password_hash,
    crear_token_acceso,
    verificar_password,
)
from app.services.usuarios import crear_respuesta_usuario


router = APIRouter(prefix="/auth", tags=["Autenticacion"])


@router.post(
    "/registro-inicial",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
)
def registrar_administrador_inicial(
    datos: RegistroAdministrador,
    db: Session = Depends(get_db),
) -> UsuarioResponse:
    organizacion = db.get(Organizacion, datos.organizacion_id)
    if organizacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organizacion no encontrada.",
        )
    if organizacion.estado != "activa":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La organizacion debe estar activa.",
        )

    existe_usuario = db.scalar(
        select(Usuario.id)
        .where(Usuario.organizacion_id == datos.organizacion_id)
        .limit(1)
    )
    if existe_usuario is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La organizacion ya tiene un administrador inicial.",
        )

    rol = db.scalar(select(Rol).where(Rol.nombre == "ADMIN_EMPRESA"))
    if rol is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se encontro el rol ADMIN_EMPRESA.",
        )

    usuario = Usuario(
        organizacion_id=datos.organizacion_id,
        rol_id=rol.id,
        nombres=datos.nombres,
        apellidos=datos.apellidos,
        email=str(datos.email),
        password_hash=crear_password_hash(datos.password),
        telefono=datos.telefono,
    )
    db.add(usuario)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No fue posible registrar el administrador.",
        ) from error

    db.refresh(usuario)
    return crear_respuesta_usuario(usuario, rol)


@router.post("/login", response_model=TokenResponse)
def iniciar_sesion(
    datos: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    usuario = db.scalar(
    select(Usuario).where(
        func.lower(Usuario.email) == str(datos.email).lower(),
    )
)

    hash_a_verificar = usuario.password_hash if usuario else DUMMY_PASSWORD_HASH
    password_correcto = verificar_password(datos.password, hash_a_verificar)
    if usuario is None or not password_correcto:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contrasena incorrectos.",
        )
    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario se encuentra inactivo.",
        )

    organizacion = db.get(Organizacion, usuario.organizacion_id)
    if organizacion is None or organizacion.estado != "activa":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La organizacion no se encuentra activa.",
        )

    usuario.ultimo_acceso_en = datetime.now(timezone.utc)
    db.commit()

    token = crear_token_acceso(
        usuario_id=usuario.id,
        organizacion_id=usuario.organizacion_id,
        rol_id=usuario.rol_id,
    )
    return TokenResponse(
        access_token=token,
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.get("/me", response_model=UsuarioResponse)
def consultar_usuario_actual(
    usuario: Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
) -> UsuarioResponse:
    rol = db.get(Rol, usuario.rol_id)
    if rol is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="El usuario no tiene un rol valido.",
        )
    return crear_respuesta_usuario(usuario, rol)
