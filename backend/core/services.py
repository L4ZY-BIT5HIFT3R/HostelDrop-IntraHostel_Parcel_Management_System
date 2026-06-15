"""Outbound services: email, push notifications, and rate limiting.

The rate limiters use Redis for shared sliding-window state when ``REDIS_URL``
is configured (so limits hold across workers/instances), and transparently fall
back to per-process in-memory state otherwise or if Redis is unreachable.
"""
import smtplib
import threading
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException, Request, status

from .config import (
    AUTH_RATE_LIMIT_CLEANUP_SECONDS,
    AUTH_RATE_LIMIT_MAX_REQUESTS,
    AUTH_RATE_LIMIT_WINDOW_SECONDS,
    ENABLE_SENSITIVE_LOGGING,
    QR_SCAN_RATE_LIMIT_CLEANUP_SECONDS,
    QR_SCAN_RATE_LIMIT_IP_MAX_REQUESTS,
    QR_SCAN_RATE_LIMIT_IP_WINDOW_SECONDS,
    QR_SCAN_RATE_LIMIT_PARCEL_MAX_REQUESTS,
    QR_SCAN_RATE_LIMIT_PARCEL_WINDOW_SECONDS,
    QR_SCAN_RATE_LIMIT_USER_MAX_REQUESTS,
    QR_SCAN_RATE_LIMIT_USER_WINDOW_SECONDS,
    SMTP_APP_PASSWORD,
    SMTP_EMAIL,
    STUDENT_NOTIFICATIONS_COLLECTION,
    TRUST_PROXY_HEADERS,
    logger,
    utcnow,
)
from .db import db
from .redis_client import get_redis


def mask_email(email: str) -> str:
    if "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = "*" * len(local)
    else:
        masked_local = f"{local[0]}{'*' * (len(local) - 2)}{local[-1]}"
    return f"{masked_local}@{domain}"


async def send_expo_push_notification(tokens: List[str], title: str, body: str, data: Optional[dict] = None):
    """Send Expo Push Notifications"""
    if not tokens:
        return

    messages = []
    for token in tokens:
        if not token or not str(token).startswith("ExponentPushToken"):
            continue
        msg = {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
        }
        if data:
            msg["data"] = data
        messages.append(msg)

    if not messages:
        return

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://exp.host/--/api/v2/push/send',
                headers={
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                json=messages
            )
            response.raise_for_status()
            logger.info("Sent %d Expo push notifications successfully", len(messages))
    except Exception as e:
        logger.warning("Failed to send Expo push notifications: %s", str(e))


async def send_email_otp(email: str, otp_code: str):
    """Send OTP via Gmail SMTP with App Password"""
    try:
        if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
            if ENABLE_SENSITIVE_LOGGING:
                logger.info("SMTP not configured. OTP for %s: %s", email, otp_code)
            else:
                logger.info("SMTP not configured. Generated OTP for %s", mask_email(email))
            return True

        message = MIMEMultipart()
        message['From'] = SMTP_EMAIL
        message['To'] = email
        message['Subject'] = 'HostelDrop - OTP Verification'

        body = f"""Dear Student,

Your OTP for verification is: {otp_code}

This OTP is valid for 10 minutes.

Please do not share this OTP with anyone.

Regards,
HostelDrop - Hostel Parcel Management System"""

        message.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=3) as server:
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.send_message(message)

        logger.info("OTP email sent to %s", mask_email(email))
        return True

    except Exception as e:
        logger.warning("Error sending OTP email: %s", str(e))
        if ENABLE_SENSITIVE_LOGGING:
            logger.info("Fallback OTP for %s: %s", email, otp_code)
        else:
            logger.info("Fallback OTP generated for %s", mask_email(email))
        return True


async def send_parcel_notification(email: str, student_name: str, room_number: str):
    """Send notification email when parcel is logged"""
    try:
        if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
            logger.info("SMTP not configured. Notification queued for %s", mask_email(email))
            return True

        message = MIMEMultipart()
        message['From'] = SMTP_EMAIL
        message['To'] = email
        message['Subject'] = 'HostelDrop - New Parcel Notification'

        body = f"""Dear {student_name},

A new parcel has been logged for you!

Room Number: {room_number}

Please collect your parcel from the hostel reception. You will need to verify OTP during collection.

Regards,
HostelDrop - Hostel Parcel Management System"""

        message.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=10) as server:
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.send_message(message)

        logger.info("Notification email sent to %s", mask_email(email))
        return True

    except Exception as e:
        logger.warning("Error sending notification email: %s", str(e))
        logger.info("Notification fallback recorded for %s", mask_email(email))
        return True


async def create_student_notification(
    student: Dict[str, Any],
    title: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    now = utcnow()
    notification_doc: Dict[str, Any] = {
        "student_id": str(student["_id"]),
        "roll_number": student.get("roll_number"),
        "hostel_type": student.get("hostel_type"),
        "title": title,
        "message": message,
        "metadata": metadata or {},
        "created_at": now,
    }
    await db[STUDENT_NOTIFICATIONS_COLLECTION].insert_one(notification_doc)

    push_token = student.get("expoPushToken")
    if push_token:
        await send_expo_push_notification(
            [push_token],
            title,
            message,
            metadata or None,
        )


class InMemoryRateLimiter:
    """Simple in-memory sliding-window rate limiter with periodic cleanup.

    Note: state lives in process memory, so each worker/instance enforces limits
    independently. Run a single worker or use a shared store for a hard global cap.
    """

    def __init__(self, max_requests: int, window_seconds: int, cleanup_interval_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.cleanup_interval_seconds = cleanup_interval_seconds
        self._requests: Dict[str, deque] = defaultdict(deque)
        self._last_cleanup = utcnow()
        self._lock = threading.Lock()

    def _cleanup_if_due(self, now: datetime) -> None:
        if (now - self._last_cleanup).total_seconds() < self.cleanup_interval_seconds:
            return

        cutoff = now - timedelta(seconds=self.window_seconds)
        keys_to_remove: List[str] = []

        for key, timestamps in self._requests.items():
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()
            if not timestamps:
                keys_to_remove.append(key)

        for key in keys_to_remove:
            del self._requests[key]

        self._last_cleanup = now

    def allow(self, key: str) -> bool:
        now = utcnow()
        cutoff = now - timedelta(seconds=self.window_seconds)

        with self._lock:
            self._cleanup_if_due(now)
            timestamps = self._requests[key]

            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()

            if len(timestamps) >= self.max_requests:
                return False

            timestamps.append(now)
            return True


class RateLimiter:
    """Sliding-window rate limiter backed by Redis, with in-memory fallback.

    When Redis is configured and reachable, the window state is stored in a
    Redis sorted set so the limit is enforced globally across all workers and
    instances. If Redis is unconfigured or a check fails, it falls back to the
    bundled :class:`InMemoryRateLimiter` so requests are still limited per
    process rather than not at all.
    """

    def __init__(self, name: str, max_requests: int, window_seconds: int, cleanup_interval_seconds: int = 60):
        self.name = name
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._memory = InMemoryRateLimiter(
            max_requests=max_requests,
            window_seconds=window_seconds,
            cleanup_interval_seconds=cleanup_interval_seconds,
        )

    async def allow(self, key: str) -> bool:
        client = get_redis()
        if client is None:
            return self._memory.allow(key)

        redis_key = f"rl:{self.name}:{key}"
        now_ms = time.time() * 1000
        window_ms = self.window_seconds * 1000
        member = f"{now_ms}-{uuid.uuid4().hex}"

        try:
            async with client.pipeline(transaction=True) as pipe:
                pipe.zremrangebyscore(redis_key, 0, now_ms - window_ms)
                pipe.zadd(redis_key, {member: now_ms})
                pipe.zcard(redis_key)
                pipe.pexpire(redis_key, int(window_ms) + 1000)
                results = await pipe.execute()
            count = results[2]
            if count > self.max_requests:
                # Roll back our own marker so a rejected request does not keep
                # the window saturated for legitimate callers.
                await client.zrem(redis_key, member)
                return False
            return True
        except Exception as exc:
            logger.warning(
                "Redis rate-limit check failed for %s, falling back to in-memory: %s",
                self.name,
                exc,
            )
            return self._memory.allow(key)


def get_request_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if TRUST_PROXY_HEADERS and forwarded_for:
        return forwarded_for.split(",")[0].strip() or "unknown"
    return request.client.host if request.client else "unknown"


auth_rate_limiter = RateLimiter(
    name="auth",
    max_requests=AUTH_RATE_LIMIT_MAX_REQUESTS,
    window_seconds=AUTH_RATE_LIMIT_WINDOW_SECONDS,
    cleanup_interval_seconds=AUTH_RATE_LIMIT_CLEANUP_SECONDS,
)

qr_scan_ip_rate_limiter = RateLimiter(
    name="qr-ip",
    max_requests=QR_SCAN_RATE_LIMIT_IP_MAX_REQUESTS,
    window_seconds=QR_SCAN_RATE_LIMIT_IP_WINDOW_SECONDS,
    cleanup_interval_seconds=QR_SCAN_RATE_LIMIT_CLEANUP_SECONDS,
)

qr_scan_user_rate_limiter = RateLimiter(
    name="qr-user",
    max_requests=QR_SCAN_RATE_LIMIT_USER_MAX_REQUESTS,
    window_seconds=QR_SCAN_RATE_LIMIT_USER_WINDOW_SECONDS,
    cleanup_interval_seconds=QR_SCAN_RATE_LIMIT_CLEANUP_SECONDS,
)

qr_scan_parcel_rate_limiter = RateLimiter(
    name="qr-parcel",
    max_requests=QR_SCAN_RATE_LIMIT_PARCEL_MAX_REQUESTS,
    window_seconds=QR_SCAN_RATE_LIMIT_PARCEL_WINDOW_SECONDS,
    cleanup_interval_seconds=QR_SCAN_RATE_LIMIT_CLEANUP_SECONDS,
)


async def enforce_auth_rate_limit(request: Request):
    client_ip = get_request_client_ip(request)
    key = f"{request.url.path}:{client_ip}"
    if not await auth_rate_limiter.allow(key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
        )


async def enforce_qr_scan_rate_limit(request: Request, current_user: dict, parcel_id: str) -> None:
    client_ip = get_request_client_ip(request)
    user_id = str(current_user.get("_id", "unknown"))

    if not await qr_scan_ip_rate_limiter.allow(f"verify-qr:ip:{client_ip}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many QR scan attempts from this network. Please try again later.",
        )

    if not await qr_scan_user_rate_limiter.allow(f"verify-qr:user:{user_id}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many QR scan attempts for this account. Please wait and try again.",
        )

    if not await qr_scan_parcel_rate_limiter.allow(f"verify-qr:parcel:{parcel_id}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many QR scan attempts for this parcel. Please wait and try again.",
        )
