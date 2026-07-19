from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import substations, users
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Simulador de Manobras — COPEL")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/v1")
app.include_router(substations.router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
