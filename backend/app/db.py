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
    if sslmode is None:
        return url, {}
    return url, {"connect_args": {"ssl": sslmode != "disable"}}


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
