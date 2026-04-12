import asyncio
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, Request, Query as ApiQuery, Path as ApiPath
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path as FsPath
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator, model_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta, timezone
import random
import string
import re
import secrets
import jwt
import hashlib
import hmac
from passlib.context import CryptContext
from bson import ObjectId
from bson.errors import InvalidId
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
# OAuth2 imports commented out — using SMTP App Password instead
# import google.auth.transport.requests
# from google.oauth2.credentials import Credentials
# from googleapiclient.discovery import build
import base64
import httpx
from collections import defaultdict
from collections import deque
import threading

# Configure logging early so startup config warnings are visible.
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = FsPath(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Environment settings
APP_ENV = os.environ.get("APP_ENV", "production").strip().lower()
if APP_ENV not in {"production", "development", "test"}:
    raise RuntimeError("APP_ENV must be one of: production, development, test")
IS_PRODUCTION = APP_ENV == "production"
MIN_PASSWORD_LENGTH = max(8, int(os.environ.get("MIN_PASSWORD_LENGTH", "8")))
MIN_JWT_SECRET_LENGTH = max(16, int(os.environ.get("MIN_JWT_SECRET_LENGTH", "32")))

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

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Hostel Parcel Management System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
TOKEN_REVOCATIONS_COLLECTION = "token_revocations"


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

# Gmail SMTP Configuration (App Password)
# Set these in backend/.env:
#   SMTP_EMAIL=your-gmail@gmail.com
#   SMTP_APP_PASSWORD=abcdefghijklmnop
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_APP_PASSWORD = os.environ.get('SMTP_APP_PASSWORD', '')

# OAuth2 config commented out — using SMTP instead
# GMAIL_CLIENT_ID = os.environ.get('GMAIL_CLIENT_ID', '')
# GMAIL_CLIENT_SECRET = os.environ.get('GMAIL_CLIENT_SECRET', '')
# GMAIL_REFRESH_TOKEN = os.environ.get('GMAIL_REFRESH_TOKEN', '')
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

AUTO_DELETE_DELIVERED_INTERVAL_SECONDS = max(
    1,
    int(os.environ.get("AUTO_DELETE_DELIVERED_INTERVAL_SECONDS", "604800"))
)
AUTO_DELETE_DELIVERED_POLL_SECONDS = max(
    1,
    int(os.environ.get("AUTO_DELETE_DELIVERED_POLL_SECONDS", "1"))
)
AUTO_DELETE_STATE = {
    "last_run_at": None,
    "last_deleted_count": 0,
}
auto_delete_task: Optional[asyncio.Task] = None

# ============= Models =============

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

# Input sanitization and request-size controls
MAX_REQUEST_BODY_BYTES = max(1024, int(os.environ.get("MAX_REQUEST_BODY_BYTES", "32768")))
MAX_QUERY_STRING_BYTES = max(128, int(os.environ.get("MAX_QUERY_STRING_BYTES", "2048")))
MAX_STRING_FIELD_LENGTH = 512

HOSTEL_TYPE_VALUES = {HostelType.BOYS, HostelType.GIRLS}
USER_ROLE_VALUES = {UserRole.GUARD, UserRole.STUDENT, UserRole.ADMIN}
PARCEL_STATUS_VALUES = {ParcelStatus.PENDING, ParcelStatus.UNASSIGNED, ParcelStatus.DELIVERED}

CONTROL_CHARS_PATTERN = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]")
OBJECT_ID_PATTERN = re.compile(r"^[0-9a-fA-F]{24}$")
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{3,64}$")
ROLL_NUMBER_PATTERN = re.compile(r"^[A-Za-z0-9-]{2,32}$")
ROOM_NUMBER_PATTERN = re.compile(r"^[A-Za-z0-9-]{1,16}$")
OTP_PATTERN = re.compile(r"^\d{6}$")
CONTACT_NUMBER_PATTERN = re.compile(r"^\+?[0-9]{7,15}$")
DELEGATION_CODE_PATTERN = re.compile(r"^[A-Z0-9]{6}$")
EXPO_TOKEN_PATTERN = re.compile(r"^(Expo|Exponent)PushToken\[[^\]]{8,200}\]$")


def _reject_control_chars(value: str, field_name: str) -> str:
    if CONTROL_CHARS_PATTERN.search(value):
        raise ValueError(f"{field_name} contains invalid control characters")
    return value


def _normalize_hostel_type(value: str) -> str:
    normalized = value.strip().upper()
    if normalized not in HOSTEL_TYPE_VALUES:
        raise ValueError("Invalid hostel type")
    return normalized


def _normalize_role(value: str) -> str:
    normalized = value.strip().upper()
    if normalized not in USER_ROLE_VALUES:
        raise ValueError("Invalid role")
    return normalized


def _normalize_status(value: str) -> str:
    normalized = value.strip().upper()
    if normalized not in PARCEL_STATUS_VALUES:
        raise ValueError("Invalid parcel status")
    return normalized


def _validate_password(value: str) -> str:
    _reject_control_chars(value, "password")
    if len(value) < MIN_PASSWORD_LENGTH or len(value) > 128:
        raise ValueError(f"Password must be between {MIN_PASSWORD_LENGTH} and 128 characters")
    return value


def _validate_object_id_string(value: str, field_name: str = "ID") -> str:
    cleaned = value.strip()
    if not OBJECT_ID_PATTERN.fullmatch(cleaned):
        raise ValueError(f"Invalid {field_name} format")
    return cleaned


def _validate_roll_number(value: str) -> str:
    cleaned = value.strip()
    if not ROLL_NUMBER_PATTERN.fullmatch(cleaned):
        raise ValueError("Roll number must be 2-32 characters and contain only letters, digits, or hyphens")
    return cleaned


def _validate_room_number(value: str) -> str:
    cleaned = value.strip()
    if not ROOM_NUMBER_PATTERN.fullmatch(cleaned):
        raise ValueError("Room number must be 1-16 characters and contain only letters, digits, or hyphens")
    return cleaned


def _validate_name(value: str, field_name: str = "Name") -> str:
    cleaned = value.strip()
    _reject_control_chars(cleaned, field_name)
    if len(cleaned) < 2 or len(cleaned) > 80:
        raise ValueError(f"{field_name} must be between 2 and 80 characters")
    if not any(ch.isalnum() for ch in cleaned):
        raise ValueError(f"{field_name} is malformed")
    return cleaned


def _validate_description(value: str) -> str:
    cleaned = value.strip()
    _reject_control_chars(cleaned, "description")
    if len(cleaned) > 300:
        raise ValueError("Description cannot exceed 300 characters")
    return cleaned


def _validate_reason(value: str) -> str:
    cleaned = _validate_description(value)
    if not cleaned:
        raise ValueError("Reason is required")
    return cleaned


def _validate_optional_contact_number(value: str) -> str:
    cleaned = value.strip()
    if not CONTACT_NUMBER_PATTERN.fullmatch(cleaned):
        raise ValueError("Contact number must be 7-15 digits, optionally prefixed with +")
    return cleaned


def _validate_username(value: str) -> str:
    cleaned = value.strip()
    if not USERNAME_PATTERN.fullmatch(cleaned):
        raise ValueError("Username must be 3-64 characters and contain only letters, digits, ., _, or -")
    return cleaned


def _validate_student_email(value: str) -> str:
    cleaned = value.strip().lower()
    if ENFORCE_STUDENT_EMAIL_DOMAIN and STUDENT_EMAIL_DOMAIN:
        domain = cleaned.rsplit("@", 1)[-1] if "@" in cleaned else ""
        if domain != STUDENT_EMAIL_DOMAIN:
            raise ValueError(f"Student email must use @{STUDENT_EMAIL_DOMAIN}")
    return cleaned


def _validate_otp(value: str) -> str:
    cleaned = value.strip()
    if not OTP_PATTERN.fullmatch(cleaned):
        raise ValueError("OTP must be exactly 6 digits")
    return cleaned


def _validate_qr_token(value: str) -> str:
    cleaned = value.strip()
    _reject_control_chars(cleaned, "token")
    if len(cleaned) > 128:
        raise ValueError("QR token exceeds maximum length")
    try:
        uuid.UUID(cleaned)
    except ValueError as exc:
        raise ValueError("Invalid QR token format") from exc
    return cleaned


class SanitizedRequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @field_validator("*", mode="before")
    @classmethod
    def validate_raw_string_fields(cls, value):
        if isinstance(value, str):
            if len(value) > MAX_STRING_FIELD_LENGTH:
                raise ValueError("Input field exceeds maximum allowed length")
            _reject_control_chars(value, "input")
        return value


# Request Models
class GuardLoginRequest(SanitizedRequestModel):
    username: str
    password: str
    hostel_type: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return _validate_username(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password(value)

    @field_validator("hostel_type")
    @classmethod
    def validate_hostel_type(cls, value: str) -> str:
        return _normalize_hostel_type(value)


class StudentRegisterRequest(SanitizedRequestModel):
    roll_number: str
    email: EmailStr
    hostel_type: str

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, value: str) -> str:
        return _validate_roll_number(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: EmailStr) -> str:
        return _validate_student_email(str(value))

    @field_validator("hostel_type")
    @classmethod
    def validate_hostel_type(cls, value: str) -> str:
        return _normalize_hostel_type(value)


class StudentRegisterVerify(SanitizedRequestModel):
    name: str
    roll_number: str
    email: EmailStr
    hostel_type: str
    room_number: str
    contact_number: Optional[str] = None
    password: str
    otp_code: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _validate_name(value, "Name")

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, value: str) -> str:
        return _validate_roll_number(value)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: EmailStr) -> str:
        return _validate_student_email(str(value))

    @field_validator("hostel_type")
    @classmethod
    def validate_hostel_type(cls, value: str) -> str:
        return _normalize_hostel_type(value)

    @field_validator("room_number")
    @classmethod
    def validate_room_number(cls, value: str) -> str:
        return _validate_room_number(value)

    @field_validator("contact_number")
    @classmethod
    def validate_contact_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        return _validate_optional_contact_number(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password(value)

    @field_validator("otp_code")
    @classmethod
    def validate_otp_code(cls, value: str) -> str:
        return _validate_otp(value)


class StudentLoginRequest(SanitizedRequestModel):
    roll_number: str
    password: str
    hostel_type: str

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, value: str) -> str:
        return _validate_roll_number(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password(value)

    @field_validator("hostel_type")
    @classmethod
    def validate_hostel_type(cls, value: str) -> str:
        return _normalize_hostel_type(value)


class AdminLoginRequest(SanitizedRequestModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password(value)


class AddUserRequest(SanitizedRequestModel):
    name: str
    role: str
    hostel_type: str
    username: Optional[str] = None
    password: Optional[str] = None
    roll_number: Optional[str] = None
    email: Optional[EmailStr] = None
    room_number: Optional[str] = None
    contact_number: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _validate_name(value, "Name")

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        return _normalize_role(value)

    @field_validator("hostel_type")
    @classmethod
    def validate_hostel_type(cls, value: str) -> str:
        return _normalize_hostel_type(value)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        return _validate_username(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        return _validate_password(value)

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        return _validate_roll_number(value)

    @field_validator("room_number")
    @classmethod
    def validate_room_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        return _validate_room_number(value)

    @field_validator("contact_number")
    @classmethod
    def validate_contact_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        return _validate_optional_contact_number(value)

    @model_validator(mode="after")
    def validate_role_specific_fields(self):
        if self.role == UserRole.GUARD and (not self.username or not self.password):
            raise ValueError("Username and password required for guards")
        if self.role == UserRole.STUDENT and (not self.roll_number or not self.email or not self.room_number):
            raise ValueError("Roll number, email, and room number required for students")
        return self


class TransferStudentRoomRequest(SanitizedRequestModel):
    roll_number: str
    hostel_type: str
    new_room_number: str
    reason: str

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, value: str) -> str:
        return _validate_roll_number(value)

    @field_validator("hostel_type")
    @classmethod
    def validate_hostel_type(cls, value: str) -> str:
        return _normalize_hostel_type(value)

    @field_validator("new_room_number")
    @classmethod
    def validate_new_room_number(cls, value: str) -> str:
        return _validate_room_number(value)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        return _validate_reason(value)


class DeactivateStudentRequest(SanitizedRequestModel):
    roll_number: str
    hostel_type: str
    reason: str

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, value: str) -> str:
        return _validate_roll_number(value)

    @field_validator("hostel_type")
    @classmethod
    def validate_hostel_type(cls, value: str) -> str:
        return _normalize_hostel_type(value)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        return _validate_reason(value)


class AddParcelRequest(SanitizedRequestModel):
    hostel_type: str
    room_number: str
    roll_number: Optional[str] = None
    student_name: Optional[str] = None
    description: Optional[str] = None

    @field_validator("hostel_type")
    @classmethod
    def validate_hostel_type(cls, value: str) -> str:
        return _normalize_hostel_type(value)

    @field_validator("room_number")
    @classmethod
    def validate_room_number(cls, value: str) -> str:
        return _validate_room_number(value)

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None
        return _validate_roll_number(value)

    @field_validator("student_name")
    @classmethod
    def validate_student_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if cleaned == "":
            return None
        return _validate_name(cleaned, "Student name")

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = _validate_description(value)
        return cleaned or None


class AssignParcelRequest(SanitizedRequestModel):
    parcel_id: str
    roll_number: str
    hostel_type: str
    room_number: str

    @field_validator("parcel_id")
    @classmethod
    def validate_parcel_id(cls, value: str) -> str:
        return _validate_object_id_string(value, "parcel ID")

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, value: str) -> str:
        return _validate_roll_number(value)

    @field_validator("hostel_type")
    @classmethod
    def validate_hostel_type(cls, value: str) -> str:
        return _normalize_hostel_type(value)

    @field_validator("room_number")
    @classmethod
    def validate_room_number(cls, value: str) -> str:
        return _validate_room_number(value)


class UpdateParcelRequest(SanitizedRequestModel):
    parcel_id: str
    room_number: Optional[str] = None
    roll_number: Optional[str] = None
    student_name: Optional[str] = None
    description: Optional[str] = None

    @field_validator("parcel_id")
    @classmethod
    def validate_parcel_id(cls, value: str) -> str:
        return _validate_object_id_string(value, "parcel ID")

    @field_validator("room_number")
    @classmethod
    def validate_room_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if cleaned == "":
            return ""
        return _validate_room_number(cleaned)

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if cleaned == "":
            return ""
        return _validate_roll_number(cleaned)

    @field_validator("student_name")
    @classmethod
    def validate_student_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        if cleaned == "":
            return ""
        return _validate_name(cleaned, "Student name")

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = _validate_description(value)
        return cleaned


class SendOTPRequest(SanitizedRequestModel):
    parcel_id: str

    @field_validator("parcel_id")
    @classmethod
    def validate_parcel_id(cls, value: str) -> str:
        return _validate_object_id_string(value, "parcel ID")


class VerifyParcelOTPRequest(SanitizedRequestModel):
    parcel_id: str
    otp_code: str

    @field_validator("parcel_id")
    @classmethod
    def validate_parcel_id(cls, value: str) -> str:
        return _validate_object_id_string(value, "parcel ID")

    @field_validator("otp_code")
    @classmethod
    def validate_otp_code(cls, value: str) -> str:
        return _validate_otp(value)


class UpdateExpoTokenRequest(SanitizedRequestModel):
    expo_push_token: str

    @field_validator("expo_push_token")
    @classmethod
    def validate_expo_push_token(cls, value: str) -> str:
        cleaned = value.strip()
        if not EXPO_TOKEN_PATTERN.fullmatch(cleaned):
            raise ValueError("Invalid Expo push token format")
        return cleaned


class ForgotPasswordRequest(SanitizedRequestModel):
    roll_number: str
    hostel_type: str

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, value: str) -> str:
        return _validate_roll_number(value)

    @field_validator("hostel_type")
    @classmethod
    def validate_hostel_type(cls, value: str) -> str:
        return _normalize_hostel_type(value)


class ResetPasswordVerify(SanitizedRequestModel):
    roll_number: str
    hostel_type: str
    otp_code: str
    new_password: str

    @field_validator("roll_number")
    @classmethod
    def validate_roll_number(cls, value: str) -> str:
        return _validate_roll_number(value)

    @field_validator("hostel_type")
    @classmethod
    def validate_hostel_type(cls, value: str) -> str:
        return _normalize_hostel_type(value)

    @field_validator("otp_code")
    @classmethod
    def validate_otp_code(cls, value: str) -> str:
        return _validate_otp(value)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return _validate_password(value)


class ChangePasswordRequest(SanitizedRequestModel):
    current_password: str
    new_password: str

    @field_validator("current_password", "new_password")
    @classmethod
    def validate_passwords(cls, value: str) -> str:
        return _validate_password(value)


# ============= QR Code Pickup Models =============

class GenerateQRRequest(SanitizedRequestModel):
    """Guard requests a one-time QR pickup token for a PENDING parcel."""
    parcel_id: str

    @field_validator("parcel_id")
    @classmethod
    def validate_parcel_id(cls, value: str) -> str:
        return _validate_object_id_string(value, "parcel ID")


class GenerateDelegationRequest(SanitizedRequestModel):
    """Student generates a delegation code for a friend."""
    parcel_id: str

    @field_validator("parcel_id")
    @classmethod
    def validate_parcel_id(cls, value: str) -> str:
        return _validate_object_id_string(value, "parcel ID")


class VerifyQRRequest(SanitizedRequestModel):
    """Student submits scanned QR payload to verify and collect their parcel."""
    parcel_id: str
    token: str
    delegation_code: Optional[str] = None

    @field_validator("parcel_id")
    @classmethod
    def validate_parcel_id(cls, value: str) -> str:
        return _validate_object_id_string(value, "parcel ID")

    @field_validator("token")
    @classmethod
    def validate_token(cls, value: str) -> str:
        return _validate_qr_token(value)

    @field_validator("delegation_code")
    @classmethod
    def validate_delegation_code(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().upper()
        if normalized == "":
            return None
        if not DELEGATION_CODE_PATTERN.fullmatch(normalized):
            raise ValueError("Delegation code must be exactly 6 alphanumeric characters")
        return normalized

# Response Models
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class ParcelResponse(BaseModel):
    id: str
    display_id: Optional[str] = None
    hostel_type: str
    room_number: str
    status: str
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    delivered_at: Optional[datetime] = None

# ============= Helper Functions =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def generate_qr_token() -> str:
    """Generate a secure random token for QR code pickup."""
    return str(uuid.uuid4())

def hash_secret_value(secret_value: str) -> str:
    material = f"{SECRET_KEY}:{secret_value}".encode("utf-8")
    return hashlib.sha256(material).hexdigest()

def secret_matches(stored_hash: Optional[str], candidate_value: str) -> bool:
    if not stored_hash:
        return False
    computed = hash_secret_value(candidate_value)
    return hmac.compare_digest(stored_hash, computed)

def generate_display_id(description: Optional[str]) -> str:
    """Generate a human-readable parcel ID like PF1024 or PU0001"""
    prefix = "U"
    if description:
        desc_upper = description.upper()
        if "FLIPKART" in desc_upper: prefix = "F"
        elif "AMAZON" in desc_upper: prefix = "A"
        elif "MYNTRA" in desc_upper: prefix = "M"
        elif "BLINKIT" in desc_upper: prefix = "B"
        elif "SWIGGY" in desc_upper: prefix = "S"
        elif "ZOMATO" in desc_upper: prefix = "Z"
        else:
            alpha_chars = [c for c in desc_upper if c.isalpha()]
            if alpha_chars:
                prefix = alpha_chars[0]
            
    rand_num = "".join(random.choices(string.digits, k=4))
    return f"P{prefix}{rand_num}"

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def is_token_revoked(token: str, payload: dict) -> bool:
    checks: List[Dict[str, Any]] = [{"token_hash": hash_secret_value(token)}]
    token_jti = payload.get("jti")
    if isinstance(token_jti, str) and token_jti.strip():
        checks.append({"jti": token_jti.strip()})
    revoked = await db[TOKEN_REVOCATIONS_COLLECTION].find_one({
        "$or": checks,
        "expires_at": {"$gt": datetime.utcnow()},
    })
    return revoked is not None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if await is_token_revoked(token, payload):
        raise HTTPException(status_code=401, detail="Token has been revoked")
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    try:
        user_object_id = ObjectId(user_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"_id": user_object_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    require_active_account(user)
    user["_id"] = str(user["_id"])
    return user

def require_admin(user: dict):
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can access this endpoint")


def require_active_account(user: dict):
    if user.get("is_active") is False:
        raise HTTPException(status_code=401, detail="Account is inactive")


def validate_hostel_type(hostel_type: str):
    try:
        return _normalize_hostel_type(hostel_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

def validate_parcel_status(parcel_status: str):
    try:
        return _normalize_status(parcel_status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

def parse_object_id(raw_id: str, field_name: str) -> ObjectId:
    if not isinstance(raw_id, str):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format")
    cleaned = raw_id.strip()
    if len(cleaned) > 64:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format")
    if not OBJECT_ID_PATTERN.fullmatch(cleaned):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format")
    try:
        return ObjectId(cleaned)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format")

def generate_otp() -> str:
    return ''.join(secrets.choice(string.digits) for _ in range(6))


def build_delegated_receiver_info(user: dict) -> Dict[str, Any]:
    return {
        "student_id": str(user.get("_id", "")),
        "name": user.get("name"),
        "roll_number": user.get("roll_number"),
        "email": user.get("email"),
        "room_number": user.get("room_number"),
        "hostel_type": user.get("hostel_type"),
    }


def build_room_assignment_doc(
    student: Dict[str, Any],
    room_number: str,
    status: str,
    reason: str,
    actor: Optional[dict],
    started_at: Optional[datetime] = None,
    ended_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    now = datetime.utcnow()
    student_id = str(student["_id"])
    doc: Dict[str, Any] = {
        "student_id": student_id,
        "roll_number": student.get("roll_number"),
        "student_name": student.get("name"),
        "hostel_type": student.get("hostel_type"),
        "room_number": room_number,
        "status": status,
        "reason": reason,
        "is_active": status == RoomAssignmentStatus.ACTIVE,
        "created_at": now,
        "updated_at": now,
        "start_at": started_at or now,
        "end_at": ended_at,
    }
    if actor and actor.get("_id"):
        doc["changed_by_user_id"] = str(actor["_id"])
        doc["changed_by_role"] = actor.get("role")
    return doc


async def close_active_room_assignment(
    student_id: str,
    status: str,
    reason: str,
    actor: Optional[dict],
    ended_at: datetime,
) -> int:
    update_fields: Dict[str, Any] = {
        "is_active": False,
        "status": status,
        "reason": reason,
        "end_at": ended_at,
        "updated_at": ended_at,
    }
    if actor and actor.get("_id"):
        update_fields["changed_by_user_id"] = str(actor["_id"])
        update_fields["changed_by_role"] = actor.get("role")

    result = await db.room_assignments.update_many(
        {"student_id": student_id, "is_active": True},
        {"$set": update_fields},
    )
    return result.modified_count


async def seed_student_room_assignment(
    student: Dict[str, Any],
    actor: Optional[dict],
    reason: str,
) -> None:
    room_number = (student.get("room_number") or "").strip()
    if not room_number:
        return

    student_id = str(student["_id"])
    existing = await db.room_assignments.find_one(
        {"student_id": student_id, "is_active": True}
    )
    if existing:
        return

    assignment_doc = build_room_assignment_doc(
        student=student,
        room_number=room_number,
        status=RoomAssignmentStatus.ACTIVE,
        reason=reason,
        actor=actor,
    )
    await db.room_assignments.insert_one(assignment_doc)

class InMemoryRateLimiter:
    """Simple in-memory sliding-window rate limiter with periodic cleanup."""

    def __init__(self, max_requests: int, window_seconds: int, cleanup_interval_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.cleanup_interval_seconds = cleanup_interval_seconds
        self._requests: Dict[str, deque] = defaultdict(deque)
        self._last_cleanup = datetime.utcnow()
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
        now = datetime.utcnow()
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

auth_rate_limiter = InMemoryRateLimiter(
    max_requests=int(os.environ.get("AUTH_RATE_LIMIT_MAX_REQUESTS", "5")),
    window_seconds=int(os.environ.get("AUTH_RATE_LIMIT_WINDOW_SECONDS", "60")),
    cleanup_interval_seconds=int(os.environ.get("AUTH_RATE_LIMIT_CLEANUP_SECONDS", "60")),
)

async def enforce_auth_rate_limit(request: Request):
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if TRUST_PROXY_HEADERS and forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    key = f"{request.url.path}:{client_ip}"
    if not auth_rate_limiter.allow(key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
        )

def build_status_event(
    event: str,
    actor: Optional[dict] = None,
    timestamp: Optional[datetime] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    event_doc: Dict[str, Any] = {
        "event": event,
        "timestamp": timestamp or datetime.utcnow(),
    }
    if actor:
        if actor.get("_id"):
            event_doc["actor_id"] = str(actor["_id"])
        if actor.get("role"):
            event_doc["actor_role"] = actor["role"]
    if meta:
        event_doc["meta"] = meta
    return event_doc


def ensure_utc_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def serialize_datetime_utc(value: datetime) -> str:
    return ensure_utc_datetime(value).isoformat().replace("+00:00", "Z")


def normalize_datetime_values(value: Any) -> Any:
    if isinstance(value, datetime):
        return serialize_datetime_utc(value)
    if isinstance(value, dict):
        return {key: normalize_datetime_values(item) for key, item in value.items()}
    if isinstance(value, list):
        return [normalize_datetime_values(item) for item in value]
    return value

def ensure_status_history(parcel: Dict[str, Any]) -> List[Dict[str, Any]]:
    event_order = {
        ParcelTimelineEvent.LOGGED: 0,
        ParcelTimelineEvent.ASSIGNED: 1,
        ParcelTimelineEvent.OTP_SENT: 2,
        ParcelTimelineEvent.DELIVERED: 3,
    }

    history = parcel.get("status_history")
    normalized: List[Dict[str, Any]] = []

    if isinstance(history, list):
        for item in history:
            if not isinstance(item, dict):
                continue
            event_name = item.get("event")
            if not event_name:
                continue
            event_doc = dict(item)
            timestamp = event_doc.get("timestamp")
            if not isinstance(timestamp, datetime):
                if event_name == ParcelTimelineEvent.DELIVERED:
                    timestamp = parcel.get("delivered_at")
                elif event_name == ParcelTimelineEvent.OTP_SENT:
                    timestamp = parcel.get("otp_sent_at")
                elif event_name == ParcelTimelineEvent.ASSIGNED:
                    timestamp = parcel.get("assigned_at") or parcel.get("updated_at")
                else:
                    timestamp = parcel.get("created_at")
                event_doc["timestamp"] = timestamp or datetime.utcnow()
            normalized.append(event_doc)

    if not normalized:
        created_at = parcel.get("created_at")
        if created_at:
            normalized.append({
                "event": ParcelTimelineEvent.LOGGED,
                "timestamp": created_at,
            })

        should_show_assigned = (
            bool(parcel.get("roll_number"))
            or bool(parcel.get("student_id"))
            or parcel.get("status") in [ParcelStatus.PENDING, ParcelStatus.DELIVERED]
        )
        if should_show_assigned:
            assigned_at = parcel.get("assigned_at") or parcel.get("updated_at") or created_at
            if assigned_at:
                normalized.append({
                    "event": ParcelTimelineEvent.ASSIGNED,
                    "timestamp": assigned_at,
                })

        otp_sent_at = parcel.get("otp_sent_at")
        if otp_sent_at:
            normalized.append({
                "event": ParcelTimelineEvent.OTP_SENT,
                "timestamp": otp_sent_at,
            })

        delivered_at = parcel.get("delivered_at")
        if delivered_at:
            normalized.append({
                "event": ParcelTimelineEvent.DELIVERED,
                "timestamp": delivered_at,
            })

    normalized.sort(
        key=lambda evt: (
            evt.get("timestamp") if isinstance(evt.get("timestamp"), datetime) else datetime.min,
            event_order.get(evt.get("event"), 99),
        )
    )
    return normalized

def serialize_parcel(parcel: Dict[str, Any]) -> Dict[str, Any]:
    if parcel.get("_id") is not None:
        parcel["_id"] = str(parcel["_id"])
    parcel.pop("qr_pickup_token", None)
    parcel.pop("qr_pickup_token_hash", None)
    parcel.pop("delegation_code", None)
    parcel.pop("delegation_code_hash", None)
    parcel.pop("delegation_expiry", None)
    parcel["status_history"] = ensure_status_history(parcel)
    return normalize_datetime_values(parcel)

async def auto_link_parcels_for_student(student: Dict[str, Any]) -> int:
    """
    Backfill parcel ownership for students who register after parcels were logged with roll number.
    Maps parcels by (hostel_type + roll_number) when student_id is missing.
    """
    roll_number = (student.get("roll_number") or "").strip()
    hostel_type = student.get("hostel_type")
    student_id_raw = student.get("_id")
    student_email = (student.get("email") or "").strip()

    if not roll_number or not hostel_type or not student_id_raw:
        return 0

    student_id = str(student_id_raw)
    query = {
        "hostel_type": hostel_type,
        "roll_number": roll_number,
        "$or": [
            {"student_id": {"$exists": False}},
            {"student_id": None},
            {"student_id": ""},
        ],
    }

    set_fields: Dict[str, Any] = {"student_id": student_id}
    if student_email:
        set_fields["student_email"] = student_email

    result = await db.parcels.update_many(query, {"$set": set_fields})
    if result.modified_count:
        logger.info(
            "Auto-linked %s parcel(s) for roll %s in %s hostel",
            result.modified_count,
            roll_number,
            hostel_type,
        )
    return result.modified_count

def mask_email(email: str) -> str:
    if "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = "*" * len(local)
    else:
        masked_local = f"{local[0]}{'*' * (len(local) - 2)}{local[-1]}"
    return f"{masked_local}@{domain}"

def get_cors_origins() -> List[str]:
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    if IS_PRODUCTION:
        raise RuntimeError("CORS_ORIGINS must be set in production")

    logger.warning("CORS_ORIGINS not set. Allowing all origins in development.")
    return ["*"]

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
        # Check if SMTP credentials are configured
        if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
            if ENABLE_SENSITIVE_LOGGING:
                logger.info("SMTP not configured. OTP for %s: %s", email, otp_code)
            else:
                logger.info("SMTP not configured. Generated OTP for %s", mask_email(email))
            return True

        # Create email message
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

        # Send via Gmail SMTP (SSL on port 465)
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
        # For development, return True even if email fails
        return True

async def ensure_admin_user():
    existing = await db.users.find_one({"role": UserRole.ADMIN, "email": ADMIN_EMAIL})
    if existing:
        update_fields: Dict[str, Any] = {}
        current_hash = existing.get("password")
        if not current_hash or not verify_password(ADMIN_PASSWORD, current_hash):
            update_fields["password"] = hash_password(ADMIN_PASSWORD)
        if existing.get("is_active") is False:
            update_fields["is_active"] = True
        if update_fields:
            await db.users.update_one({"_id": existing["_id"]}, {"$set": update_fields})
            logger.info("Admin password updated from environment for %s", ADMIN_EMAIL)
        return

    admin_user = {
        "name": "Admin",
        "role": UserRole.ADMIN,
        "hostel_type": HostelType.BOYS,
        "email": ADMIN_EMAIL,
        "password": hash_password(ADMIN_PASSWORD),
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    await db.users.insert_one(admin_user)

async def send_parcel_notification(email: str, student_name: str, room_number: str):
    """Send notification email when parcel is logged"""
    try:
        # Check if SMTP credentials are configured
        if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
            logger.info("SMTP not configured. Notification queued for %s", mask_email(email))
            return True

        # Create email message
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

        # Send via Gmail SMTP (SSL on port 465)
        with smtplib.SMTP_SSL('smtp.gmail.com', 465, timeout=10) as server:
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.send_message(message)

        logger.info("Notification email sent to %s", mask_email(email))
        return True

    except Exception as e:
        logger.warning("Error sending notification email: %s", str(e))
        logger.info("Notification fallback recorded for %s", mask_email(email))
        return True

async def delete_delivered_parcels_by_query(query: dict) -> int:
    result = await db.parcels.delete_many(query)
    return result.deleted_count

async def get_auto_delete_status() -> dict:
    now = datetime.utcnow()
    oldest_delivered = await db.parcels.find_one(
        {
            "status": ParcelStatus.DELIVERED,
            "delivered_at": {"$exists": True, "$ne": None},
        },
        sort=[("delivered_at", 1)],
    )

    next_run_at = None
    remaining_seconds = AUTO_DELETE_DELIVERED_INTERVAL_SECONDS
    has_pending_cleanup = False

    if oldest_delivered and oldest_delivered.get("delivered_at"):
        has_pending_cleanup = True
        next_run_at = oldest_delivered["delivered_at"] + timedelta(
            seconds=AUTO_DELETE_DELIVERED_INTERVAL_SECONDS
        )
        remaining_seconds = max(0, int((next_run_at - now).total_seconds()))

    return {
        "enabled": True,
        "interval_seconds": AUTO_DELETE_DELIVERED_INTERVAL_SECONDS,
        "next_run_at": next_run_at.isoformat() + "Z" if next_run_at else None,
        "remaining_seconds": remaining_seconds,
        "has_pending_cleanup": has_pending_cleanup,
        "last_run_at": (
            AUTO_DELETE_STATE["last_run_at"].isoformat() + "Z"
            if AUTO_DELETE_STATE["last_run_at"] else None
        ),
        "last_deleted_count": AUTO_DELETE_STATE["last_deleted_count"],
    }

async def periodic_delivered_cleanup():
    while True:
        await asyncio.sleep(AUTO_DELETE_DELIVERED_POLL_SECONDS)
        try:
            cutoff = datetime.utcnow() - timedelta(seconds=AUTO_DELETE_DELIVERED_INTERVAL_SECONDS)
            deleted_count = await delete_delivered_parcels_by_query({
                "status": ParcelStatus.DELIVERED,
                "delivered_at": {"$lte": cutoff},
            })
            AUTO_DELETE_STATE["last_run_at"] = datetime.utcnow()
            AUTO_DELETE_STATE["last_deleted_count"] = deleted_count
            if deleted_count:
                logger.info(
                    "Auto-deleted %s delivered parcel(s) after retention expiry",
                    deleted_count,
                )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            AUTO_DELETE_STATE["last_run_at"] = datetime.utcnow()
            AUTO_DELETE_STATE["last_deleted_count"] = 0
            logger.warning("Automatic delivered parcel cleanup failed: %s", exc)

# ============= Routes =============

@api_router.get("/")
async def root():
    return {"message": "Hostel Parcel Management API", "version": "1.0"}

# ============= Authentication Routes =============

@api_router.post("/auth/guard/login", response_model=TokenResponse)
async def guard_login(request: GuardLoginRequest, _: None = Depends(enforce_auth_rate_limit)):
    """Guard login with username and password"""
    hostel_type = validate_hostel_type(request.hostel_type)
    user = await db.users.find_one({
        "username": request.username,
        "role": UserRole.GUARD,
        "hostel_type": hostel_type
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("is_active") is False:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({
        "user_id": str(user["_id"]),
        "role": user["role"],
        "hostel_type": hostel_type
    })
    
    user["_id"] = str(user["_id"])
    user.pop("password", None)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@api_router.post("/auth/admin/login", response_model=TokenResponse)
async def admin_login(request: AdminLoginRequest, _: None = Depends(enforce_auth_rate_limit)):
    """Admin login with email and password"""
    user = await db.users.find_one({
        "email": request.email,
        "role": UserRole.ADMIN
    })

    if not user or not user.get("password") or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("is_active") is False:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "user_id": str(user["_id"]),
        "role": user["role"],
        "hostel_type": user.get("hostel_type", HostelType.BOYS)
    })

    user["_id"] = str(user["_id"])
    user.pop("password", None)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@api_router.post("/auth/student/login", response_model=TokenResponse)
async def student_login(request: StudentLoginRequest, _: None = Depends(enforce_auth_rate_limit)):
    """Student login with roll number and password"""
    hostel_type = validate_hostel_type(request.hostel_type)
    
    user = await db.users.find_one({
        "roll_number": request.roll_number,
        "role": UserRole.STUDENT,
        "hostel_type": hostel_type
    })
    
    if not user or not user.get("password") or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("is_active") is False:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    try:
        await auto_link_parcels_for_student(user)
    except Exception as exc:
        logger.warning("Auto-link on student login failed: %s", exc)

    token = create_access_token({
        "user_id": str(user["_id"]),
        "role": user["role"],
        "hostel_type": hostel_type
    })
    
    user["_id"] = str(user["_id"])
    user.pop("password", None)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@api_router.post("/auth/logout")
async def logout_user(
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Revoke the active bearer token until its expiry."""
    token = credentials.credentials
    payload = verify_token(token)
    exp_value = payload.get("exp")
    if exp_value is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        expires_at = datetime.utcfromtimestamp(int(exp_value))
    except (TypeError, ValueError, OSError):
        raise HTTPException(status_code=401, detail="Invalid token")

    token_jti = payload.get("jti")
    selector: Dict[str, Any]
    revocation_doc: Dict[str, Any] = {
        "user_id": current_user.get("_id"),
        "expires_at": expires_at,
        "revoked_at": datetime.utcnow(),
    }
    if isinstance(token_jti, str) and token_jti.strip():
        selector = {"jti": token_jti.strip()}
        revocation_doc["jti"] = token_jti.strip()
    else:
        token_hash = hash_secret_value(token)
        selector = {"token_hash": token_hash}
        revocation_doc["token_hash"] = token_hash

    await db[TOKEN_REVOCATIONS_COLLECTION].update_one(
        selector,
        {"$set": revocation_doc},
        upsert=True,
    )
    return {"message": "Logged out successfully"}

@api_router.post("/auth/student/register/request-otp")
async def student_register_request_otp(
    request: StudentRegisterRequest,
    _: None = Depends(enforce_auth_rate_limit),
):
    """Request OTP for student self-registration"""
    hostel_type = validate_hostel_type(request.hostel_type)
    existing = await db.users.find_one({
        "$or": [
            {"roll_number": request.roll_number, "role": UserRole.STUDENT},
            {"email": request.email, "role": UserRole.STUDENT},
        ]
    })
    if existing:
        # Do not leak account existence
        return {"message": "If the details are valid, a registration OTP has been sent", "email": request.email}

    await db.otps.update_many({
        "email": request.email,
        "roll_number": request.roll_number,
        "hostel_type": hostel_type,
        "purpose": OTPPurpose.STUDENT_REGISTRATION,
        "is_used": False
    }, {"$set": {"is_used": True}, "$unset": {"otp_code": ""}})

    otp_code = generate_otp()
    expiry_time = datetime.utcnow() + timedelta(minutes=10)
    otp_doc = {
        "email": request.email,
        "roll_number": request.roll_number,
        "hostel_type": hostel_type,
        "purpose": OTPPurpose.STUDENT_REGISTRATION,
        "otp_code_hash": hash_secret_value(otp_code),
        "expiry_time": expiry_time,
        "is_used": False,
        "created_at": datetime.utcnow()
    }
    await db.otps.insert_one(otp_doc)
    await send_email_otp(request.email, otp_code)
    return {"message": "If the details are valid, a registration OTP has been sent", "email": request.email}

@api_router.post("/auth/student/register/verify-otp", response_model=TokenResponse)
async def student_register_verify_otp(
    request: StudentRegisterVerify,
    _: None = Depends(enforce_auth_rate_limit),
):
    """Verify OTP and create a new student account"""
    hostel_type = validate_hostel_type(request.hostel_type)
    existing = await db.users.find_one({
        "$or": [
            {"roll_number": request.roll_number, "role": UserRole.STUDENT},
            {"email": request.email, "role": UserRole.STUDENT},
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Registration could not be completed")

    otp_candidates = await db.otps.find({
        "email": request.email,
        "roll_number": request.roll_number,
        "hostel_type": hostel_type,
        "purpose": OTPPurpose.STUDENT_REGISTRATION,
        "is_used": False
    }).sort("created_at", -1).to_list(20)
    otp = next(
        (
            candidate for candidate in otp_candidates
            if secret_matches(candidate.get("otp_code_hash"), request.otp_code)
            or candidate.get("otp_code") == request.otp_code
        ),
        None,
    )
    if not otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    if otp["expiry_time"] < datetime.utcnow():
        raise HTTPException(status_code=401, detail="OTP has expired")

    await db.otps.update_one(
        {"_id": otp["_id"]},
        {"$set": {"is_used": True}, "$unset": {"otp_code": ""}}
    )

    student_doc = {
        "name": request.name.strip(),
        "role": UserRole.STUDENT,
        "hostel_type": hostel_type,
        "roll_number": request.roll_number,
        "email": request.email,
        "password": hash_password(request.password),
        "room_number": request.room_number,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    if request.contact_number:
        student_doc["contact_number"] = request.contact_number

    result = await db.users.insert_one(student_doc)
    student_doc["_id"] = str(result.inserted_id)

    try:
        await auto_link_parcels_for_student(student_doc)
    except Exception as exc:
        logger.warning("Auto-link after student registration failed: %s", exc)

    try:
        await seed_student_room_assignment(student_doc, actor=None, reason="Initial room assignment at registration")
    except Exception as exc:
        logger.warning("Failed to seed room assignment after student registration: %s", exc)

    token = create_access_token({
        "user_id": student_doc["_id"],
        "role": student_doc["role"],
        "hostel_type": student_doc["hostel_type"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": student_doc
    }

@api_router.put("/auth/student/expo-token")
async def update_expo_token(request: UpdateExpoTokenRequest, current_user: dict = Depends(get_current_user)):
    """Update the Expo push token for the logged-in student"""
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can update their push token")
    
    await db.users.update_one(
        {"_id": parse_object_id(current_user["_id"], "user ID")},
        {"$set": {"expoPushToken": request.expo_push_token}}
    )
    return {"message": "Push token updated successfully"}

# ============= Student Password Reset Routes =============

@api_router.post("/auth/student/forgot-password/request-otp")
async def student_forgot_password_request_otp(request: ForgotPasswordRequest, _: None = Depends(enforce_auth_rate_limit)):
    """Send OTP to student email for password reset"""
    hostel_type = validate_hostel_type(request.hostel_type)
    student = await db.users.find_one({
        "roll_number": request.roll_number,
        "role": UserRole.STUDENT,
        "hostel_type": hostel_type,
        "is_active": {"$ne": False},
    })
    if not student or not student.get("email"):
        # Do not leak account existence
        return {"message": "If an account exists, a password reset OTP has been sent"}

    # Invalidate previous unused password-reset OTPs
    await db.otps.update_many({
        "email": student["email"],
        "purpose": OTPPurpose.PASSWORD_RESET,
        "is_used": False
    }, {"$set": {"is_used": True}, "$unset": {"otp_code": ""}})

    otp_code = generate_otp()
    expiry_time = datetime.utcnow() + timedelta(minutes=10)
    otp_doc = {
        "email": student["email"],
        "purpose": OTPPurpose.PASSWORD_RESET,
        "otp_code_hash": hash_secret_value(otp_code),
        "expiry_time": expiry_time,
        "is_used": False,
        "created_at": datetime.utcnow()
    }
    await db.otps.insert_one(otp_doc)
    await send_email_otp(student["email"], otp_code)
    return {"message": "If an account exists, a password reset OTP has been sent", "email": mask_email(student["email"])}

@api_router.post("/auth/student/forgot-password/verify-otp")
async def student_forgot_password_verify_otp(request: ResetPasswordVerify, _: None = Depends(enforce_auth_rate_limit)):
    """Verify OTP and reset student password"""
    hostel_type = validate_hostel_type(request.hostel_type)
    student = await db.users.find_one({
        "roll_number": request.roll_number,
        "role": UserRole.STUDENT,
        "hostel_type": hostel_type,
        "is_active": {"$ne": False},
    })
    if not student or not student.get("email"):
        raise HTTPException(status_code=401, detail="Invalid OTP")

    otp_candidates = await db.otps.find({
        "email": student["email"],
        "purpose": OTPPurpose.PASSWORD_RESET,
        "is_used": False
    }).sort("created_at", -1).to_list(20)
    otp = next(
        (
            candidate for candidate in otp_candidates
            if secret_matches(candidate.get("otp_code_hash"), request.otp_code)
            or candidate.get("otp_code") == request.otp_code
        ),
        None,
    )
    if not otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    if otp["expiry_time"] < datetime.utcnow():
        raise HTTPException(status_code=401, detail="OTP has expired")

    # Mark OTP as used
    await db.otps.update_one(
        {"_id": otp["_id"]},
        {"$set": {"is_used": True}, "$unset": {"otp_code": ""}}
    )

    # Update password
    new_hashed = hash_password(request.new_password)
    await db.users.update_one(
        {"_id": student["_id"]},
        {"$set": {"password": new_hashed}}
    )

    return {"message": "Password reset successfully. You can now login with your new password."}

@api_router.put("/auth/student/change-password")
async def student_change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(enforce_auth_rate_limit),
):
    """Authenticated student changes their password using current password"""
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can use this endpoint")

    student = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if not student.get("password") or not verify_password(request.current_password, student["password"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    if len(request.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail=f"New password must be at least {MIN_PASSWORD_LENGTH} characters")

    new_hashed = hash_password(request.new_password)
    await db.users.update_one(
        {"_id": student["_id"]},
        {"$set": {"password": new_hashed}}
    )
    return {"message": "Password changed successfully"}

@api_router.get("/auth/student/profile")
async def student_profile(current_user: dict = Depends(get_current_user)):
    """Get the logged-in student's profile"""
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")

    student = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student["_id"] = str(student["_id"])
    student.pop("password", None)
    return {"student": student}

# ============= Admin Routes =============

@api_router.post("/admin/add-user")
async def add_user(request: AddUserRequest, current_user: dict = Depends(get_current_user)):
    """Admin endpoint to add guards or students"""
    require_admin(current_user)
    # Validate role
    if request.role not in [UserRole.GUARD, UserRole.STUDENT]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Validate hostel type
    hostel_type = validate_hostel_type(request.hostel_type)
    
    user_data = {
        "name": request.name,
        "role": request.role,
        "hostel_type": hostel_type,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    if request.role == UserRole.GUARD:
        if not request.username or not request.password:
            raise HTTPException(status_code=400, detail="Username and password required for guards")
        
        # Check if username already exists
        existing = await db.users.find_one({"username": request.username})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        user_data["username"] = request.username
        user_data["password"] = hash_password(request.password)
    
    elif request.role == UserRole.STUDENT:
        if not request.roll_number or not request.email or not request.room_number:
            raise HTTPException(status_code=400, detail="Roll number, email, and room number required for students")
        
        # Check if student already exists
        existing = await db.users.find_one({"roll_number": request.roll_number})
        if existing:
            raise HTTPException(status_code=400, detail="Student with this roll number already exists")
        
        user_data["roll_number"] = request.roll_number
        user_data["email"] = request.email
        user_data["room_number"] = request.room_number
        if request.contact_number:
            user_data["contact_number"] = request.contact_number
    
    result = await db.users.insert_one(user_data)
    user_data["_id"] = str(result.inserted_id)

    if request.role == UserRole.STUDENT:
        try:
            await auto_link_parcels_for_student(user_data)
        except Exception as exc:
            logger.warning("Auto-link after admin student creation failed: %s", exc)
        try:
            await seed_student_room_assignment(
                user_data,
                actor=current_user,
                reason="Initial room assignment via admin add-user",
            )
        except Exception as exc:
            logger.warning("Failed to seed room assignment via admin add-user: %s", exc)

    user_data.pop("password", None)
    
    return {"message": "User added successfully", "user": user_data}


@api_router.patch("/admin/student/room-transfer")
async def transfer_student_room(
    request: TransferStudentRoomRequest,
    current_user: dict = Depends(get_current_user),
):
    """Transfer an active student to a new room with audit history."""
    require_admin(current_user)
    hostel_type = validate_hostel_type(request.hostel_type)
    student = await db.users.find_one({
        "roll_number": request.roll_number,
        "role": UserRole.STUDENT,
        "hostel_type": hostel_type,
    })
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.get("is_active") is False:
        raise HTTPException(status_code=400, detail="Student account is inactive")

    current_room = (student.get("room_number") or "").strip()
    if current_room == request.new_room_number:
        raise HTTPException(status_code=400, detail="Student is already in this room")

    now = datetime.utcnow()
    student_id = str(student["_id"])
    if current_room:
        await close_active_room_assignment(
            student_id=student_id,
            status=RoomAssignmentStatus.TRANSFERRED,
            reason=request.reason,
            actor=current_user,
            ended_at=now,
        )

    assignment_doc = build_room_assignment_doc(
        student=student,
        room_number=request.new_room_number,
        status=RoomAssignmentStatus.ACTIVE,
        reason=request.reason,
        actor=current_user,
        started_at=now,
    )
    assignment_result = await db.room_assignments.insert_one(assignment_doc)

    await db.users.update_one(
        {"_id": student["_id"]},
        {
            "$set": {
                "room_number": request.new_room_number,
                "updated_at": now,
                "is_active": True,
            },
            "$unset": {
                "left_at": "",
                "left_reason": "",
            },
        },
    )

    updated_student = await db.users.find_one({"_id": student["_id"]})
    if not updated_student:
        raise HTTPException(status_code=500, detail="Failed to load updated student")
    updated_student["_id"] = str(updated_student["_id"])
    updated_student.pop("password", None)

    return {
        "message": "Student room updated successfully",
        "student": updated_student,
        "room_assignment": {
            "id": str(assignment_result.inserted_id),
            "room_number": request.new_room_number,
            "status": RoomAssignmentStatus.ACTIVE,
            "reason": request.reason,
            "start_at": now,
        },
    }


@api_router.patch("/admin/student/deactivate")
async def deactivate_student(
    request: DeactivateStudentRequest,
    current_user: dict = Depends(get_current_user),
):
    """Deactivate a student account after hostel exit and close active room assignment."""
    require_admin(current_user)
    hostel_type = validate_hostel_type(request.hostel_type)
    student = await db.users.find_one({
        "roll_number": request.roll_number,
        "role": UserRole.STUDENT,
        "hostel_type": hostel_type,
    })
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.get("is_active") is False:
        raise HTTPException(status_code=400, detail="Student is already inactive")

    student_id = str(student["_id"])
    pending_count = await db.parcels.count_documents({
        "student_id": student_id,
        "status": {"$in": [ParcelStatus.PENDING, ParcelStatus.UNASSIGNED]},
    })
    if pending_count > 0:
        raise HTTPException(
            status_code=409,
            detail="Student has pending parcels. Resolve them before deactivation.",
        )

    now = datetime.utcnow()
    await close_active_room_assignment(
        student_id=student_id,
        status=RoomAssignmentStatus.LEFT_HOSTEL,
        reason=request.reason,
        actor=current_user,
        ended_at=now,
    )

    await db.users.update_one(
        {"_id": student["_id"]},
        {
            "$set": {
                "is_active": False,
                "room_number": None,
                "left_at": now,
                "left_reason": request.reason,
                "updated_at": now,
                "expoPushToken": None,
            }
        },
    )

    student_email = (student.get("email") or "").strip()
    if student_email:
        await db.otps.update_many(
            {"email": student_email, "is_used": False},
            {"$set": {"is_used": True}},
        )

    return {
        "message": "Student deactivated successfully",
        "roll_number": request.roll_number,
        "hostel_type": hostel_type,
        "left_at": now,
    }


@api_router.get("/admin/student/room-history")
async def get_student_room_history(
    roll_number: str = ApiQuery(..., min_length=2, max_length=32),
    hostel_type: str = ApiQuery(..., min_length=4, max_length=8),
    current_user: dict = Depends(get_current_user),
):
    """Fetch room assignment history for a student."""
    require_admin(current_user)
    try:
        validated_roll = _validate_roll_number(roll_number)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    validated_hostel = validate_hostel_type(hostel_type)
    student = await db.users.find_one({
        "roll_number": validated_roll,
        "role": UserRole.STUDENT,
        "hostel_type": validated_hostel,
    })
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    assignments = await db.room_assignments.find(
        {"student_id": str(student["_id"])}
    ).sort("start_at", -1).to_list(200)
    for assignment in assignments:
        assignment["_id"] = str(assignment["_id"])

    return {
        "student": {
            "student_id": str(student["_id"]),
            "name": student.get("name"),
            "roll_number": student.get("roll_number"),
            "hostel_type": student.get("hostel_type"),
            "is_active": student.get("is_active", True),
            "room_number": student.get("room_number"),
        },
        "assignments": assignments,
    }


@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users (for admin)"""
    require_admin(current_user)
    users = await db.users.find().to_list(1000)
    for user in users:
        user["_id"] = str(user["_id"])
        user.pop("password", None)
    return {"users": users}

@api_router.get("/admin/parcels/delivered/summary")
async def get_delivered_summary(current_user: dict = Depends(get_current_user)):
    """Get delivered parcel counts by hostel"""
    require_admin(current_user)
    boys_count = await db.parcels.count_documents({
        "status": ParcelStatus.DELIVERED,
        "hostel_type": HostelType.BOYS
    })
    girls_count = await db.parcels.count_documents({
        "status": ParcelStatus.DELIVERED,
        "hostel_type": HostelType.GIRLS
    })
    return {
        "boys": boys_count,
        "girls": girls_count
    }

@api_router.get("/admin/parcels/delivered/auto-delete-status")
async def get_delivered_auto_delete_status(current_user: dict = Depends(get_current_user)):
    """Get the automatic delivered parcel cleanup countdown"""
    require_admin(current_user)
    return await get_auto_delete_status()

@api_router.delete("/admin/parcels/delivered")
async def delete_delivered_parcels(
    hostel_type: Optional[str] = ApiQuery(default=None, max_length=16),
    current_user: dict = Depends(get_current_user),
):
    """Delete delivered parcels (optionally scoped to a hostel type)"""
    require_admin(current_user)
    query = {"status": ParcelStatus.DELIVERED}
    if hostel_type:
        query["hostel_type"] = validate_hostel_type(hostel_type)

    deleted_count = await delete_delivered_parcels_by_query(query)
    return {
        "message": "Delivered parcels deleted successfully",
        "deleted_count": deleted_count,
    }

# ============= Parcel Routes =============

@api_router.post("/parcel/add")
async def add_parcel(request: AddParcelRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Guard adds a new parcel"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can add parcels")
    request_hostel_type = validate_hostel_type(request.hostel_type)
    if request_hostel_type != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Guards can only add parcels for their own hostel")
    
    created_at = datetime.utcnow()
    parcel_data = {
        "display_id": generate_display_id(request.description),
        "hostel_type": current_user["hostel_type"],
        "room_number": request.room_number,
        "description": request.description,
        "logged_by_guard": current_user["_id"],
        "created_at": created_at,
        "status_history": [
            build_status_event(
                ParcelTimelineEvent.LOGGED,
                actor=current_user,
                timestamp=created_at,
            )
        ],
    }
    
    if request.roll_number:
        # Find student by roll number
        student = await db.users.find_one({
            "roll_number": request.roll_number,
            "role": UserRole.STUDENT,
            "hostel_type": current_user["hostel_type"]
        })
        
        parcel_data["roll_number"] = request.roll_number
        parcel_data["student_name"] = request.student_name
        parcel_data["status"] = ParcelStatus.PENDING  # Always PENDING if roll number is provided
        parcel_data["assigned_at"] = created_at
        parcel_data["status_history"].append(
            build_status_event(
                ParcelTimelineEvent.ASSIGNED,
                actor=current_user,
                timestamp=created_at,
                meta={"roll_number": request.roll_number},
            )
        )
        
        if student:
            parcel_data["student_id"] = str(student["_id"])
            parcel_data["student_name"] = request.student_name or student["name"]
            parcel_data["student_email"] = student["email"]
    else:
        # Only UNASSIGNED if no roll number provided
        parcel_data["status"] = ParcelStatus.UNASSIGNED
        parcel_data["student_name"] = request.student_name
    
    result = await db.parcels.insert_one(parcel_data)
    parcel_data["_id"] = str(result.inserted_id)
    
    if request.roll_number:
        if student:
            # Send notification email to student in the background
            async def safe_send_notification(email, name, room, push_token, parcel_id):
                try:
                    await send_parcel_notification(email, name, room)
                except Exception as e:
                    logger.warning("Failed to send notification email (Background): %s", str(e))
                if push_token:
                    await send_expo_push_notification(
                        [push_token],
                        "📦 Parcel Arrived!",
                        "Your parcel is now at the reception.",
                        {"parcelId": str(parcel_id)}
                    )
                    
            background_tasks.add_task(safe_send_notification, student["email"], student["name"], request.room_number, student.get("expoPushToken"), parcel_data["_id"])
    else:
        # Broadcast to room
        async def broadcast_to_room(room_number, hostel_type, parcel_id):
            try:
                roommates = await db.users.find({
                    "room_number": room_number,
                    "hostel_type": hostel_type,
                    "role": UserRole.STUDENT
                }).to_list(100)
                tokens = [user.get("expoPushToken") for user in roommates if user.get("expoPushToken")]
                if tokens:
                    await send_expo_push_notification(
                        tokens,
                        "📦 Parcel Arrived!",
                        f"A package has arrived at reception for your room ({room_number}). If you are expecting a delivery, please collect it.",
                        {"parcelId": str(parcel_id)}
                    )
            except Exception as e:
                logger.warning("Failed to send broadcast push: %s", str(e))
        background_tasks.add_task(broadcast_to_room, request.room_number, current_user["hostel_type"], parcel_data["_id"])
    
    return {"message": "Parcel added successfully", "parcel": serialize_parcel(parcel_data)}

@api_router.put("/parcel/assign")
async def assign_parcel(request: AssignParcelRequest, current_user: dict = Depends(get_current_user)):
    """Guard assigns unassigned parcel to a student"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can assign parcels")
    request_hostel_type = validate_hostel_type(request.hostel_type)
    if request_hostel_type != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Guards can only assign parcels within their own hostel")
    parcel_object_id = parse_object_id(request.parcel_id, "parcel ID")
    parcel = await db.parcels.find_one({"_id": parcel_object_id})
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel not found with ID: {request.parcel_id}")
    if parcel.get("hostel_type") != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Parcel belongs to a different hostel")
    
    # Find student
    student = await db.users.find_one({
        "roll_number": request.roll_number,
        "role": UserRole.STUDENT,
        "hostel_type": current_user["hostel_type"]
    })
    
    if not student:
        raise HTTPException(status_code=404, detail=f"Student not found with roll number: {request.roll_number}")
    
    # Update parcel
    assigned_at = datetime.utcnow()
    result = await db.parcels.update_one(
        {"_id": parcel_object_id},
        {
            "$set": {
                "student_id": str(student["_id"]),
                "roll_number": request.roll_number,
                "student_name": student["name"],
                "student_email": student["email"],
                "room_number": request.room_number,
                "hostel_type": current_user["hostel_type"],
                "status": ParcelStatus.PENDING,
                "assigned_at": assigned_at,
                "updated_at": assigned_at,
            },
            "$push": {
                "status_history": build_status_event(
                    ParcelTimelineEvent.ASSIGNED,
                    actor=current_user,
                    timestamp=assigned_at,
                    meta={"roll_number": request.roll_number},
                )
            },
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update parcel")
    
    # Send notification email to student
    try:
        await send_parcel_notification(student["email"], student["name"], request.room_number)
    except Exception as e:
        logger.warning("Failed to send notification email: %s", str(e))

    # Send push notification
    if student.get("expoPushToken"):
        async def safe_push():
            await send_expo_push_notification(
                [student["expoPushToken"]],
                "📦 Parcel Claimed!",
                "This parcel has been assigned to you. Please collect it.",
                {"parcelId": str(parcel_object_id)}
            )
        asyncio.create_task(safe_push())
    
    return {"message": "Parcel assigned successfully"}

@api_router.put("/parcel/update")
async def update_parcel(request: UpdateParcelRequest, current_user: dict = Depends(get_current_user)):
    """Guard edits parcel details for pending/unassigned parcels"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can update parcels")

    parcel_object_id = parse_object_id(request.parcel_id, "parcel ID")
    parcel = await db.parcels.find_one({"_id": parcel_object_id})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel.get("hostel_type") != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Parcel belongs to a different hostel")
    if parcel.get("status") == ParcelStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Delivered parcels cannot be edited")

    updates = {}
    append_assigned_event = False
    provided_fields = request.model_fields_set

    if "room_number" in provided_fields:
        if request.room_number is None:
            raise HTTPException(status_code=400, detail="Room number cannot be empty")
        room_number = request.room_number.strip()
        if not room_number:
            raise HTTPException(status_code=400, detail="Room number cannot be empty")
        updates["room_number"] = room_number

    if "description" in provided_fields:
        if request.description is None:
            updates["description"] = None
        else:
            description = request.description.strip()
            updates["description"] = description or None

    if "student_name" in provided_fields:
        if request.student_name is None:
            updates["student_name"] = None
        else:
            student_name = request.student_name.strip()
            updates["student_name"] = student_name or None

    if "roll_number" in provided_fields:
        roll_number = (request.roll_number or "").strip()
        if not roll_number:
            updates["roll_number"] = None
            updates["student_id"] = None
            updates["student_email"] = None
            updates["status"] = ParcelStatus.UNASSIGNED
            if "student_name" not in provided_fields:
                updates["student_name"] = None
        else:
            student = await db.users.find_one({
                "roll_number": roll_number,
                "role": UserRole.STUDENT,
                "hostel_type": current_user["hostel_type"]
            })
            if not student:
                raise HTTPException(status_code=404, detail=f"Student not found with roll number: {roll_number}")
            updates["roll_number"] = roll_number
            updates["student_id"] = str(student["_id"])
            updates["student_email"] = student["email"]
            updates["student_name"] = (request.student_name or "").strip() or student["name"]
            updates["status"] = ParcelStatus.PENDING
            updates["assigned_at"] = datetime.utcnow()
            append_assigned_event = True

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    updates["updated_at"] = datetime.utcnow()
    update_doc: Dict[str, Any] = {"$set": updates}
    if append_assigned_event:
        update_doc["$push"] = {
            "status_history": build_status_event(
                ParcelTimelineEvent.ASSIGNED,
                actor=current_user,
                timestamp=updates["assigned_at"],
                meta={"roll_number": updates.get("roll_number")},
            )
        }

    await db.parcels.update_one({"_id": parcel_object_id}, update_doc)
    updated_parcel = await db.parcels.find_one({"_id": parcel_object_id})
    return {"message": "Parcel updated successfully", "parcel": serialize_parcel(updated_parcel)}

@api_router.post("/parcel/send-otp")
async def send_parcel_otp(request: SendOTPRequest, current_user: dict = Depends(get_current_user)):
    """Guard triggers OTP for parcel delivery"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can send OTP")
    parcel_object_id = parse_object_id(request.parcel_id, "parcel ID")
    
    # Find parcel
    parcel = await db.parcels.find_one({"_id": parcel_object_id})
    
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel.get("hostel_type") != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Parcel belongs to a different hostel")
    
    if parcel["status"] != ParcelStatus.PENDING:
        raise HTTPException(status_code=400, detail="Parcel must be in PENDING status")
    
    if not parcel.get("student_email"):
        raise HTTPException(status_code=400, detail="No student email associated with parcel")
    
    # Invalidate any previous unused OTPs for this parcel
    await db.otps.update_many({
        "parcel_id": request.parcel_id,
        "purpose": OTPPurpose.PARCEL_DELIVERY,
        "is_used": False
    }, {"$set": {"is_used": True}, "$unset": {"otp_code": ""}})

    # Generate OTP
    otp_code = generate_otp()
    expiry_time = datetime.utcnow() + timedelta(minutes=10)
    
    # Save OTP
    otp_doc = {
        "parcel_id": request.parcel_id,
        "email": parcel["student_email"],
        "purpose": OTPPurpose.PARCEL_DELIVERY,
        "otp_code_hash": hash_secret_value(otp_code),
        "expiry_time": expiry_time,
        "is_used": False,
        "created_at": datetime.utcnow()
    }
    
    await db.otps.insert_one(otp_doc)
    
    # Send OTP
    await send_email_otp(parcel["student_email"], otp_code)

    otp_sent_at = datetime.utcnow()
    await db.parcels.update_one(
        {"_id": parcel_object_id},
        {
            "$set": {"otp_sent_at": otp_sent_at},
            "$push": {
                "status_history": build_status_event(
                    ParcelTimelineEvent.OTP_SENT,
                    actor=current_user,
                    timestamp=otp_sent_at,
                )
            },
        },
    )
    
    response_payload = {
        "message": "OTP sent to student email",
        "email": mask_email(parcel["student_email"])
    }

    if INCLUDE_DEBUG_OTP_IN_RESPONSE:
        response_payload["otp"] = otp_code

    return response_payload

@api_router.post("/parcel/verify-otp")
async def verify_parcel_otp(request: VerifyParcelOTPRequest, current_user: dict = Depends(get_current_user)):
    """Guard verifies OTP and marks parcel as delivered"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can verify OTP")
    parcel_object_id = parse_object_id(request.parcel_id, "parcel ID")
    parcel = await db.parcels.find_one({"_id": parcel_object_id})
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel.get("hostel_type") != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Parcel belongs to a different hostel")
    if parcel["status"] != ParcelStatus.PENDING:
        raise HTTPException(status_code=400, detail="Parcel must be in PENDING status")
    
    # Find OTP
    otp_candidates = await db.otps.find({
        "parcel_id": request.parcel_id,
        "purpose": OTPPurpose.PARCEL_DELIVERY,
        "is_used": False
    }).sort("created_at", -1).to_list(20)
    otp = next(
        (
            candidate for candidate in otp_candidates
            if secret_matches(candidate.get("otp_code_hash"), request.otp_code)
            or candidate.get("otp_code") == request.otp_code
        ),
        None,
    )
    
    if not otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Check expiry
    if otp["expiry_time"] < datetime.utcnow():
        raise HTTPException(status_code=401, detail="OTP has expired")
    
    # Mark OTP as used
    await db.otps.update_one(
        {"_id": otp["_id"]},
        {"$set": {"is_used": True}, "$unset": {"otp_code": ""}}
    )
    
    # Update parcel status
    delivered_at = datetime.utcnow()
    delivered_update_fields: Dict[str, Any] = {
        "status": ParcelStatus.DELIVERED,
        "delivered_at": delivered_at,
        "collected_by_delegate": False,
        "delegated_receiver_student_id": None,
        "delegated_receiver_info": None,
    }
    await db.parcels.update_one(
        {"_id": parcel_object_id},
        {
            "$set": delivered_update_fields,
            "$push": {
                "status_history": build_status_event(
                    ParcelTimelineEvent.DELIVERED,
                    actor=current_user,
                    timestamp=delivered_at,
                    meta={"method": "OTP", "collected_by_delegate": False},
                )
            },
        }
    )
    
    return {"message": "Parcel delivered successfully"}

@api_router.post("/parcel/generate-qr")
async def generate_parcel_qr(request: GenerateQRRequest, current_user: dict = Depends(get_current_user)):
    """Guard generates a one-time QR pickup token for a PENDING parcel"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can generate QR tokens")
    
    parcel_object_id = parse_object_id(request.parcel_id, "parcel ID")
    parcel = await db.parcels.find_one({"_id": parcel_object_id})
    
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel.get("hostel_type") != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Parcel belongs to a different hostel")
    if parcel["status"] != ParcelStatus.PENDING:
        raise HTTPException(status_code=400, detail="Parcel must be in PENDING status")
    
    # Generate new token and attach to the parcel document
    qr_token = generate_qr_token()
    qr_generated_at = datetime.utcnow()
    await db.parcels.update_one(
        {"_id": parcel_object_id},
        {
            "$set": {
                "qr_pickup_token_hash": hash_secret_value(qr_token),
                "otp_sent_at": qr_generated_at,
            },
            "$unset": {"qr_pickup_token": ""},
            "$push": {
                "status_history": build_status_event(
                    ParcelTimelineEvent.OTP_SENT,
                    actor=current_user,
                    timestamp=qr_generated_at,
                    meta={"method": "QR_TOKEN"},
                )
            },
        },
    )
    
    return {"message": "QR token generated", "token": qr_token}

@api_router.post("/parcel/delegate")
async def generate_delegation(request: GenerateDelegationRequest, current_user: dict = Depends(get_current_user)):
    """Student generates a delegation code for a friend."""
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can delegate parcels")
    
    parcel_object_id = parse_object_id(request.parcel_id, "parcel ID")
    parcel = await db.parcels.find_one({"_id": parcel_object_id})
    
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel["status"] != ParcelStatus.PENDING:
        raise HTTPException(status_code=400, detail="Parcel is not available for pickup")
        
    # Ensure this student owns the parcel
    if parcel.get("student_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="This parcel belongs to a different student")
        
    delegation_code = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    expiry_time = datetime.utcnow() + timedelta(minutes=10)
    
    await db.parcels.update_one(
        {"_id": parcel_object_id},
        {"$set": {
            "delegation_code_hash": hash_secret_value(delegation_code),
            "delegation_expiry": expiry_time
        }, "$unset": {"delegation_code": ""}}
    )
    
    return {
        "message": "Delegation code generated", 
        "delegation_code": delegation_code,
        "expiry_time": expiry_time
    }

@api_router.post("/parcel/verify-qr")
async def verify_parcel_qr(request: VerifyQRRequest, current_user: dict = Depends(get_current_user)):
    """Student scans the QR and claims their parcel"""
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can claim parcels via QR")
    
    parcel_object_id = parse_object_id(request.parcel_id, "parcel ID")
    parcel = await db.parcels.find_one({"_id": parcel_object_id})
    
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel["status"] != ParcelStatus.PENDING:
        raise HTTPException(status_code=400, detail="Parcel is not available for pickup")

    is_owner = parcel.get("student_id") == current_user["_id"]
    if not is_owner and parcel.get("hostel_type") != current_user.get("hostel_type"):
        raise HTTPException(status_code=403, detail="Cross-hostel delegated pickup is not allowed")

    # Security: Ensure this student owns the parcel, OR provided a valid delegation code
    if not is_owner:
        stored_delegation_hash = parcel.get("delegation_code_hash")
        stored_delegation_plain = parcel.get("delegation_code")
        delegation_matches = (
            request.delegation_code is not None
            and (
                secret_matches(stored_delegation_hash, request.delegation_code)
                or stored_delegation_plain == request.delegation_code
            )
        )
        if not delegation_matches:
            raise HTTPException(status_code=403, detail="This parcel belongs to a different student")
        delegation_expiry = parcel.get("delegation_expiry")
        if not delegation_expiry or delegation_expiry < datetime.utcnow():
            raise HTTPException(status_code=401, detail="Delegation code has expired")
        
    # Verify the token matches
    saved_token_hash = parcel.get("qr_pickup_token_hash")
    saved_token_plain = parcel.get("qr_pickup_token")
    token_matches = secret_matches(saved_token_hash, request.token) or saved_token_plain == request.token
    if not token_matches:
        raise HTTPException(status_code=401, detail="Invalid or expired QR code")
        
    # Mark as delivered and clear token and delegation fields
    delivered_at = datetime.utcnow()
    collected_by_delegate = not is_owner
    delegated_receiver_info = (
        build_delegated_receiver_info(current_user) if collected_by_delegate else None
    )
    delivered_update_fields: Dict[str, Any] = {
        "status": ParcelStatus.DELIVERED,
        "delivered_at": delivered_at,
        "collected_by_delegate": collected_by_delegate,
        "delegated_receiver_student_id": str(current_user["_id"]) if collected_by_delegate else None,
        "delegated_receiver_info": delegated_receiver_info,
    }
    await db.parcels.update_one(
        {"_id": parcel_object_id},
        {
            "$set": delivered_update_fields,
            "$push": {
                "status_history": build_status_event(
                    ParcelTimelineEvent.DELIVERED,
                    actor=current_user,
                    timestamp=delivered_at,
                    meta={
                        "method": "QR",
                        "collected_by_delegate": collected_by_delegate,
                        "delegated_receiver_student_id": (
                            str(current_user["_id"]) if collected_by_delegate else None
                        ),
                    },
                )
            },
            "$unset": {
                "qr_pickup_token": "",
                "qr_pickup_token_hash": "",
                "delegation_code": "",
                "delegation_code_hash": "",
                "delegation_expiry": ""
            }
        }
    )
    
    return {"message": "Parcel claimed successfully via QR code!"}

@api_router.get("/parcel/hostel/{hostel_type}")
async def get_hostel_parcels(
    hostel_type: str = ApiPath(..., min_length=4, max_length=8),
    status: Optional[str] = ApiQuery(default=None, max_length=16),
    current_user: dict = Depends(get_current_user),
):
    """Get parcels for a specific hostel"""
    hostel_type = validate_hostel_type(hostel_type)
    if current_user["role"] == UserRole.ADMIN:
        scoped_hostel = hostel_type
    elif current_user["role"] in [UserRole.GUARD, UserRole.STUDENT]:
        if hostel_type != current_user["hostel_type"]:
            raise HTTPException(status_code=403, detail="Access denied for the requested hostel")
        scoped_hostel = current_user["hostel_type"]
    else:
        raise HTTPException(status_code=403, detail="Invalid role for this endpoint")

    query = {"hostel_type": scoped_hostel}
    
    if current_user["role"] == UserRole.STUDENT:
        student_scope: List[Dict[str, Any]] = [{"student_id": current_user["_id"]}]
        student_room = (current_user.get("room_number") or "").strip()
        if student_room:
            student_scope.append(
                {
                    "$and": [
                        {"status": ParcelStatus.UNASSIGNED},
                        {"room_number": student_room},
                    ]
                }
            )
        query["$or"] = student_scope
        if status:
            query["status"] = validate_parcel_status(status)
        else:
            query["status"] = {"$in": [ParcelStatus.PENDING, ParcelStatus.UNASSIGNED]}
    elif status:
        query["status"] = validate_parcel_status(status)
    
    parcels = await db.parcels.find(query).sort("created_at", -1).to_list(1000)

    parcels = [serialize_parcel(parcel) for parcel in parcels]

    return {"parcels": parcels}

@api_router.get("/parcel/student/my-parcels")
async def get_my_parcels(current_user: dict = Depends(get_current_user)):
    """Student gets their parcels"""
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    parcels = await db.parcels.find({
        "student_id": current_user["_id"],
        "status": ParcelStatus.DELIVERED
    }).sort("delivered_at", -1).to_list(1000)

    parcels = [serialize_parcel(parcel) for parcel in parcels]

    return {"parcels": parcels}

@api_router.get("/parcel/guard/pending")
async def get_pending_parcels(current_user: dict = Depends(get_current_user)):
    """Guard gets pending and unassigned parcels"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can access this endpoint")
    
    parcels = await db.parcels.find({
        "hostel_type": current_user["hostel_type"],
        "status": {"$in": [ParcelStatus.PENDING, ParcelStatus.UNASSIGNED]}
    }).sort("created_at", -1).to_list(1000)

    parcels = [serialize_parcel(parcel) for parcel in parcels]

    return {"parcels": parcels}

@api_router.get("/parcel/guard/delivered")
async def get_delivered_parcels(current_user: dict = Depends(get_current_user)):
    """Guard gets delivered parcels"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can access this endpoint")
    
    parcels = await db.parcels.find({
        "hostel_type": current_user["hostel_type"],
        "status": ParcelStatus.DELIVERED
    }).sort("delivered_at", -1).to_list(1000)

    parcels = [serialize_parcel(parcel) for parcel in parcels]

    return {"parcels": parcels}

@api_router.get("/student/{student_id}")
async def get_student_details(
    student_id: str = ApiPath(..., min_length=24, max_length=24),
    current_user: dict = Depends(get_current_user),
):
    """Get student details by ID"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can access this endpoint")
    student_object_id = parse_object_id(student_id, "student ID")
    
    student = await db.users.find_one({
        "_id": student_object_id,
        "role": UserRole.STUDENT
    })
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.get("hostel_type") != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Student belongs to a different hostel")
    
    student["_id"] = str(student["_id"])
    student.pop("password", None)  # Remove password if exists
    # Ensure contact number included if exists
    # (Mongo document already contains it; we simply relay it)
    return {"student": student}

# Include the router in the main app
app.include_router(api_router)

cors_origins = get_cors_origins()
allow_all_origins = cors_origins == ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=not allow_all_origins,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    global auto_delete_task
    if auto_delete_task:
        auto_delete_task.cancel()
        try:
            await auto_delete_task
        except asyncio.CancelledError:
            pass
        auto_delete_task = None
    client.close()

@app.on_event("startup")
async def startup_seed_admin():
    global auto_delete_task
    await ensure_admin_user()
    if not auto_delete_task or auto_delete_task.done():
        auto_delete_task = asyncio.create_task(periodic_delivered_cleanup())
