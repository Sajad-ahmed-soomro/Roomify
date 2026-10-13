from collections.abc import AsyncIterator
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
    if sslmode is not None:
        connect_args["ssl"] = sslmode != "disable"
    if "-pooler" in (parts.hostname or ""):
        # Neon's pooler (PgBouncer, transaction mode) can't keep prepared statements.
        connect_args["statement_cache_size"] = 0
        query["prepared_statement_cache_size"] = "0"
        url = urlunsplit(parts._replace(scheme="postgresql+asyncpg", query=urlencode(query)))
    return url, {"connect_args": connect_args} if connect_args else {}


url, kwargs = engine_args(get_settings().database_url)
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
