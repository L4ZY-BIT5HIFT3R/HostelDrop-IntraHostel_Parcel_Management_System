"""Pydantic request and response models with field-level sanitization."""
from datetime import datetime
from typing import List, Optional

MAX_BULK_PARCEL_ITEMS = 50

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator, model_validator

from .config import (
    DELEGATION_CODE_PATTERN,
    EXPO_TOKEN_PATTERN,
    MAX_STRING_FIELD_LENGTH,
    UserRole,
)
from .validators import (
    _normalize_hostel_type,
    _normalize_role,
    _reject_control_chars,
    _validate_description,
    _validate_name,
    _validate_object_id_string,
    _validate_optional_contact_number,
    _validate_otp,
    _validate_password,
    _validate_qr_token,
    _validate_reason,
    _validate_roll_number,
    _validate_room_number,
    _validate_student_email,
    _validate_username,
)


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


class CreateRoomChangeRequest(SanitizedRequestModel):
    new_room_number: str
    reason: str

    @field_validator("new_room_number")
    @classmethod
    def validate_new_room_number(cls, value: str) -> str:
        return _validate_room_number(value)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        return _validate_reason(value)


class ResolveRoomChangeRequest(SanitizedRequestModel):
    action: str

    @field_validator("action")
    @classmethod
    def validate_action(cls, value: str) -> str:
        cleaned = value.strip().upper()
        if cleaned not in {"ACCEPT", "DENY"}:
            raise ValueError("Action must be ACCEPT or DENY")
        return cleaned


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


class BulkParcelItem(SanitizedRequestModel):
    """A single parcel within a bulk intake batch (hostel comes from the guard)."""
    room_number: str
    roll_number: Optional[str] = None
    student_name: Optional[str] = None
    description: Optional[str] = None

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


class BulkAddParcelRequest(SanitizedRequestModel):
    """Guard logs many parcels in one request (batch intake)."""
    hostel_type: str
    items: List[BulkParcelItem]

    @field_validator("hostel_type")
    @classmethod
    def validate_hostel_type(cls, value: str) -> str:
        return _normalize_hostel_type(value)

    @model_validator(mode="after")
    def validate_items(self):
        if not self.items:
            raise ValueError("At least one parcel is required")
        if len(self.items) > MAX_BULK_PARCEL_ITEMS:
            raise ValueError(f"Cannot log more than {MAX_BULK_PARCEL_ITEMS} parcels at once")
        return self


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
