"""Claude as the interior designer: looks at the photo, plans the redesign and
writes the Stable Diffusion prompt."""

import base64
import io
import json
import logging
import re
from dataclasses import dataclass
from typing import Any

import anthropic
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


_client: anthropic.AsyncAnthropic | None = None


def _get_client() -> anthropic.AsyncAnthropic | None:
    global _client
    settings = get_settings()
    if not settings.anthropic_api_key:
        return None
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=90.0)
    return _client


async def plan_design(photo_jpeg: bytes, room_type: str, style: str, wishes: str) -> Plan:
    """Ask Claude for a design plan. Falls back to a template prompt if Claude is
    unavailable; raises NotARoomError if the photo isn't a room."""
    client = _get_client()
    if client is None:
        return fallback_plan(room_type, style, wishes)

    settings = get_settings()
    request_text = (
        f"Room type: {ROOM_TYPES[room_type]}\n"
        f"Style: {STYLES[style].label} ({STYLES[style].prompt})\n"
        f"User's wishes: {wishes.strip() or '(none)'}"
    )
    try:
        response = await client.beta.messages.create(
            model=settings.llm_model,
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
            output_config={"effort": settings.llm_effort, "format": {"type": "json_schema", "schema": PLAN_SCHEMA}},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError:
        log.error("Anthropic API key was rejected; using the template prompt.")
        return fallback_plan(room_type, style, wishes)
    except anthropic.APIError as e:
        log.warning("Claude request failed (%s); using the template prompt.", e)
        return fallback_plan(room_type, style, wishes)

    if response.stop_reason in ("refusal", "max_tokens"):
        log.warning("Claude stopped with %s; using the template prompt.", response.stop_reason)
        return fallback_plan(room_type, style, wishes)

    text = next((b.text for b in response.content if b.type == "text"), "")
    try:
        plan = DesignPlan.model_validate(json.loads(text))
    except (json.JSONDecodeError, ValidationError) as e:
        log.warning("Claude returned an unusable plan (%s); using the template prompt.", e)
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
        model=response.model,
    )
