"""
Capa de modelos — esquemas Pydantic para validación de entradas HTTP.
"""
from pydantic import BaseModel
from typing import List, Dict


class Equipo(BaseModel):
    id: int
    nombre: str
    num_jugadores: int = 0


class Cancha(BaseModel):
    id: int
    nombre: str
    horarios_disponibles: List[str]
    max_partidos_por_dia: int


class Arbitro(BaseModel):
    id: int
    nombre: str
    disponibilidad: Dict[str, List[str]]   # "1" -> ["08:00", "10:00"]


class ConfigLiga(BaseModel):
    equipos: List[Equipo]
    canchas: List[Cancha]
    arbitros: List[Arbitro]
    descanso_minimo_horas: int
    max_partidos_arbitro_dia: int
    min_partidos_semana: int = 0
    max_partidos_semana: int = 999


class ParamsAG(BaseModel):
    poblacion: int = 100
    generaciones: int = 200
    tasa_cruce: float = 0.8
    tasa_mutacion: float = 0.1
