"""Administracion basica de usuarios de una organizacion."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import obtener_admin_empresa
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.schemas.usuario import EstadoUsuarioUpdate, UsuarioCreate, UsuarioResponse
from app.security import crear_password_hash
from app.services.usuarios import crear_respuesta_usuario


router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


def obtener_usuario_de_la_organizacion(
    usuario_id: int,
    administrador: Usuario,
    db: Session,
) -> tuple[Usuario, Rol]:
    consulta = (
        select(Usuario, Rol)
        .join(Rol, Usuario.rol_id == Rol.id)
        .where(
            Usuario.id == usuario_id,
            Usuario.organizacion_id == administrador.organizacion_id,
        )
    )
    resultado = db.execute(consulta).one_or_none()
    if resultado is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado.",
        )
    return resultado[0], resultado[1]


@router.post(
    "",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_usuario(
    datos: UsuarioCreate,
    administrador: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> UsuarioResponse:
    rol = db.scalar(select(Rol).where(Rol.nombre == datos.rol))
    if rol is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="El rol indicado no existe.",
        )

    email_existente = db.scalar(
        select(Usuario.id).where(
            Usuario.organizacion_id == administrador.organizacion_id,
            func.lower(Usuario.email) == str(datos.email).lower(),
        )
    )
    if email_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con el mismo correo.",
        )

    usuario = Usuario(
        organizacion_id=administrador.organizacion_id,
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
            detail="No fue posible registrar el usuario.",
        ) from error

    db.refresh(usuario)
    return crear_respuesta_usuario(usuario, rol)


@router.get("", response_model=list[UsuarioResponse])
def listar_usuarios(
    offset: int = Query(default=0, ge=0),
    limite: int = Query(default=50, ge=1, le=100),
    administrador: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> list[UsuarioResponse]:
    consulta = (
        select(Usuario, Rol)
        .join(Rol, Usuario.rol_id == Rol.id)
        .where(Usuario.organizacion_id == administrador.organizacion_id)
        .order_by(Usuario.id)
        .offset(offset)
        .limit(limite)
    )
    resultados = db.execute(consulta).all()
    return [crear_respuesta_usuario(usuario, rol) for usuario, rol in resultados]


@router.get("/{usuario_id}", response_model=UsuarioResponse)
def consultar_usuario(
    usuario_id: int,
    administrador: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> UsuarioResponse:
    usuario, rol = obtener_usuario_de_la_organizacion(usuario_id, administrador, db)
    return crear_respuesta_usuario(usuario, rol)


@router.patch("/{usuario_id}/estado", response_model=UsuarioResponse)
def cambiar_estado_usuario(
    usuario_id: int,
    datos: EstadoUsuarioUpdate,
    administrador: Usuario = Depends(obtener_admin_empresa),
    db: Session = Depends(get_db),
) -> UsuarioResponse:
    usuario, rol = obtener_usuario_de_la_organizacion(usuario_id, administrador, db)

    if usuario.id == administrador.id and not datos.activo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No puedes desactivar tu propia cuenta.",
        )

    usuario.activo = datos.activo
    db.commit()
    db.refresh(usuario)
    return crear_respuesta_usuario(usuario, rol)
