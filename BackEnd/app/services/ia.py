"""Servicio de recomendaciones preventivas mediante Groq."""

import json
from typing import Any

from groq import APIError, Groq
from pydantic import ValidationError

from app.config import settings
from app.schemas.ia import ResultadoGeneradoIA


class IAError(Exception):
    """Error controlado al generar un analisis con IA."""


ESQUEMA_ANALISIS_IA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "nivel_riesgo": {
            "type": "string",
            "enum": ["bajo", "medio", "alto", "critico"],
        },
        "resumen": {"type": "string"},
        "hallazgos": {
            "type": "array",
            "items": {"type": "string"},
        },
        "recomendaciones": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "titulo": {"type": "string"},
                    "prioridad": {
                        "type": "string",
                        "enum": [
                            "baja",
                            "media",
                            "alta",
                            "critica",
                        ],
                    },
                    "descripcion": {"type": "string"},
                    "accion": {"type": "string"},
                },
                "required": [
                    "titulo",
                    "prioridad",
                    "descripcion",
                    "accion",
                ],
                "additionalProperties": False,
            },
        },
    },
    "required": [
        "nivel_riesgo",
        "resumen",
        "hallazgos",
        "recomendaciones",
    ],
    "additionalProperties": False,
}


INSTRUCCIONES_SISTEMA = """
Actua como un asistente de apoyo para monitoreo preventivo de
infraestructura tecnologica en instituciones de salud.

Analiza exclusivamente los datos tecnicos proporcionados. No inventes
metricas, incidentes, causas ni evidencias. Si la informacion es limitada,
indicalo expresamente en los hallazgos.

Clasifica el riesgo como bajo, medio, alto o critico. Genera entre uno y
ocho hallazgos y entre una y seis recomendaciones concretas, ordenadas por
prioridad. No recomiendes acciones destructivas ni cambios irreversibles.
Las recomendaciones deben poder ser revisadas por personal tecnico.

Responde en espanol y utiliza solamente la estructura JSON solicitada.
""".strip()


def generar_analisis_preventivo(
    contexto: dict[str, Any],
) -> ResultadoGeneradoIA:
    """Genera y valida un analisis preventivo usando Groq."""

    if not settings.groq_api_key:
        raise IAError(
            "La integracion con Groq no se encuentra configurada."
        )

    contexto_json = json.dumps(
        contexto,
        ensure_ascii=False,
        default=str,
    )

    if len(contexto_json) > 50_000:
        raise IAError(
            "El contexto tecnico excede el limite permitido."
        )

    cliente = Groq(
        api_key=settings.groq_api_key,
        timeout=40.0,
        max_retries=1,
    )

    try:
        respuesta = cliente.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {
                    "role": "system",
                    "content": INSTRUCCIONES_SISTEMA,
                },
                {
                    "role": "user",
                    "content": (
                        "Analiza el siguiente contexto tecnico del activo "
                        "y genera recomendaciones preventivas:\n"
                        f"{contexto_json}"
                    ),
                },
            ],
            temperature=0.2,
            max_completion_tokens=1800,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "analisis_preventivo_activo",
                    "strict": True,
                    "schema": ESQUEMA_ANALISIS_IA,
                },
            },
        )
    except APIError as error:
        raise IAError(
            "No fue posible obtener una respuesta de Groq."
        ) from error

    contenido = respuesta.choices[0].message.content

    if not contenido:
        raise IAError("Groq devolvio una respuesta vacia.")

    try:
        return ResultadoGeneradoIA.model_validate_json(contenido)
    except ValidationError as error:
        raise IAError(
            "Groq devolvio un analisis con formato no valido."
        ) from error