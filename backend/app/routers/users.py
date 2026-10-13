from fastapi import APIRouter, status
from sqlalchemy import func, select

from ..deps import DB, CurrentUser
from ..models import Design
from ..schemas import UserOut
from ..services import images
from ..config import get_settings

router = APIRouter(prefix="/v1/me", tags=["users"])


@router.get("", response_model=UserOut, response_model_by_alias=True)
async def me(db: DB, user: CurrentUser):
    count = await db.scalar(select(func.count()).select_from(Design).where(Design.user_id == user.id))
    settings = get_settings()
    limit = None if settings.is_unlimited(user.email) else settings.max_designs_per_user
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        image=user.image,
        created_at=user.created_at,
        design_count=count or 0,
        designs_created=user.designs_created,
        design_limit=limit,
        designs_remaining=None if limit is None else max(0, limit - user.designs_created),
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_data(db: DB, user: CurrentUser):
    """Delete the user and all their designs and images from this service."""
    designs = (await db.scalars(select(Design).where(Design.user_id == user.id))).all()
    await db.delete(user)
    await db.commit()
    for design in designs:
        await images.remove(design)
