"""Field-level validation and normalization helpers."""
import uuid

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException

from .config import (
    CONTACT_NUMBER_PATTERN,
    CONTROL_CHARS_PATTERN,
    ENFORCE_STUDENT_EMAIL_DOMAIN,
    HOSTEL_TYPE_VALUES,
    MIN_PASSWORD_LENGTH,
    OBJECT_ID_PATTERN,
    OTP_PATTERN,
    PARCEL_STATUS_VALUES,
    ROLL_NUMBER_PATTERN,
    ROOM_NUMBER_PATTERN,
    STUDENT_EMAIL_DOMAIN,
    USER_ROLE_VALUES,
    USERNAME_PATTERN,
)


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


# ---- HTTP-facing validators (raise HTTPException for request handlers) ----

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
