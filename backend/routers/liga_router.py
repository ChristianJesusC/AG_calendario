"""
Capa de presentación — rutas HTTP para la configuración de la liga.
Solo valida la entrada y delega al servicio correspondiente.
"""
from fastapi import APIRouter
from models.schemas import ConfigLiga
import services.liga_service as liga_service

router = APIRouter(prefix="/liga", tags=["Liga"])


@router.post("/configurar")
def configurar(config: ConfigLiga):
    return liga_service.configurar_liga(config.model_dump())
