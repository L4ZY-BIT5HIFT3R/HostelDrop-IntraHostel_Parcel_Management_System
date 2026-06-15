"""Parcel lifecycle routes: intake, assignment, OTP/QR delivery, and listings."""
import asyncio
import secrets
import string
from datetime import timedelta
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Path as ApiPath,
    Query as ApiQuery,
    Request,
)
from pymongo.errors import PyMongoError

from core.config import (
    INCLUDE_DEBUG_OTP_IN_RESPONSE,
    OTPPurpose,
    ParcelStatus,
    ParcelTimelineEvent,
    QR_PICKUP_TOKEN_TTL_SECONDS,
    UserRole,
    logger,
    utcnow,
)
from core.db import db
from core.label_match import parse_label, rank_candidates
from core.domain import (
    build_delegated_receiver_info,
    build_status_event,
    generate_display_id,
    parcel_claimed_by_user,
    serialize_parcel,
)
from core.models import (
    AddParcelRequest,
    AssignParcelRequest,
    BulkAddParcelRequest,
    GenerateDelegationRequest,
    GenerateQRRequest,
    SendOTPRequest,
    UpdateParcelRequest,
    VerifyParcelOTPRequest,
    VerifyQRRequest,
)
from core.security import (
    generate_otp,
    generate_qr_token,
    get_current_user,
    hash_secret_value,
    secret_matches,
)
from core.services import (
    enforce_qr_scan_rate_limit,
    mask_email,
    send_email_otp,
    send_expo_push_notification,
    send_parcel_notification,
)
from core.validators import parse_object_id, validate_hostel_type, validate_parcel_status

router = APIRouter(prefix="/api")


async def _notify_assigned_parcel(email, name, room, push_token, parcel_id):
    """Background task: email + push the owning student that their parcel arrived."""
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


async def _broadcast_unassigned_parcel(room_number, hostel_type, parcel_id):
    """Background task: nudge a room when a parcel arrives without a known owner."""
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


async def _intake_parcel(
    *,
    current_user: dict,
    background_tasks: BackgroundTasks,
    room_number: str,
    roll_number: Optional[str],
    student_name: Optional[str],
    description: Optional[str],
) -> Dict[str, Any]:
    """Build, insert, and schedule notifications for one intake parcel.

    Shared by single ``/parcel/add`` and batch ``/parcel/bulk-add`` so both
    behave identically (status, timeline, notifications).
    """
    created_at = utcnow()
    parcel_data: Dict[str, Any] = {
        "display_id": generate_display_id(description),
        "hostel_type": current_user["hostel_type"],
        "room_number": room_number,
        "description": description,
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

    student = None
    if roll_number:
        student = await db.users.find_one({
            "roll_number": roll_number,
            "role": UserRole.STUDENT,
            "hostel_type": current_user["hostel_type"]
        })

        parcel_data["roll_number"] = roll_number
        parcel_data["student_name"] = student_name
        parcel_data["status"] = ParcelStatus.PENDING  # Always PENDING if roll number is provided
        parcel_data["assigned_at"] = created_at
        parcel_data["status_history"].append(
            build_status_event(
                ParcelTimelineEvent.ASSIGNED,
                actor=current_user,
                timestamp=created_at,
                meta={"roll_number": roll_number},
            )
        )

        if student:
            parcel_data["student_id"] = str(student["_id"])
            parcel_data["student_name"] = student_name or student["name"]
            parcel_data["student_email"] = student["email"]
    else:
        parcel_data["status"] = ParcelStatus.UNASSIGNED
        parcel_data["student_name"] = student_name

    result = await db.parcels.insert_one(parcel_data)
    parcel_data["_id"] = str(result.inserted_id)

    if roll_number:
        if student:
            background_tasks.add_task(
                _notify_assigned_parcel,
                student["email"],
                student["name"],
                room_number,
                student.get("expoPushToken"),
                parcel_data["_id"],
            )
    else:
        background_tasks.add_task(
            _broadcast_unassigned_parcel,
            room_number,
            current_user["hostel_type"],
            parcel_data["_id"],
        )

    return serialize_parcel(parcel_data)


@router.post("/parcel/add")
async def add_parcel(request: AddParcelRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Guard adds a new parcel"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can add parcels")
    request_hostel_type = validate_hostel_type(request.hostel_type)
    if request_hostel_type != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Guards can only add parcels for their own hostel")

    parcel = await _intake_parcel(
        current_user=current_user,
        background_tasks=background_tasks,
        room_number=request.room_number,
        roll_number=request.roll_number,
        student_name=request.student_name,
        description=request.description,
    )
    return {"message": "Parcel added successfully", "parcel": parcel}


@router.post("/parcel/bulk-add")
async def bulk_add_parcels(request: BulkAddParcelRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Guard logs a batch of parcels in one request (bulk intake mode).

    Each item is intaken independently and reported individually so a single
    bad row does not discard the rest of the cart.
    """
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can add parcels")
    request_hostel_type = validate_hostel_type(request.hostel_type)
    if request_hostel_type != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Guards can only add parcels for their own hostel")

    results: List[Dict[str, Any]] = []
    added = 0
    for index, item in enumerate(request.items):
        try:
            parcel = await _intake_parcel(
                current_user=current_user,
                background_tasks=background_tasks,
                room_number=item.room_number,
                roll_number=item.roll_number,
                student_name=item.student_name,
                description=item.description,
            )
            added += 1
            results.append({"index": index, "ok": True, "parcel": parcel})
        except Exception as exc:
            logger.warning("Bulk intake item %s failed: %s", index, exc)
            results.append({"index": index, "ok": False, "error": "Failed to log this parcel"})

    return {
        "message": f"Logged {added} of {len(request.items)} parcels",
        "added": added,
        "total": len(request.items),
        "results": results,
    }


@router.put("/parcel/assign")
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
    if parcel.get("status") == ParcelStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Delivered parcels cannot be reassigned")

    student = await db.users.find_one({
        "roll_number": request.roll_number,
        "role": UserRole.STUDENT,
        "hostel_type": current_user["hostel_type"]
    })

    if not student:
        raise HTTPException(status_code=404, detail=f"Student not found with roll number: {request.roll_number}")

    assigned_at = utcnow()
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

    try:
        await send_parcel_notification(student["email"], student["name"], request.room_number)
    except Exception as e:
        logger.warning("Failed to send notification email: %s", str(e))

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


@router.get("/parcel/match-student")
async def match_student_for_label(
    q: str = ApiQuery(..., min_length=1, max_length=256),
    current_user: dict = Depends(get_current_user),
):
    """Auto-match: parse a 'Name | Room | Roll' label and resolve it to a student.

    Returns the parsed fields, an exact roll-number match when found, and a
    fuzzy name-ranked candidate list so the guard can confirm with one tap
    instead of leaving the parcel UNASSIGNED.
    """
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can look up students")

    hostel_type = current_user["hostel_type"]
    parsed = parse_label(q)

    exact_match: Optional[Dict[str, Any]] = None
    roll = parsed.get("roll_number")
    if roll:
        student = await db.users.find_one({
            "roll_number": roll,
            "role": UserRole.STUDENT,
            "hostel_type": hostel_type,
        })
        if student:
            parsed_room = (parsed.get("room_number") or "").strip().lower()
            student_room = (student.get("room_number") or "").strip().lower()
            exact_match = {
                "roll_number": student.get("roll_number"),
                "name": student.get("name"),
                "room_number": student.get("room_number"),
                "room_matches": (parsed_room == student_room) if (parsed_room and student_room) else None,
            }

    candidates: List[Dict[str, Any]] = []
    if parsed.get("name"):
        students = await db.users.find(
            {"role": UserRole.STUDENT, "hostel_type": hostel_type},
            {"name": 1, "roll_number": 1, "room_number": 1},
        ).to_list(2000)
        candidates = rank_candidates(parsed, students)
        if exact_match:
            candidates = [c for c in candidates if c.get("roll_number") != exact_match["roll_number"]]

    return {"parsed": parsed, "exact_match": exact_match, "candidates": candidates}


@router.put("/parcel/update")
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
            updates["assigned_at"] = utcnow()
            append_assigned_event = True

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    updates["updated_at"] = utcnow()
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


@router.post("/parcel/send-otp")
async def send_parcel_otp(request: SendOTPRequest, current_user: dict = Depends(get_current_user)):
    """Guard triggers OTP for parcel delivery"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can send OTP")
    parcel_object_id = parse_object_id(request.parcel_id, "parcel ID")

    parcel = await db.parcels.find_one({"_id": parcel_object_id})

    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel.get("hostel_type") != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Parcel belongs to a different hostel")

    if parcel["status"] != ParcelStatus.PENDING:
        raise HTTPException(status_code=400, detail="Parcel must be in PENDING status")

    if not parcel.get("student_email"):
        raise HTTPException(status_code=400, detail="No student email associated with parcel")

    await db.otps.update_many({
        "parcel_id": request.parcel_id,
        "purpose": OTPPurpose.PARCEL_DELIVERY,
        "is_used": False
    }, {"$set": {"is_used": True}, "$unset": {"otp_code": ""}})

    otp_code = generate_otp()
    expiry_time = utcnow() + timedelta(minutes=10)

    otp_doc = {
        "parcel_id": request.parcel_id,
        "email": parcel["student_email"],
        "purpose": OTPPurpose.PARCEL_DELIVERY,
        "otp_code_hash": hash_secret_value(otp_code),
        "expiry_time": expiry_time,
        "is_used": False,
        "created_at": utcnow()
    }

    await db.otps.insert_one(otp_doc)

    await send_email_otp(parcel["student_email"], otp_code)

    otp_sent_at = utcnow()
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


@router.post("/parcel/verify-otp")
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

    if otp["expiry_time"] < utcnow():
        raise HTTPException(status_code=401, detail="OTP has expired")

    await db.otps.update_one(
        {"_id": otp["_id"]},
        {"$set": {"is_used": True}, "$unset": {"otp_code": ""}}
    )

    delivered_at = utcnow()
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


@router.post("/parcel/generate-qr")
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

    qr_token = generate_qr_token()
    qr_generated_at = utcnow()
    qr_expires_at = qr_generated_at + timedelta(seconds=QR_PICKUP_TOKEN_TTL_SECONDS)
    await db.parcels.update_one(
        {"_id": parcel_object_id},
        {
            "$set": {
                "qr_pickup_token_hash": hash_secret_value(qr_token),
                "otp_sent_at": qr_generated_at,
                "qr_pickup_token_expires_at": qr_expires_at,
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


@router.post("/parcel/delegate")
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

    if parcel.get("student_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="This parcel belongs to a different student")

    delegation_code = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    expiry_time = utcnow() + timedelta(minutes=10)

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


@router.post("/parcel/verify-qr")
async def verify_parcel_qr(
    request: VerifyQRRequest,
    http_request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Student scans the QR and claims their parcel"""
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can claim parcels via QR")

    await enforce_qr_scan_rate_limit(http_request, current_user, request.parcel_id)

    parcel_object_id = parse_object_id(request.parcel_id, "parcel ID")
    parcel = await db.parcels.find_one({"_id": parcel_object_id})

    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if parcel["status"] == ParcelStatus.DELIVERED:
        if parcel_claimed_by_user(parcel, current_user):
            return {"message": "Parcel already claimed successfully via QR code!"}
        raise HTTPException(status_code=400, detail="Parcel has already been delivered")
    if parcel["status"] != ParcelStatus.PENDING:
        raise HTTPException(status_code=400, detail="Parcel is not available for pickup")

    is_owner = parcel.get("student_id") == current_user["_id"]
    if not is_owner and parcel.get("hostel_type") != current_user.get("hostel_type"):
        raise HTTPException(status_code=403, detail="Cross-hostel delegated pickup is not allowed")

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
        if not delegation_expiry or delegation_expiry < utcnow():
            raise HTTPException(status_code=401, detail="Delegation code has expired")

    saved_token_hash = parcel.get("qr_pickup_token_hash")
    saved_token_plain = parcel.get("qr_pickup_token")
    if not saved_token_hash and not saved_token_plain:
        raise HTTPException(status_code=401, detail="QR code is invalid or already used")

    qr_expires_at = parcel.get("qr_pickup_token_expires_at")
    if not qr_expires_at or qr_expires_at < utcnow():
        raise HTTPException(status_code=401, detail="Invalid or expired QR code")

    token_matches = secret_matches(saved_token_hash, request.token) or saved_token_plain == request.token
    if not token_matches:
        raise HTTPException(status_code=401, detail="Invalid or expired QR code")

    delivered_at = utcnow()
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
    try:
        update_result = await db.parcels.update_one(
            {
                "_id": parcel_object_id,
                "status": ParcelStatus.PENDING,
                "$or": [
                    {"qr_pickup_token_hash": saved_token_hash},
                    {"qr_pickup_token": request.token},
                ],
                "qr_pickup_token_expires_at": {"$gt": utcnow()},
            },
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
                    "delegation_expiry": "",
                    "qr_pickup_token_expires_at": "",
                }
            }
        )
    except PyMongoError as exc:
        logger.warning("QR claim write uncertain for parcel %s: %s", request.parcel_id, exc)
        latest_parcel = await db.parcels.find_one({"_id": parcel_object_id})
        if latest_parcel and latest_parcel.get("status") == ParcelStatus.DELIVERED and parcel_claimed_by_user(latest_parcel, current_user):
            return {"message": "Parcel already claimed successfully via QR code!"}
        raise HTTPException(
            status_code=503,
            detail="Temporary server issue while confirming parcel claim. Please refresh parcel status.",
        )

    if update_result.modified_count != 1:
        latest_parcel = await db.parcels.find_one({"_id": parcel_object_id})
        if latest_parcel and latest_parcel.get("status") == ParcelStatus.DELIVERED and parcel_claimed_by_user(latest_parcel, current_user):
            return {"message": "Parcel already claimed successfully via QR code!"}
        raise HTTPException(status_code=409, detail="Parcel claim conflict. Please rescan with a fresh QR code.")

    return {"message": "Parcel claimed successfully via QR code!"}


@router.get("/parcel/hostel/{hostel_type}")
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


@router.get("/parcel/student/my-parcels")
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


@router.get("/parcel/guard/pending")
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


@router.get("/parcel/guard/delivered")
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


@router.get("/student/{student_id}")
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
    student.pop("password", None)
    return {"student": student}
