"""HostelDrop API entrypoint.

This module wires the FastAPI application together from the ``core`` building
blocks and the ``routers`` packages. The bulk of the logic lives in those
modules; this file only assembles the app (middleware, lifespan, CORS, router
registration) and re-exports the symbols that the test-suite imports.

Run with:  python -m uvicorn backend.server:app --host 0.0.0.0 --port 8001
"""
import asyncio
import sys
from contextlib import asynccontextmanager
from pathlib import Path as _FsPath
from typing import Optional

# Make ``core`` and ``routers`` importable whether this file is loaded as part
# of the ``backend`` package (``uvicorn backend.server:app``) or executed
# directly by path (as the test-suite does via importlib).
_BACKEND_DIR = _FsPath(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

# The test-suite re-executes this file with mutated environment variables to
# verify the production startup guardrails. Drop any cached internal modules so
# config (and everything depending on it) re-evaluates the environment on every
# load instead of serving a stale, first-import snapshot.
for _cached in [
    name for name in list(sys.modules)
    if name == "core" or name.startswith("core.")
    or name == "routers" or name.startswith("routers.")
]:
    del sys.modules[_cached]

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

# Re-exported config / enums / flags (consumed here and by the test-suite).
from core.config import (  # noqa: E402,F401
    APP_ENV,
    HostelType,
    INCLUDE_DEBUG_OTP_IN_RESPONSE,
    IS_PRODUCTION,
    MAX_QUERY_STRING_BYTES,
    MAX_REQUEST_BODY_BYTES,
    ParcelStatus,
    SENTRY_DSN,
    SENTRY_TRACES_SAMPLE_RATE,
    UserRole,
    logger,
)


def _init_sentry() -> None:
    """Initialize Sentry error monitoring when SENTRY_DSN is configured."""
    if not SENTRY_DSN:
        return
    try:
        import sentry_sdk  # imported lazily so the app runs without the package

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            environment=APP_ENV,
            traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
            send_default_pii=False,
        )
        logger.info("Sentry error monitoring enabled for environment '%s'", APP_ENV)
    except Exception as exc:  # pragma: no cover - monitoring must never block startup
        logger.warning("Could not initialize Sentry: %s", exc)


_init_sentry()
from core.db import client, db  # noqa: E402,F401
from core.redis_client import redis_enabled, redis_ping  # noqa: E402,F401
from core.domain import (  # noqa: E402,F401
    ensure_admin_user,
    ensure_database_indexes,
    get_cors_origins,
    periodic_delivered_cleanup,
)

# Re-exports for backwards-compatible imports (used by the test-suite).
from core.security import (  # noqa: E402,F401
    create_access_token,
    hash_secret_value,
    secret_matches,
    verify_token,
)
from core.validators import (  # noqa: E402,F401
    parse_object_id,
    validate_hostel_type,
    validate_parcel_status,
)
from core.label_match import (  # noqa: E402,F401
    name_similarity,
    parse_label,
    rank_candidates,
)
from core.models import (  # noqa: E402,F401
    AssignParcelRequest,
    GuardLoginRequest,
    SendOTPRequest,
    StudentLoginRequest,
    VerifyParcelOTPRequest,
)
from routers import admin as admin_routes  # noqa: E402
from routers import auth as auth_routes  # noqa: E402
from routers import parcels as parcel_routes  # noqa: E402
from routers import students as student_routes  # noqa: E402

# Route handlers re-exported for the test-suite's direct-call checks.
from routers.parcels import (  # noqa: E402,F401
    assign_parcel,
    get_hostel_parcels,
    get_student_details,
    send_parcel_otp,
)

auto_delete_task: Optional[asyncio.Task] = None


@asynccontextmanager
async def app_lifespan(_: FastAPI):
    global auto_delete_task
    await ensure_database_indexes()
    await ensure_admin_user()
    if IS_PRODUCTION and not redis_enabled():
        # Without Redis the auth/QR rate limiters keep state in process memory, so
        # each worker or instance enforces limits independently and the effective
        # limit is multiplied by the worker count. Set REDIS_URL to enforce a hard
        # global cap, or run a single worker.
        logger.warning(
            "REDIS_URL is not set: rate limiting is in-memory and per-process. Set "
            "REDIS_URL for a shared global limit, or run a single worker in production."
        )
    if not auto_delete_task or auto_delete_task.done():
        auto_delete_task = asyncio.create_task(periodic_delivered_cleanup())

    try:
        yield
    finally:
        if auto_delete_task:
            auto_delete_task.cancel()
            try:
                await auto_delete_task
            except asyncio.CancelledError:
                pass
            auto_delete_task = None
        client.close()


app = FastAPI(title="Hostel Parcel Management System", lifespan=app_lifespan)


@app.middleware("http")
async def enforce_request_limits(request: Request, call_next):
    if len(request.url.query.encode("utf-8")) > MAX_QUERY_STRING_BYTES:
        return JSONResponse(status_code=414, content={"detail": "Query string too large"})

    content_length = request.headers.get("content-length")
    if request.method in {"POST", "PUT", "PATCH"} and content_length is None:
        return JSONResponse(status_code=411, content={"detail": "Content-Length header is required"})

    if content_length is not None:
        try:
            parsed_length = int(content_length)
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Malformed Content-Length header"})
        if parsed_length < 0:
            return JSONResponse(status_code=400, content={"detail": "Malformed Content-Length header"})
        if parsed_length > MAX_REQUEST_BODY_BYTES:
            return JSONResponse(status_code=413, content={"detail": "Request body too large"})

    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
    if IS_PRODUCTION:
        response.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
    return response


@app.get("/health")
async def health_check():
    """Liveness/readiness probe for the platform (Render) and uptime monitors.

    Reports DB connectivity (and Redis when configured). Returns 503 if the
    database is unreachable so the platform can avoid routing traffic to a
    broken instance.
    """
    db_ok = False
    try:
        await client.admin.command("ping")
        db_ok = True
    except Exception as exc:
        logger.warning("Health check: database ping failed: %s", exc)

    checks = {"database": "ok" if db_ok else "down"}
    if redis_enabled():
        checks["redis"] = "ok" if await redis_ping() else "down"

    status_ok = db_ok
    payload = {"status": "ok" if status_ok else "degraded", "checks": checks}
    if not status_ok:
        return JSONResponse(status_code=503, content=payload)
    return payload


# Register routers. Order matters: ``students`` (literal /student/notifications)
# is included before ``parcels`` (which owns the /student/{student_id} param
# route) so the literal path wins.
app.include_router(auth_routes.router)
app.include_router(student_routes.router)
app.include_router(admin_routes.router)
app.include_router(parcel_routes.router)

cors_origins = get_cors_origins()
allow_all_origins = cors_origins == ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=not allow_all_origins,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
