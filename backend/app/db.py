import os
import ssl
from collections.abc import AsyncIterator
from pathlib import Path

import certifi
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings


def engine_args(url: str) -> tuple[str, dict]:
    """Accepts plain Postgres URLs as given by Neon (postgresql://…?sslmode=require)
    and turns them into what SQLAlchemy + asyncpg expect."""
    if not url.startswith(("postgres://", "postgresql://")):
        return url, {}
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query))
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)  # not supported by asyncpg
    url = urlunsplit(parts._replace(scheme="postgresql+asyncpg", query=urlencode(query)))
    connect_args: dict = {}
    if sslmode is not None and sslmode != "disable":
        # Use certifi's CA bundle: python.org builds on macOS don't see the system certificates.
        connect_args["ssl"] = ssl.create_default_context(cafile=certifi.where())
    elif sslmode == "disable":
        connect_args["ssl"] = False
    if "-pooler" in (parts.hostname or ""):
        # Neon's pooler (PgBouncer, transaction mode) can't keep prepared statements.
        connect_args["statement_cache_size"] = 0
        query["prepared_statement_cache_size"] = "0"
        url = urlunsplit(parts._replace(scheme="postgresql+asyncpg", query=urlencode(query)))
    return url, {"connect_args": connect_args} if connect_args else {}


def _check_sqlite(url: str) -> None:
    if not url.startswith("sqlite"):
        return
    if os.environ.get("RENDER"):  # set automatically on Render
        raise RuntimeError(
            "DATABASE_URL is not set. On Render, add your Neon connection string "
            "(postgresql://…) under Environment; local SQLite is wiped on every restart."
        )
    path = url.split(":///", 1)[-1]
    Path(path).parent.mkdir(parents=True, exist_ok=True)


url, kwargs = engine_args(get_settings().database_url)
_check_sqlite(url)
engine = create_async_engine(url, pool_pre_ping=True, **kwargs)

if engine.dialect.name == "sqlite":

    @event.listens_for(engine.sync_engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _):  # noqa: ANN001
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")
        cur.close()


SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
