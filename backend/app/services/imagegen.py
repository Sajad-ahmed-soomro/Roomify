"""Turns the room photo + prompt into the redesigned image."""

import asyncio
import io
import logging
import threading
from dataclasses import dataclass

import httpx

from PIL import Image, ImageEnhance, ImageOps, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from ..catalog import STYLES
from ..config import get_settings

log = logging.getLogger(__name__)


class InvalidImageError(Exception):
    pass


class GenerationError(Exception):
    pass


def load_photo(data: bytes, max_side: int) -> Image.Image:
    """Decode an upload, apply EXIF rotation and resize so both sides are multiples of 8."""
    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img).convert("RGB")
    except (UnidentifiedImageError, OSError) as e:
        raise InvalidImageError("That file isn't a supported image.") from e
    if min(img.size) < 256:
        raise InvalidImageError("The photo is too small; use one at least 256px on each side.")
    scale = max_side / max(img.size)
    w, h = (round(img.width * scale) // 8 * 8, round(img.height * scale) // 8 * 8)
    return img.resize((w, h), Image.LANCZOS)


def to_jpeg(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=90)
    return buf.getvalue()


@dataclass
class RenderRequest:
    photo: Image.Image
    prompt: str
    negative_prompt: str
    strength: float
    seed: int
    style: str


# ---------- demo engine ----------

def _render_demo(req: RenderRequest) -> Image.Image:
    warmth, saturation, brightness, contrast = STYLES[req.style].grade
    img = ImageEnhance.Brightness(req.photo).enhance(brightness)
    img = ImageEnhance.Contrast(img).enhance(contrast)
    img = ImageEnhance.Color(img).enhance(saturation)
    r, g, b = img.split()
    r = r.point(lambda v: min(255, v * (1 + warmth * 0.35)))
    b = b.point(lambda v: min(255, v * (1 - warmth * 0.35)))
    return Image.merge("RGB", (r, g, b))


# ---------- Stable Diffusion ----------

_pipe = None
_pipe_lock = threading.Lock()


def _device() -> str:
    import torch

    choice = get_settings().sd_device
    if choice != "auto":
        return choice
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _get_pipe():
    global _pipe
    with _pipe_lock:
        if _pipe is None:
            import torch
            from diffusers import StableDiffusionImg2ImgPipeline

            settings = get_settings()
            device = _device()
            dtype = torch.float32 if device == "cpu" else torch.float16
            log.info("Loading %s on %s…", settings.sd_model_id, device)
            pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
                settings.sd_model_id,
                torch_dtype=dtype,
                variant="fp16" if dtype == torch.float16 else None,
                use_safetensors=True,
            ).to(device)
            pipe.enable_attention_slicing()
            pipe.set_progress_bar_config(disable=True)
            _pipe = pipe
            log.info("Stable Diffusion ready.")
    return _pipe


def _render_sd(req: RenderRequest) -> Image.Image:
    import torch

    pipe = _get_pipe()
    result = pipe(
        prompt=req.prompt,
        negative_prompt=req.negative_prompt,
        image=req.photo,
        strength=req.strength,
        num_inference_steps=get_settings().sd_steps,
        guidance_scale=7.5,
        generator=torch.Generator("cpu").manual_seed(req.seed),
    )
    if result.nsfw_content_detected and result.nsfw_content_detected[0]:
        raise GenerationError("The result was blocked by the safety filter. Try again or change your wishes.")
    img = result.images[0]
    if max(img.convert("L").getextrema()) < 8:  # all-black output (fp16 NaNs)
        raise GenerationError("The image model produced an empty image. Please try again.")
    return img


# ---------- remote worker (worker.py on another machine) ----------

class WorkerUnavailable(Exception):
    pass


async def _render_remote(req: RenderRequest) -> Image.Image:
    settings = get_settings()
    if not settings.render_url:
        raise WorkerUnavailable("RENDER_URL is not set")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(180.0, connect=8.0)) as client:
            res = await client.post(
                f"{settings.render_url.rstrip('/')}/render",
                headers={"X-Render-Key": settings.render_key or "", "ngrok-skip-browser-warning": "1"},
                files={"image": ("room.jpg", to_jpeg(req.photo), "image/jpeg")},
                data={
                    "prompt": req.prompt,
                    "negative_prompt": req.negative_prompt,
                    "strength": str(req.strength),
                    "seed": str(req.seed),
                },
            )
    except httpx.HTTPError as e:
        raise WorkerUnavailable(f"{type(e).__name__}: {e}") from e

    if res.status_code == 422:  # the worker ran but rejected the result (safety filter etc.)
        raise GenerationError(res.json().get("detail", "The image couldn't be generated."))
    if res.status_code != 200 or not res.headers.get("content-type", "").startswith("image/"):
        raise WorkerUnavailable(f"worker answered {res.status_code}")
    return Image.open(io.BytesIO(res.content)).convert("RGB")


# One local render at a time: the GPU can't run two efficiently and memory is tight.
_render_slot = asyncio.Semaphore(1)


async def render(req: RenderRequest) -> tuple[Image.Image, str]:
    """Returns the image and the engine that actually produced it."""
    settings = get_settings()
    if settings.image_engine == "remote":
        try:
            return await _render_remote(req), "sd15"
        except WorkerUnavailable as e:
            if not settings.render_fallback_demo:
                raise GenerationError("The image model is offline right now. Please try again later.") from e
            log.warning("Render worker unavailable (%s); returning a demo preview.", e)
            return await run_in_threadpool(_render_demo, req), "demo"

    async with _render_slot:
        if settings.image_engine == "demo":
            return await run_in_threadpool(_render_demo, req), "demo"
        return await run_in_threadpool(_render_sd, req), "sd15"


def warm_up() -> None:
    """Load the model in the background so the first request isn't slow."""
    if get_settings().image_engine == "sd":
        threading.Thread(target=_get_pipe, daemon=True, name="sd-warmup").start()
