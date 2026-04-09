from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.liga_router import router as liga_router
from routers.ag_router   import router as ag_router

app = FastAPI(
    title="CancharIA",
    description="Sistema de optimización de calendarios de fútbol amateur mediante algoritmos genéticos.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:80", "http://localhost"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(liga_router)
app.include_router(ag_router)
