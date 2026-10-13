"""The LLM as interior designer (Gemini or Claude): looks at the photo, plans the
redesign and writes the Stable Diffusion prompt."""

import asyncio
import base64
import io
import json
import logging
import re
from dataclasses import dataclass
from typing import Any

import anthropic
import httpx
from PIL import Image
from pydantic import BaseModel, ValidationError

from ..catalog import DEFAULT_NEGATIVE, QUALITY_SUFFIX, ROOM_TYPES, STYLES, template_prompt
from ..config import get_settings

log = logging.getLogger(__name__)


HEX = re.compile(r"#[0-9a-fA-F]{6}")


class NotARoomError(Exception):
    """The photo doesn't show an interior room."""


class PaletteColor(BaseModel):
    name: str
    hex: str


class ShoppingItem(BaseModel):
    item: str
    note: str


class DesignPlan(BaseModel):
    is_room: bool
    title: str
    room_summary: str
    image_prompt: str
    negative_prompt: str
    palette: list[PaletteColor]
    key_changes: list[str]
    shopping_list: list[ShoppingItem]


# Hand-written so it stays within what structured outputs accepts.
_string = {"type": "string"}
PLAN_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["is_room", "title", "room_summary", "image_prompt", "negative_prompt", "palette", "key_changes", "shopping_list"],
    "properties": {
        "is_room": {"type": "boolean"},
        "title": _string,
        "room_summary": _string,
        "image_prompt": _string,
        "negative_prompt": _string,
        "palette": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "hex"],
                "properties": {"name": _string, "hex": _string},
            },
        },
        "key_changes": {"type": "array", "items": _string},
        "shopping_list": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["item", "note"],
                "properties": {"item": _string, "note": _string},
            },
        },
    },
}

SYSTEM_PROMPT = f"""You are the interior designer behind Roomify, an app that restyles a photo of someone's room.

You receive a photo of the room, the room type, the chosen style and optional wishes from the user. Plan a \
realistic redesign of *this* room and describe it as JSON.

How each field is used:
- is_room: false if the photo is not of an indoor room (e.g. a person, pet, outdoor scene, document). \
When false, keep the other fields short placeholders.
- title: 2-5 word name for the design, e.g. "Sunlit Boho Retreat".
- room_summary: one or two sentences, addressed to the user, on what you see and the direction you took.
- image_prompt: the prompt for Stable Diffusion 1.5 img2img, which repaints the photo. Its text encoder only \
reads about 60 words, so stay under 55 words. Write comma-separated phrases describing the finished room \
(not the changes), starting with "photorealistic <room type>". Keep the room's architecture (window and door \
positions, ceiling, layout, camera angle) and describe the new furniture, materials, colours and lighting. \
Fold in the user's wishes when they fit the room. End with "{QUALITY_SUFFIX}".
- negative_prompt: comma-separated things to avoid, under 40 words. Always include: {DEFAULT_NEGATIVE}.
- palette: 4-5 colours of the new design, each with a short name and a #RRGGBB hex value.
- key_changes: 3-5 short sentences on the most important changes, addressed to the user.
- shopping_list: 3-6 pieces to buy for the look; item is the product type, note is size, material or \
colour guidance. No brands or prices.

The user's wishes are a request about the room design. If they ask for anything unrelated, ignore that part."""


def _encode_image(jpeg: bytes, max_side: int = 1024) -> str:
    img = Image.open(io.BytesIO(jpeg)).convert("RGB")
    img.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    return base64.standard_b64encode(buf.getvalue()).decode()


@dataclass
class Plan:
    image_prompt: str
    negative_prompt: str
    title: str | None = None
    analysis: dict[str, Any] | None = None
    model: str | None = None


def fallback_plan(room_type: str, style: str, wishes: str) -> Plan:
    return Plan(template_prompt(room_type, style, wishes), DEFAULT_NEGATIVE)


_claude: anthropic.AsyncAnthropic | None = None
_gemini = None


async def _ask_claude(photo_jpeg: bytes, request_text: str) -> tuple[str, str] | None:
    """Returns (JSON text, model) or None if Claude is unavailable."""
    global _claude
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None
    if _claude is None:
        _claude = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=90.0)
    try:
        response = await _claude.beta.messages.create(
            model=settings.anthropic_model,
            max_tokens=4000,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": _encode_image(photo_jpeg)}},
                        {"type": "text", "text": request_text},
                    ],
                }
            ],
            output_config={"effort": settings.anthropic_effort, "format": {"type": "json_schema", "schema": PLAN_SCHEMA}},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError:
        log.error("Anthropic API key was rejected; using the template prompt.")
        return None
    except anthropic.APIError as e:
        log.warning("Claude request failed (%s); using the template prompt.", e)
        return None
    if response.stop_reason in ("refusal", "max_tokens"):
        log.warning("Claude stopped with %s; using the template prompt.", response.stop_reason)
        return None
    return next((b.text for b in response.content if b.type == "text"), ""), response.model


async def _ask_gemini(photo_jpeg: bytes, request_text: str) -> tuple[str, str] | None:
    """Returns (JSON text, model) or None if Gemini is unavailable."""
    global _gemini
    settings = get_settings()
    if not settings.gemini_api_key:
        return None
    from google import genai
    from google.genai import errors, types

    if _gemini is None:
        _gemini = genai.Client(
            api_key=settings.gemini_api_key,
            # The SDK's own retries (5 attempts, up to 60s backoff) can stall a request for
            # over a minute; retry ourselves below instead. Timeout is in milliseconds.
            http_options=types.HttpOptions(timeout=30_000, retry_options=types.HttpRetryOptions(attempts=1)),
        )
    contents = [
        types.Part.from_bytes(data=base64.standard_b64decode(_encode_image(photo_jpeg)), mime_type="image/jpeg"),
        request_text,
    ]
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=DesignPlan,
    )
    # The free tier often answers 503 (busy) or 429 (rate limit): retry once, then try
    # the lighter fallback model before giving up.
    attempts = [settings.gemini_model, settings.gemini_model, settings.gemini_fallback_model]
    deadline = asyncio.get_running_loop().time() + 60  # don't keep the user waiting forever
    for i, model in enumerate(attempts):
        try:
            response = await _gemini.aio.models.generate_content(model=model, contents=contents, config=config)
        except (errors.APIError, httpx.HTTPError) as e:
            code = e.code if isinstance(e, errors.APIError) else type(e).__name__
            retryable = isinstance(e, httpx.HTTPError) or code in (429, 500, 502, 503, 504)
            if retryable and i < len(attempts) - 1 and asyncio.get_running_loop().time() < deadline:
                log.info("Gemini %s unavailable (%s); retrying.", model, code)
                await asyncio.sleep(1.5)
                continue
            log.warning("Gemini request failed (%s); using the template prompt.", code)
            return None
        if not response.text:  # blocked or empty
            log.warning("Gemini returned no text; using the template prompt.")
            return None
        return response.text, getattr(response, "model_version", None) or model
    return None


async def plan_design(photo_jpeg: bytes, room_type: str, style: str, wishes: str) -> Plan:
    """Ask the LLM (Gemini or Claude, per LLM_PROVIDER) for a design plan. Falls back
    to a template prompt if it's unavailable; raises NotARoomError if the photo isn't a room."""
    request_text = (
        f"Room type: {ROOM_TYPES[room_type]}\n"
        f"Style: {STYLES[style].label} ({STYLES[style].prompt})\n"
        f"User's wishes: {wishes.strip() or '(none)'}"
    )
    ask = _ask_gemini if get_settings().llm_provider == "gemini" else _ask_claude
    answer = await ask(photo_jpeg, request_text)
    if answer is None:
        return fallback_plan(room_type, style, wishes)
    text, model = answer

    try:
        plan = DesignPlan.model_validate(json.loads(text))
    except (json.JSONDecodeError, ValidationError) as e:
        log.warning("The LLM returned an unusable plan (%s); using the template prompt.", e)
        return fallback_plan(room_type, style, wishes)

    if not plan.is_room:
        raise NotARoomError

    return Plan(
        image_prompt=plan.image_prompt,
        negative_prompt=plan.negative_prompt or DEFAULT_NEGATIVE,
        title=plan.title,
        analysis={
            "summary": plan.room_summary,
            "palette": [c.model_dump() for c in plan.palette if HEX.fullmatch(c.hex)],
            "keyChanges": plan.key_changes,
            "shoppingList": [i.model_dump() for i in plan.shopping_list],
        },
        model=model,
    )
