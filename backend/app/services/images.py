"""Where the before/after JPEGs live.

IMAGE_STORAGE=db  (default) rows in the design_images table. No setup needed.
IMAGE_STORAGE=s3  any S3-compatible bucket: Neon Object Storage, Google Cloud
                  Storage (HMAC keys), Cloudflare R2, AWS S3… The bucket stays private; the backend
                  streams images to their owner.
"""

import logging
from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from ..config import get_settings
from ..models import Design, DesignImage

log = logging.getLogger(__name__)
KINDS = ("before", "after")


def _key(design: Design, kind: str) -> str:
    return f"designs/{design.user_id}/{design.id}/{kind}.jpg"


@lru_cache
def _bucket():
    import boto3
    from botocore.config import Config

    s = get_settings()
    client = boto3.client(
        "s3",
        endpoint_url=s.s3_endpoint_url or None,
        region_name=s.s3_region,
        aws_access_key_id=s.s3_access_key_id,
        aws_secret_access_key=s.s3_secret_access_key,
        config=Config(
            # Neon Object Storage only supports path-style URLs (host/bucket/key); GCS and R2 accept them too.
            s3={"addressing_style": "path"},
            signature_version="s3v4",
            # GCS's S3 API rejects the checksum headers newer boto3 adds by default.
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        ),
    )
    return client, s.s3_bucket


def _use_bucket() -> bool:
    return get_settings().image_storage == "s3"


def attach(design: Design, images: dict[str, bytes]) -> None:
    """For db storage: add the image rows to a new design before it's committed."""
    if not _use_bucket():
        design.images = [DesignImage(kind=k, data=v) for k, v in images.items()]


async def upload(design: Design, images: dict[str, bytes]) -> None:
    """For bucket storage: upload before the design row is committed."""
    if not _use_bucket():
        return
    client, bucket = _bucket()
    for kind, data in images.items():
        await run_in_threadpool(
            client.put_object, Bucket=bucket, Key=_key(design, kind), Body=data, ContentType="image/jpeg"
        )


async def read(db: AsyncSession, design: Design, kind: str) -> bytes | None:
    if not _use_bucket():
        row = await db.get(DesignImage, (design.id, kind))
        return row.data if row else None
    client, bucket = _bucket()
    try:
        obj = await run_in_threadpool(client.get_object, Bucket=bucket, Key=_key(design, kind))
    except client.exceptions.NoSuchKey:
        return None
    return await run_in_threadpool(obj["Body"].read)


async def remove(design: Design) -> None:
    """Deletes bucket objects (db rows go with the design via cascade)."""
    if not _use_bucket():
        return
    client, bucket = _bucket()
    for kind in KINDS:
        try:
            await run_in_threadpool(client.delete_object, Bucket=bucket, Key=_key(design, kind))
        except Exception as e:  # don't fail a delete over a missing object
            log.warning("Could not delete %s: %s", _key(design, kind), e)
