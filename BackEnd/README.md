# Backend - Plataforma de Monitoreo

Primer bloque del backend: aplicacion FastAPI y conexion con PostgreSQL.

## Requisitos

- Python 3.11 o superior.
- PostgreSQL 15 o superior.
- La base de datos `plataforma_monitoreo` creada con el script SQL del proyecto.

## 1. Crear el entorno virtual

Desde la carpeta `backend_python`:

```bash
python -m venv .venv
```

En Git Bash para Windows:

```bash
source .venv/Scripts/activate
```

En PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

## 2. Instalar las dependencias

```bash
python -m pip install -r requirements.txt
```

## 3. Configurar la conexion

Copia `.env.example` como `.env`:

```bash
cp .env.example .env
```

Edita `DATABASE_URL` con el usuario, contrasena, servidor, puerto y nombre de
tu base de datos. No subas el archivo `.env` al repositorio.

Ejemplo local:

```env
DATABASE_URL=postgresql+psycopg://postgres:mi_clave@localhost:5432/plataforma_monitoreo
```

## 4. Iniciar la API

```bash
python -m uvicorn app.main:app --reload
```

## 5. Comprobar el funcionamiento

Abre estas direcciones:

- API: <http://127.0.0.1:8000/>
- Estado de PostgreSQL: <http://127.0.0.1:8000/api/v1/health>
- Documentacion Swagger: <http://127.0.0.1:8000/docs>

Si PostgreSQL esta disponible, `/api/v1/health` respondera:

```json
{
  "api": "disponible",
  "base_datos": "conectada"
}
```
