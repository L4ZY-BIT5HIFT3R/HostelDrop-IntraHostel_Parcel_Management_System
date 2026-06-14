"""Environment-driven configuration, constants, enums, and validation patterns.

This module reads and validates environment variables at import time. The test
harness re-executes ``backend/server.py`` (which forces a fresh import of this
package) with mutated environment variables, so the production guardrails below
must run on every import.
"""
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path as FsPath

from dotenv import load_dotenv


def utcnow() -> datetime:
    """Naive UTC ``now`` to match Motor's naive datetimes from MongoDB.

    Replaces the deprecated ``datetime.utcnow()`` (removed-path in 3.12+) while
    preserving identical naive-UTC semantics, so existing ``stored < utcnow()``
    comparisons against values read back from Mongo keep working.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def utc_from_timestamp(value: float) -> datetime:
    """Naive UTC datetime from a POSIX timestamp (replaces datetime.utcfromtimestamp)."""
    return datetime.fromtimestamp(value, tz=timezone.utc).replace(tzinfo=None)

# Configure logging early so startup config warnings are visible.
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("hosteldrop")

# backend/core/config.py -> backend/
ROOT_DIR = FsPath(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / '.env')

# Environment settings
APP_ENV = os.environ.get("APP_ENV", "production").strip().lower()
if APP_ENV not in {"production", "development", "test"}:
    raise RuntimeError("APP_ENV must be one of: production, development, test")
IS_PRODUCTION = APP_ENV == "production"
MIN_PASSWORD_LENGTH = max(8, int(os.environ.get("MIN_PASSWORD_LENGTH", "8")))
MIN_JWT_SECRET_LENGTH = max(16, int(os.environ.get("MIN_JWT_SECRET_LENGTH", "32")))

# Database
MONGO_URL = os.environ['MONGO_URL']
PRIMARY_DB_NAME = os.environ['DB_NAME']
LEFT_USERS_DB_NAME = os.environ.get('LEFT_USERS_DB_NAME', f"{PRIMARY_DB_NAME}_left_users")

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise RuntimeError("JWT_SECRET_KEY must be set in production")
    raise RuntimeError("JWT_SECRET_KEY must be set in non-production environments as well")
if len(SECRET_KEY) < MIN_JWT_SECRET_LENGTH:
    if IS_PRODUCTION:
        raise RuntimeError(f"JWT_SECRET_KEY must be at least {MIN_JWT_SECRET_LENGTH} characters in production")
    logger.warning("JWT_SECRET_KEY is shorter than %s characters", MIN_JWT_SECRET_LENGTH)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

ENABLE_SENSITIVE_LOGGING = os.environ.get("ENABLE_SENSITIVE_LOGGING", "false").strip().lower() == "true"
INCLUDE_DEBUG_OTP_IN_RESPONSE = os.environ.get(
    "INCLUDE_DEBUG_OTP_IN_RESPONSE",
    "false"
).strip().lower() == "true"
if IS_PRODUCTION and INCLUDE_DEBUG_OTP_IN_RESPONSE:
    raise RuntimeError("INCLUDE_DEBUG_OTP_IN_RESPONSE cannot be enabled in production")
if IS_PRODUCTION and ENABLE_SENSITIVE_LOGGING:
    raise RuntimeError("ENABLE_SENSITIVE_LOGGING cannot be enabled in production")

TRUST_PROXY_HEADERS = os.environ.get("TRUST_PROXY_HEADERS", "false").strip().lower() == "true"
ENFORCE_STUDENT_EMAIL_DOMAIN = os.environ.get("ENFORCE_STUDENT_EMAIL_DOMAIN", "true").strip().lower() == "true"
STUDENT_EMAIL_DOMAIN = os.environ.get("STUDENT_EMAIL_DOMAIN", "iiitg.ac.in").strip().lower()

# SMTP (Gmail App Password)
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_APP_PASSWORD = os.environ.get('SMTP_APP_PASSWORD', '')

# Admin bootstrap credentials
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@hostel.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')
if not ADMIN_PASSWORD:
    if IS_PRODUCTION:
        raise RuntimeError("ADMIN_PASSWORD must be set in production")
    raise RuntimeError("ADMIN_PASSWORD must be set in non-production environments as well")
if len(ADMIN_PASSWORD) < MIN_PASSWORD_LENGTH:
    if IS_PRODUCTION:
        raise RuntimeError(f"ADMIN_PASSWORD must be at least {MIN_PASSWORD_LENGTH} characters in production")
    logger.warning("ADMIN_PASSWORD is shorter than %s characters", MIN_PASSWORD_LENGTH)

# Background cleanup / token TTLs
AUTO_DELETE_DELIVERED_INTERVAL_SECONDS = max(
    1,
    int(os.environ.get("AUTO_DELETE_DELIVERED_INTERVAL_SECONDS", "604800"))
)
AUTO_DELETE_DELIVERED_POLL_SECONDS = max(
    1,
    int(os.environ.get("AUTO_DELETE_DELIVERED_POLL_SECONDS", "1"))
)
QR_PICKUP_TOKEN_TTL_SECONDS = max(
    30,
    int(os.environ.get("QR_PICKUP_TOKEN_TTL_SECONDS", "300"))
)

IST_TIMEZONE = timezone(timedelta(hours=5, minutes=30))

ROOM_CHANGE_REQUEST_DAILY_LIMIT = max(
    1,
    int(os.environ.get("ROOM_CHANGE_REQUEST_DAILY_LIMIT", "50"))
)
STUDENT_NOTIFICATION_TTL_SECONDS = max(
    60,
    int(os.environ.get("STUDENT_NOTIFICATION_TTL_SECONDS", str(5 * 24 * 60 * 60)))
)
LEFT_STUDENT_RETENTION_DAYS = max(
    1,
    int(os.environ.get("LEFT_STUDENT_RETENTION_DAYS", "14"))
)

# Rate limiter tuning
AUTH_RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("AUTH_RATE_LIMIT_MAX_REQUESTS", "5"))
AUTH_RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("AUTH_RATE_LIMIT_WINDOW_SECONDS", "60"))
AUTH_RATE_LIMIT_CLEANUP_SECONDS = int(os.environ.get("AUTH_RATE_LIMIT_CLEANUP_SECONDS", "60"))
QR_SCAN_RATE_LIMIT_IP_MAX_REQUESTS = int(os.environ.get("QR_SCAN_RATE_LIMIT_IP_MAX_REQUESTS", "30"))
QR_SCAN_RATE_LIMIT_IP_WINDOW_SECONDS = int(os.environ.get("QR_SCAN_RATE_LIMIT_IP_WINDOW_SECONDS", "60"))
QR_SCAN_RATE_LIMIT_USER_MAX_REQUESTS = int(os.environ.get("QR_SCAN_RATE_LIMIT_USER_MAX_REQUESTS", "12"))
QR_SCAN_RATE_LIMIT_USER_WINDOW_SECONDS = int(os.environ.get("QR_SCAN_RATE_LIMIT_USER_WINDOW_SECONDS", "60"))
QR_SCAN_RATE_LIMIT_PARCEL_MAX_REQUESTS = int(os.environ.get("QR_SCAN_RATE_LIMIT_PARCEL_MAX_REQUESTS", "20"))
QR_SCAN_RATE_LIMIT_PARCEL_WINDOW_SECONDS = int(os.environ.get("QR_SCAN_RATE_LIMIT_PARCEL_WINDOW_SECONDS", "60"))
QR_SCAN_RATE_LIMIT_CLEANUP_SECONDS = int(os.environ.get("QR_SCAN_RATE_LIMIT_CLEANUP_SECONDS", "60"))

# Request-size controls
MAX_REQUEST_BODY_BYTES = max(1024, int(os.environ.get("MAX_REQUEST_BODY_BYTES", "32768")))
MAX_QUERY_STRING_BYTES = max(128, int(os.environ.get("MAX_QUERY_STRING_BYTES", "2048")))
MAX_STRING_FIELD_LENGTH = 512

# Collection names
TOKEN_REVOCATIONS_COLLECTION = "token_revocations"
ROOM_CHANGE_REQUESTS_COLLECTION = "room_change_requests"
ROOM_CHANGE_DAILY_COUNTER_COLLECTION = "room_change_request_daily_counters"
STUDENT_NOTIFICATIONS_COLLECTION = "student_notifications"
LEFT_STUDENTS_ARCHIVE_COLLECTION = "left_students_archive"


# ============= Enums =============

class UserRole:
    GUARD = "GUARD"
    STUDENT = "STUDENT"
    ADMIN = "ADMIN"


class HostelType:
    BOYS = "BOYS"
    GIRLS = "GIRLS"


class ParcelStatus:
    PENDING = "PENDING"
    UNASSIGNED = "UNASSIGNED"
    DELIVERED = "DELIVERED"


class RoomAssignmentStatus:
    ACTIVE = "ACTIVE"
    TRANSFERRED = "TRANSFERRED"
    LEFT_HOSTEL = "LEFT_HOSTEL"


class ParcelTimelineEvent:
    LOGGED = "LOGGED"
    ASSIGNED = "ASSIGNED"
    OTP_SENT = "OTP_SENT"
    DELIVERED = "DELIVERED"


class OTPPurpose:
    STUDENT_LOGIN = "STUDENT_LOGIN"
    STUDENT_REGISTRATION = "STUDENT_REGISTRATION"
    PARCEL_DELIVERY = "PARCEL_DELIVERY"
    PASSWORD_RESET = "PASSWORD_RESET"


HOSTEL_TYPE_VALUES = {HostelType.BOYS, HostelType.GIRLS}
USER_ROLE_VALUES = {UserRole.GUARD, UserRole.STUDENT, UserRole.ADMIN}
PARCEL_STATUS_VALUES = {ParcelStatus.PENDING, ParcelStatus.UNASSIGNED, ParcelStatus.DELIVERED}

# ============= Validation patterns =============
CONTROL_CHARS_PATTERN = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]")
OBJECT_ID_PATTERN = re.compile(r"^[0-9a-fA-F]{24}$")
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{3,64}$")
ROLL_NUMBER_PATTERN = re.compile(r"^[A-Za-z0-9-]{2,32}$")
ROOM_NUMBER_PATTERN = re.compile(r"^[A-Za-z0-9-]{1,16}$")
OTP_PATTERN = re.compile(r"^\d{6}$")
CONTACT_NUMBER_PATTERN = re.compile(r"^\+?[0-9]{7,15}$")
DELEGATION_CODE_PATTERN = re.compile(r"^[A-Z0-9]{6}$")
EXPO_TOKEN_PATTERN = re.compile(r"^(Expo|Exponent)PushToken\[[^\]]{8,200}\]$")
