"""
Capa de presentación — rutas HTTP del algoritmo genético.
Solo valida la entrada y delega al servicio correspondiente.
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models.schemas import ParamsAG
import services.ag_service as ag_service

router = APIRouter(prefix="/ag", tags=["Algoritmo Genético"])


@router.post("/ejecutar")
async def ejecutar(params: ParamsAG):
    return StreamingResponse(
        ag_service.ejecutar_ag_stream(params.model_dump()),
        media_type="text/event-stream",
    )


@router.get("/resultado")
def resultado():
    return ag_service.get_resultados()


@router.get("/calendario/{individuo_id}")
def calendario(individuo_id: int):
    return ag_service.get_calendario(individuo_id)


@router.get("/detalle/{individuo_id}")
def detalle(individuo_id: int):
    return ag_service.get_detalle(individuo_id)


@router.get("/filtrar/equipo/{equipo_id}")
def filtrar_equipo(equipo_id: int):
    return ag_service.filtrar_equipo(equipo_id)


@router.get("/filtrar/arbitro/{arbitro_id}")
def filtrar_arbitro(arbitro_id: int):
    return ag_service.filtrar_arbitro(arbitro_id)
