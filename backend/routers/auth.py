"""Authentication, registration, and account credential routes."""
from datetime import datetime, timedelta
from typing import Any, Dict

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pymongo.errors import DuplicateKeyError

from core.config import (
    HostelType,
    MIN_PASSWORD_LENGTH,
    OTPPurpose,
    TOKEN_REVOCATIONS_COLLECTION,
    UserRole,
    logger,
    utc_from_timestamp,
    utcnow,
)
from core.db import db
from core.models import (
    AdminLoginRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GuardLoginRequest,
    ResetPasswordVerify,
    StudentLoginRequest,
    StudentRegisterRequest,
    StudentRegisterVerify,
    TokenResponse,
    UpdateExpoTokenRequest,
)
from core.domain import auto_link_parcels_for_student, seed_student_room_assignment
from core.security import (
    create_access_token,
    generate_otp,
    get_current_user,
    hash_password,
    hash_secret_value,
    secret_matches,
    security,
    verify_password,
    verify_token,
)
from core.services import enforce_auth_rate_limit, mask_email, send_email_otp
from core.validators import parse_object_id, validate_hostel_type

router = APIRouter(prefix="/api")


@router.get("/")
async def root():
    return {"message": "Hostel Parcel Management API", "version": "1.0"}


@router.post("/auth/guard/login", response_model=TokenResponse)
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


@router.post("/auth/admin/login", response_model=TokenResponse)
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


@router.post("/auth/student/login", response_model=TokenResponse)
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


@router.post("/auth/logout")
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
        expires_at = utc_from_timestamp(int(exp_value))
    except (TypeError, ValueError, OSError):
        raise HTTPException(status_code=401, detail="Invalid token")

    token_jti = payload.get("jti")
    selector: Dict[str, Any]
    revocation_doc: Dict[str, Any] = {
        "user_id": current_user.get("_id"),
        "expires_at": expires_at,
        "revoked_at": utcnow(),
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


@router.post("/auth/student/register/request-otp")
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
    expiry_time = utcnow() + timedelta(minutes=10)
    otp_doc = {
        "email": request.email,
        "roll_number": request.roll_number,
        "hostel_type": hostel_type,
        "purpose": OTPPurpose.STUDENT_REGISTRATION,
        "otp_code_hash": hash_secret_value(otp_code),
        "expiry_time": expiry_time,
        "is_used": False,
        "created_at": utcnow()
    }
    await db.otps.insert_one(otp_doc)
    await send_email_otp(request.email, otp_code)
    return {"message": "If the details are valid, a registration OTP has been sent", "email": request.email}


@router.post("/auth/student/register/verify-otp", response_model=TokenResponse)
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
    if otp["expiry_time"] < utcnow():
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
        "created_at": utcnow()
    }
    if request.contact_number:
        student_doc["contact_number"] = request.contact_number

    try:
        result = await db.users.insert_one(student_doc)
    except DuplicateKeyError:
        # A concurrent registration won the race after our existence check.
        raise HTTPException(status_code=400, detail="Registration could not be completed")
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


@router.put("/auth/student/expo-token")
async def update_expo_token(request: UpdateExpoTokenRequest, current_user: dict = Depends(get_current_user)):
    """Update the Expo push token for the logged-in student"""
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can update their push token")

    await db.users.update_one(
        {"_id": parse_object_id(current_user["_id"], "user ID")},
        {"$set": {"expoPushToken": request.expo_push_token}}
    )
    return {"message": "Push token updated successfully"}


@router.post("/auth/student/forgot-password/request-otp")
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

    await db.otps.update_many({
        "email": student["email"],
        "purpose": OTPPurpose.PASSWORD_RESET,
        "is_used": False
    }, {"$set": {"is_used": True}, "$unset": {"otp_code": ""}})

    otp_code = generate_otp()
    expiry_time = utcnow() + timedelta(minutes=10)
    otp_doc = {
        "email": student["email"],
        "purpose": OTPPurpose.PASSWORD_RESET,
        "otp_code_hash": hash_secret_value(otp_code),
        "expiry_time": expiry_time,
        "is_used": False,
        "created_at": utcnow()
    }
    await db.otps.insert_one(otp_doc)
    await send_email_otp(student["email"], otp_code)
    return {"message": "If an account exists, a password reset OTP has been sent", "email": mask_email(student["email"])}


@router.post("/auth/student/forgot-password/verify-otp")
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
    if otp["expiry_time"] < utcnow():
        raise HTTPException(status_code=401, detail="OTP has expired")

    await db.otps.update_one(
        {"_id": otp["_id"]},
        {"$set": {"is_used": True}, "$unset": {"otp_code": ""}}
    )

    new_hashed = hash_password(request.new_password)
    await db.users.update_one(
        {"_id": student["_id"]},
        {"$set": {"password": new_hashed}}
    )

    return {"message": "Password reset successfully. You can now login with your new password."}


@router.put("/auth/student/change-password")
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


@router.get("/auth/student/profile")
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
