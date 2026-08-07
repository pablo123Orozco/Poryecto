"""Funciones de hashing de contrasenas y tokens JWT."""

from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from pwdlib.exceptions import PwdlibError

from app.config import settings


password_hash = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hash.hash("contrasena-ficticia-no-utilizable")


def crear_password_hash(password: str) -> str:
    """Genera un hash Argon2; nunca almacena la contrasena original."""

    return password_hash.hash(password)


def verificar_password(password: str, hash_guardado: str) -> bool:
    """Compara una contrasena con su hash de forma segura."""

    try:
        return password_hash.verify(password, hash_guardado)
    except PwdlibError:
        return False


def crear_token_acceso(usuario_id: int, organizacion_id: int, rol_id: int) -> str:
    """Emite un JWT firmado y con vencimiento."""

    emitido_en = datetime.now(timezone.utc)
    vence_en = emitido_en + timedelta(minutes=settings.access_token_expire_minutes)
    contenido = {
        "sub": str(usuario_id),
        "org": organizacion_id,
        "rol": rol_id,
        "iat": emitido_en,
        "exp": vence_en,
    }
    return jwt.encode(
        contenido,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decodificar_token(token: str) -> dict[str, object]:
    """Valida la firma, el algoritmo y los campos obligatorios del JWT."""

    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["sub", "org", "rol", "iat", "exp"]},
    )
