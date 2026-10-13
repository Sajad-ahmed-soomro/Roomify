"""Request authentication.

Browsers never call this service directly. The Next.js server verifies the
user's session (Better Auth), then calls us with:
  X-Internal-Key: shared secret (INTERNAL_API_KEY)
  X-User:         base64url(JSON {id, email, name, image})
We trust X-User only when the key matches, and keep our users table in sync.
"""

import base64
import hmac
import json
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .db import get_db
from .models import User, utcnow


class Identity(BaseModel):
    id: str
    email: str
    name: str = ""
    image: str | None = None


def require_internal_key(x_internal_key: Annotated[str | None, Header()] = None) -> None:
    expected = get_settings().internal_api_key
    if not x_internal_key or not hmac.compare_digest(x_internal_key.encode(), expected.encode()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid internal API key.")


async def current_user(
    _: Annotated[None, Depends(require_internal_key)],
    db: Annotated[AsyncSession, Depends(get_db)],
    x_user: Annotated[str | None, Header()] = None,
) -> User:
    if not x_user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing user.")
    try:
        identity = Identity.model_validate(json.loads(base64.urlsafe_b64decode(x_user + "==")))
    except (ValueError, ValidationError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Malformed X-User header.")

    user = await db.get(User, identity.id)
    if user is None:
        user = User(id=identity.id, email=identity.email, name=identity.name, image=identity.image)
        db.add(user)
    else:
        user.email, user.name, user.image = identity.email, identity.name, identity.image
        user.last_seen_at = utcnow()
    await db.commit()
    return user


CurrentUser = Annotated[User, Depends(current_user)]
DB = Annotated[AsyncSession, Depends(get_db)]
