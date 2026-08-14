"""Punto de entrada de la API."""
import asyncio
from contextlib import asynccontextmanager, suppress
from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.routers.sedes import router as sedes_router
from app.config import settings
from app.database import get_db
from app.routers.auth import router as auth_router
from app.routers.organizaciones import router as organizaciones_router
from app.routers.usuarios import router as usuarios_router
from app.routers.activos import router as activos_router
from app.routers.mantenimientos import router as mantenimientos_router
from app.routers.incidentes import router as incidentes_router
from app.routers.alertas import router as alertas_router
from app.routers.metricas import router as metricas_router
from app.middleware.auditoria import registrar_auditoria
from app.routers.auditoria import router as auditoria_router
from app.routers.reportes import router as reportes_router
from app.routers.planes import router as planes_router
from app.routers.suscripciones import router as suscripciones_router
from app.routers.zabbix import router as zabbix_router
from fastapi.middleware.cors import CORSMiddleware
from app.services.tarea_zabbix import ejecutar_tarea_zabbix

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicia y detiene la sincronizacion automatica."""

    tarea = asyncio.create_task(
        ejecutar_tarea_zabbix()
    )

    app.state.tarea_zabbix = tarea

    try:
        yield
    finally:
        tarea.cancel()

        with suppress(asyncio.CancelledError):
            await tarea

app = FastAPI(
    title=settings.app_name,
    version="0.4.0",
    description="API para administrar y monitorear activos tecnologicos.",
    lifespan=lifespan,
)

app.middleware("http")(registrar_auditoria)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(organizaciones_router, prefix="/api/v1")
app.include_router(usuarios_router, prefix="/api/v1")
app.include_router(sedes_router, prefix="/api/v1")
app.include_router(activos_router, prefix="/api/v1")
app.include_router(mantenimientos_router, prefix="/api/v1")
app.include_router(incidentes_router, prefix="/api/v1")
app.include_router(alertas_router, prefix="/api/v1")
app.include_router(metricas_router, prefix="/api/v1")
app.include_router(auditoria_router, prefix="/api/v1")
app.include_router(reportes_router, prefix="/api/v1")
app.include_router(planes_router, prefix="/api/v1")
app.include_router(suscripciones_router, prefix="/api/v1")
app.include_router(zabbix_router,prefix="/api/v1")

@app.get("/", tags=["Sistema"])
def root() -> dict[str, str]:
    """Confirma que el servicio web esta en ejecucion."""

    return {
        "aplicacion": settings.app_name,
        "estado": "activa",
    }


@app.get("/api/v1/health", tags=["Sistema"])
def database_health(db: Session = Depends(get_db)) -> dict[str, str]:
    """Comprueba que la API puede comunicarse con PostgreSQL."""

    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No fue posible conectar con la base de datos.",
        ) from error

    return {
        "api": "disponible",
        "base_datos": "conectada",
    }
