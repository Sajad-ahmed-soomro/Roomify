"""Render worker: runs Stable Diffusion on this machine (your laptop) for the
hosted backend, which reaches it through ngrok.

    ../.venv/bin/uvicorn worker:app --port 8001
    ngrok http 8001 --url https://<your-name>.ngrok-free.app

Every request must carry X-Render-Key = RENDER_KEY from backend/.env.
"""

import asyncio
import hmac
import io
import logging
import threading
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import FastAPI, File, Form, Header, HTTPException, Response, UploadFile
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from app.config import get_settings
from app.services import imagegen

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("worker")


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not get_settings().render_key:
        raise RuntimeError("Set RENDER_KEY in backend/.env before starting the worker.")
    threading.Thread(target=imagegen._get_pipe, daemon=True, name="sd-warmup").start()
    yield


app = FastAPI(title="Roomify render worker", lifespan=lifespan, docs_url=None, redoc_url=None)
_slot = asyncio.Semaphore(1)


def _check_key(key: str | None) -> None:
    expected = get_settings().render_key or ""
    if not key or not hmac.compare_digest(key.encode(), expected.encode()):
        raise HTTPException(401, "Invalid render key.")


@app.get("/health")
def health():
    return {"status": "ok", "modelLoaded": imagegen._pipe is not None}


@app.post("/render")
async def render(
    image: Annotated[UploadFile, File()],
    prompt: Annotated[str, Form(max_length=2000)],
    strength: Annotated[float, Form(gt=0, le=1)],
    seed: Annotated[int, Form(ge=0, lt=2**31)],
    negative_prompt: Annotated[str, Form(max_length=2000)] = "",
    x_render_key: Annotated[str | None, Header()] = None,
):
    _check_key(x_render_key)
    try:
        photo = Image.open(io.BytesIO(await image.read(get_settings().max_upload_bytes))).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, "Invalid image.")

    req = imagegen.RenderRequest(photo, prompt, negative_prompt, strength, seed, style="modern")
    async with _slot:
        try:
            result = await run_in_threadpool(imagegen._render_sd, req)
        except imagegen.GenerationError as e:
            raise HTTPException(422, str(e))
    log.info("rendered %dx%d seed=%d", result.width, result.height, seed)
    return Response(imagegen.to_jpeg(result), media_type="image/jpeg")
