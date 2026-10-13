from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, field_serializer
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    @field_serializer("created_at", check_fields=False)
    def _epoch_ms(self, v: datetime) -> int:
        # SQLite hands back naive datetimes; they are stored in UTC.
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return int(v.timestamp() * 1000)


class DesignOut(CamelModel):
    id: str
    title: str | None
    room_type: str
    style: str
    user_prompt: str
    strength: float
    seed: int
    image_prompt: str
    analysis: dict[str, Any] | None
    llm_model: str | None
    engine: str
    duration_ms: int
    created_at: datetime


class UserOut(CamelModel):
    id: str
    email: str
    name: str
    image: str | None
    created_at: datetime
    design_count: int
    designs_created: int
    design_limit: int | None
    designs_remaining: int | None
