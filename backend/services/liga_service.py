"""
Capa de servicio — lógica de negocio para la configuración de la liga.
"""
from core.genetic import generar_partidos
import state


def configurar_liga(config: dict) -> dict:
    """
    Almacena la configuración de la liga, genera el calendario round-robin
    y limpia resultados anteriores.
    """
    state.set_liga(config)
    partidos = generar_partidos(config["equipos"])
    state.set_partidos(partidos)
    state.reset_resultados()
    return {"ok": True, "partidos_generados": len(partidos)}
