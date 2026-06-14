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
    UserRole,
    logger,
)
from core.db import client, db  # noqa: E402,F401
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
    if IS_PRODUCTION:
        # The auth/QR rate limiters keep state in process memory, so each worker
        # or instance enforces limits independently. Behind multiple workers the
        # effective limit is multiplied by the worker count. Run a single worker,
        # or move the limiter to a shared store (e.g. Redis), for a hard global cap.
        logger.warning(
            "Rate limiting is in-memory and per-process. Use a single worker or a "
            "shared-store limiter to enforce a hard global limit in production."
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
