"""
Capa de repositorio — estado en memoria de la sesión activa.
Actúa como única fuente de verdad durante la ejecución del servidor.
"""

_state: dict = {
    "liga":     None,
    "partidos": [],
    "mejores":  [],
}


def get_liga() -> dict | None:
    return _state["liga"]


def set_liga(liga: dict) -> None:
    _state["liga"] = liga


def get_partidos() -> list:
    return _state["partidos"]


def set_partidos(partidos: list) -> None:
    _state["partidos"] = partidos


def get_mejores() -> list:
    return _state["mejores"]


def set_mejores(mejores: list) -> None:
    _state["mejores"] = mejores


def reset_resultados() -> None:
    _state["mejores"] = []
