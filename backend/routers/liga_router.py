from fastapi import APIRouter
from models.schemas import ConfigLiga
import services.liga_service as liga_service

router = APIRouter(prefix="/liga", tags=["Liga"])


@router.post("/configurar")
def configurar(config: ConfigLiga):
    return liga_service.configurar_liga(config.model_dump())
