import logging
import random
import time
import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import select, update
from starlette.concurrency import run_in_threadpool

from ..catalog import ROOM_TYPES, STYLES
from ..config import get_settings
from ..deps import DB, CurrentUser
from ..models import Design, User
from ..schemas import DesignOut
from ..services import imagegen, images
from ..services.designer import NotARoomError, plan_design

log = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/designs", tags=["designs"])


async def _get_owned(db: DB, user: CurrentUser, design_id: str) -> Design:
    design = await db.get(Design, design_id)
    if design is None or design.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Design not found.")
    return design


async def _reserve_slot(db: DB, user: User) -> bool:
    """Atomically counts one design against the user's limit. False if they're out."""
    settings = get_settings()
    stmt = update(User).where(User.id == user.id).values(designs_created=User.designs_created + 1)
    if not settings.is_unlimited(user.email):
        stmt = stmt.where(User.designs_created < settings.max_designs_per_user)
    reserved = (await db.execute(stmt)).rowcount == 1
    await db.commit()
    return reserved


async def _release_slot(db: DB, user: User) -> None:
    await db.execute(update(User).where(User.id == user.id).values(designs_created=User.designs_created - 1))
    await db.commit()


@router.get("", response_model=list[DesignOut], response_model_by_alias=True)
async def list_designs(db: DB, user: CurrentUser, limit: int = 100):
    rows = await db.scalars(
        select(Design).where(Design.user_id == user.id).order_by(Design.created_at.desc()).limit(min(limit, 200))
    )
    return rows.all()


@router.post("", response_model=DesignOut, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
async def create_design(
    db: DB,
    user: CurrentUser,
    image: Annotated[UploadFile, File()],
    room_type: Annotated[str, Form()],
    style: Annotated[str, Form()],
    strength: Annotated[float, Form(ge=0, le=1)],
    prompt: Annotated[str, Form(max_length=300)] = "",
    seed: Annotated[int | None, Form(ge=0, lt=2**31)] = None,
):
    """Plan the redesign with Claude, render it, and save it to the user's account."""
    settings = get_settings()
    if room_type not in ROOM_TYPES or style not in STYLES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown room type or style.")

    data = await image.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "The photo is too large (max 10 MB).")
    try:
        photo = await run_in_threadpool(imagegen.load_photo, data, settings.sd_max_side)
    except imagegen.InvalidImageError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    if not await _reserve_slot(db, user):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"You've used all {settings.max_designs_per_user} designs included with your account.",
        )
    try:
        design = await _generate(db, user, photo, room_type, style, prompt, strength, seed)
    except BaseException:
        await db.rollback()
        await _release_slot(db, user)
        raise
    log.info("design %s for %s: engine=%s llm=%s %dms", design.id, user.id, design.engine, design.llm_model, design.duration_ms)
    return design


async def _generate(db: DB, user: User, photo, room_type: str, style: str, prompt: str, strength: float, seed: int | None) -> Design:
    started = time.perf_counter()
    before_jpeg = imagegen.to_jpeg(photo)
    try:
        plan = await plan_design(before_jpeg, room_type, style, prompt)
    except NotARoomError:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "That photo doesn't look like a room. Upload a photo of an indoor space.",
        )

    seed = seed if seed is not None else random.randrange(2**31)
    try:
        result, engine = await imagegen.render(
            imagegen.RenderRequest(
                photo=photo,
                prompt=plan.image_prompt,
                negative_prompt=plan.negative_prompt,
                # Map the 0-1 slider onto the img2img range that keeps the room recognisable.
                strength=0.3 + strength * 0.55,
                seed=seed,
                style=style,
            )
        )
    except imagegen.GenerationError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(e))

    design = Design(
        id=str(uuid.uuid4()),
        user_id=user.id,
        room_type=room_type,
        style=style,
        user_prompt=prompt.strip(),
        strength=strength,
        seed=seed,
        title=plan.title,
        analysis=plan.analysis,
        image_prompt=plan.image_prompt,
        negative_prompt=plan.negative_prompt,
        llm_model=plan.model,
        engine=engine,
        duration_ms=round((time.perf_counter() - started) * 1000),
    )
    files = {"before": before_jpeg, "after": imagegen.to_jpeg(result)}
    images.attach(design, files)
    await images.upload(design, files)
    db.add(design)
    try:
        await db.commit()
    except BaseException:
        await images.remove(design)
        raise
    return design


@router.get("/{design_id}", response_model=DesignOut, response_model_by_alias=True)
async def get_design(design_id: str, db: DB, user: CurrentUser):
    return await _get_owned(db, user, design_id)


@router.delete("/{design_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_design(design_id: str, db: DB, user: CurrentUser):
    design = await _get_owned(db, user, design_id)
    await db.delete(design)
    await db.commit()
    await images.remove(design)


@router.get("/{design_id}/{kind}")
async def get_image(design_id: str, kind: Literal["before", "after"], db: DB, user: CurrentUser):
    data = await images.read(db, await _get_owned(db, user, design_id), kind)
    if data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Image missing.")
    return Response(data, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=31536000, immutable"})
