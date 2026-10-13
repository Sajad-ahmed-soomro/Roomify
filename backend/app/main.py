import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import get_settings
from .routers import designs, users
from .services import imagegen

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    imagegen.warm_up()
    yield


app = FastAPI(title="Roomify API", version="1.0.0", lifespan=lifespan)
app.include_router(designs.router)
app.include_router(users.router)


@app.get("/health", tags=["health"])
def health():
    settings = get_settings()
    return {
        "status": "ok",
        "imageEngine": settings.image_engine,
        "modelLoaded": imagegen._pipe is not None if settings.image_engine == "sd" else None,
        "llm": (
            settings.gemini_model if settings.llm_provider == "gemini" and settings.gemini_api_key
            else settings.anthropic_model if settings.llm_provider == "anthropic" and settings.anthropic_api_key
            else None
        ),
    }
