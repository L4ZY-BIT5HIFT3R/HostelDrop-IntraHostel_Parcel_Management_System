"""Optional shared-state Redis client for rate limiting.

When ``REDIS_URL`` is set the rate limiters keep their sliding-window state in
Redis, so a single global limit is enforced across every worker and instance.
When it is unset — or if Redis becomes unreachable at runtime — callers fall
back to the per-process in-memory limiter, so the app keeps serving (fail-open
to local limiting) rather than hard-failing on a Redis outage.

The client is created lazily on first use and cached. A connection that fails
to construct is remembered so we do not retry (and log) on every request.
"""
import os
from typing import Any, Optional

from .config import logger

REDIS_URL = os.environ.get("REDIS_URL", "").strip()

_redis_client: Optional[Any] = None
_redis_disabled = not bool(REDIS_URL)


def redis_enabled() -> bool:
    """True when a Redis URL is configured and the client has not been disabled."""
    return not _redis_disabled


def get_redis() -> Optional[Any]:
    """Return a cached async Redis client, or ``None`` to use the in-memory fallback."""
    global _redis_client, _redis_disabled

    if _redis_disabled:
        return None

    if _redis_client is None:
        try:
            import redis.asyncio as redis_asyncio  # imported lazily; optional dependency
        except Exception as exc:  # pragma: no cover - import guard
            logger.warning(
                "redis package not available, using in-memory rate limiting: %s", exc
            )
            _redis_disabled = True
            return None

        try:
            _redis_client = redis_asyncio.from_url(
                REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            logger.info("Redis configured for shared-state rate limiting")
        except Exception as exc:
            logger.warning(
                "Could not initialize Redis client, using in-memory rate limiting: %s",
                exc,
            )
            _redis_disabled = True
            return None

    return _redis_client


async def redis_ping() -> bool:
    """Best-effort health probe. Returns False if Redis is unconfigured or down."""
    client = get_redis()
    if client is None:
        return False
    try:
        return bool(await client.ping())
    except Exception as exc:
        logger.warning("Redis ping failed: %s", exc)
        return False
