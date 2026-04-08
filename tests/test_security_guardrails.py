import asyncio
import importlib.util
import os
import uuid
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from bson import ObjectId
from pydantic import ValidationError


SERVER_PATH = Path("backend/server.py")
_UNSET = object()


@contextmanager
def temporary_env(updates: dict):
    backup = {key: os.environ.get(key) for key in updates}
    try:
        for key, value in updates.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        yield
    finally:
        for key, previous in backup.items():
            if previous is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = previous


def load_server_module(
    *,
    app_env: str | None = "development",
    jwt_secret=_UNSET,
    admin_password=_UNSET,
):
    module_name = f"server_under_test_{uuid.uuid4().hex}"
    env_updates = {
        "MONGO_URL": "mongodb://localhost:27017",
        "DB_NAME": "test_db",
        "CORS_ORIGINS": "http://localhost:19006",
        "ENABLE_SENSITIVE_LOGGING": "false",
        "INCLUDE_DEBUG_OTP_IN_RESPONSE": "false",
        "APP_ENV": app_env,
        "JWT_SECRET_KEY": f"test-jwt-{uuid.uuid4().hex}" if jwt_secret is _UNSET else jwt_secret,
        "ADMIN_PASSWORD": f"test-admin-{uuid.uuid4().hex}" if admin_password is _UNSET else admin_password,
    }
    with temporary_env(env_updates):
        spec = importlib.util.spec_from_file_location(module_name, SERVER_PATH)
        module = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(module)
        return module


def test_default_app_env_is_production():
    server = load_server_module(app_env="production")
    assert server.APP_ENV == "production"
    assert server.INCLUDE_DEBUG_OTP_IN_RESPONSE is False


def test_production_rejects_missing_jwt_secret():
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY must be set in production"):
        load_server_module(app_env="production", jwt_secret="", admin_password=f"set-admin-{uuid.uuid4().hex}")


def test_production_rejects_weak_jwt_secret():
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY must be at least"):
        load_server_module(app_env="production", jwt_secret="short-secret", admin_password=f"set-admin-{uuid.uuid4().hex}")


def test_production_rejects_weak_admin_password():
    with pytest.raises(RuntimeError, match="ADMIN_PASSWORD must be at least"):
        load_server_module(app_env="production", jwt_secret=f"long-jwt-{uuid.uuid4().hex}", admin_password="short")


def test_parse_object_id_rejects_invalid_values():
    server = load_server_module()
    with pytest.raises(HTTPException) as exc_info:
        server.parse_object_id("not-an-object-id", "parcel ID")
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Invalid parcel ID format"


def test_assign_parcel_returns_404_when_parcel_missing():
    server = load_server_module()
    server.db = SimpleNamespace(
        parcels=SimpleNamespace(
            find_one=AsyncMock(return_value=None),
            update_one=AsyncMock(),
        ),
        users=SimpleNamespace(find_one=AsyncMock()),
    )

    request = server.AssignParcelRequest(
        parcel_id=str(ObjectId()),
        roll_number="2021001",
        hostel_type=server.HostelType.BOYS,
        room_number="101",
    )
    current_user = {
        "_id": str(ObjectId()),
        "role": server.UserRole.GUARD,
        "hostel_type": server.HostelType.BOYS,
    }

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(server.assign_parcel(request, current_user))
    assert exc_info.value.status_code == 404
    assert "Parcel not found" in exc_info.value.detail


def test_guard_cannot_send_otp_for_other_hostel_parcel():
    server = load_server_module()
    request = server.SendOTPRequest(parcel_id=str(ObjectId()))
    current_user = {
        "_id": str(ObjectId()),
        "role": server.UserRole.GUARD,
        "hostel_type": server.HostelType.BOYS,
    }
    server.db = SimpleNamespace(
        parcels=SimpleNamespace(
            find_one=AsyncMock(
                return_value={
                    "_id": ObjectId(request.parcel_id),
                    "hostel_type": server.HostelType.GIRLS,
                    "status": server.ParcelStatus.PENDING,
                    "student_email": "student@iiitg.ac.in",
                }
            )
        )
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(server.send_parcel_otp(request, current_user))
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Parcel belongs to a different hostel"


def test_student_cannot_query_another_hostels_parcels():
    server = load_server_module()
    current_user = {
        "_id": str(ObjectId()),
        "role": server.UserRole.STUDENT,
        "hostel_type": server.HostelType.BOYS,
    }
    server.db = SimpleNamespace(parcels=SimpleNamespace(find=AsyncMock()))

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(server.get_hostel_parcels(server.HostelType.GIRLS, None, current_user))
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Access denied for the requested hostel"


def test_guard_cannot_fetch_student_from_other_hostel():
    server = load_server_module()
    student_id = str(ObjectId())
    current_user = {
        "_id": str(ObjectId()),
        "role": server.UserRole.GUARD,
        "hostel_type": server.HostelType.BOYS,
    }
    server.db = SimpleNamespace(
        users=SimpleNamespace(
            find_one=AsyncMock(
                return_value={
                    "_id": ObjectId(student_id),
                    "role": server.UserRole.STUDENT,
                    "hostel_type": server.HostelType.GIRLS,
                    "name": "Test Student",
                    "email": "student@iiitg.ac.in",
                    "roll_number": "2021001",
                }
            )
        )
    )

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(server.get_student_details(student_id, current_user))
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "Student belongs to a different hostel"


def test_guard_login_rejects_malformed_username():
    server = load_server_module()
    with pytest.raises(ValidationError):
        server.GuardLoginRequest(
            username="bad user!",
            password="ValidPass123",
            hostel_type="BOYS",
        )


def test_student_login_rejects_short_password():
    server = load_server_module()
    with pytest.raises(ValidationError):
        server.StudentLoginRequest(
            roll_number="2021001",
            password="1234567",
            hostel_type="BOYS",
        )


def test_verify_parcel_otp_rejects_non_numeric_otp():
    server = load_server_module()
    with pytest.raises(ValidationError):
        server.VerifyParcelOTPRequest(
            parcel_id=str(ObjectId()),
            otp_code="12ab56",
        )


def test_validate_hostel_type_normalizes_case_and_whitespace():
    server = load_server_module()
    assert server.validate_hostel_type(" boys ") == server.HostelType.BOYS


def test_validate_parcel_status_rejects_unknown_value():
    server = load_server_module()
    with pytest.raises(HTTPException) as exc_info:
        server.validate_parcel_status("unknown")
    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Invalid parcel status"
