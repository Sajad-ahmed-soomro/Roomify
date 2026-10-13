from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """A Roomify user. The id comes from the auth service (Better Auth in the frontend)."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    image: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    # Lifetime count, used for the per-user limit (deleting a design doesn't refund it).
    designs_created: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    designs: Mapped[list["Design"]] = relationship(back_populates="user", cascade="all, delete-orphan", passive_deletes=True)


class Design(Base):
    """One generated redesign: inputs, what the LLM produced, and where the images live."""

    __tablename__ = "designs"
    __table_args__ = (Index("ix_designs_user_created", "user_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    # What the user asked for
    room_type: Mapped[str] = mapped_column(String(40))
    style: Mapped[str] = mapped_column(String(40))
    user_prompt: Mapped[str] = mapped_column(Text, default="")
    strength: Mapped[float] = mapped_column(Float)
    seed: Mapped[int] = mapped_column(Integer)

    # What the LLM produced (null when the LLM was unavailable)
    title: Mapped[str | None] = mapped_column(String(120))
    analysis: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    image_prompt: Mapped[str] = mapped_column(Text)
    negative_prompt: Mapped[str] = mapped_column(Text, default="")
    llm_model: Mapped[str | None] = mapped_column(String(80))

    # Rendering
    engine: Mapped[str] = mapped_column(String(20))
    duration_ms: Mapped[int] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship(back_populates="designs")
    images: Mapped[list["DesignImage"]] = relationship(cascade="all, delete-orphan", passive_deletes=True)


class DesignImage(Base):
    """The before/after JPEGs. Kept in the database: a few hundred KB per design is
    fine at portfolio scale and avoids a separate storage service."""

    __tablename__ = "design_images"

    design_id: Mapped[str] = mapped_column(ForeignKey("designs.id", ondelete="CASCADE"), primary_key=True)
    kind: Mapped[str] = mapped_column(String(10), primary_key=True)  # "before" | "after"
    data: Mapped[bytes] = mapped_column(LargeBinary)
