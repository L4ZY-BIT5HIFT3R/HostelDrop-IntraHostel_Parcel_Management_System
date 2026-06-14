"""Admin routes: user management, room transfers/history, and delivered-parcel maintenance."""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Path as ApiPath, Query as ApiQuery
from pymongo.errors import DuplicateKeyError

from core.config import (
    HostelType,
    LEFT_STUDENT_RETENTION_DAYS,
    LEFT_STUDENTS_ARCHIVE_COLLECTION,
    ParcelStatus,
    ROOM_CHANGE_REQUESTS_COLLECTION,
    RoomAssignmentStatus,
    STUDENT_NOTIFICATIONS_COLLECTION,
    UserRole,
    logger,
    utcnow,
)
from core.db import db, left_users_db
from core.domain import (
    auto_link_parcels_for_student,
    build_room_assignment_doc,
    close_active_room_assignment,
    compute_ist_retention_expiry_utc,
    delete_delivered_parcels_by_query,
    get_auto_delete_status,
    normalize_datetime_values,
    seed_student_room_assignment,
    serialize_datetime_ist,
)
from core.models import (
    AddUserRequest,
    DeactivateStudentRequest,
    ResolveRoomChangeRequest,
    TransferStudentRoomRequest,
)
from core.security import get_current_user, hash_password, require_admin
from core.services import create_student_notification
from core.validators import _validate_roll_number, parse_object_id, validate_hostel_type

router = APIRouter(prefix="/api")


@router.get("/admin/room-change-requests")
async def list_room_change_requests(
    hostel_type: Optional[str] = ApiQuery(default=None, max_length=16),
    current_user: dict = Depends(get_current_user),
):
    """Admin gets pending room change requests."""
    require_admin(current_user)
    query: Dict[str, Any] = {"status": "PENDING"}
    if hostel_type:
        query["hostel_type"] = validate_hostel_type(hostel_type)

    requests_cursor = db[ROOM_CHANGE_REQUESTS_COLLECTION].find(query).sort("created_at", 1)
    requests = await requests_cursor.to_list(1000)
    serialized = []
    for item in requests:
        item["_id"] = str(item["_id"])
        serialized.append(normalize_datetime_values(item))
    return {"requests": serialized}


@router.patch("/admin/room-change-request/{request_id}")
async def resolve_room_change_request(
    request_id: str = ApiPath(..., min_length=24, max_length=24),
    request: ResolveRoomChangeRequest = ...,
    current_user: dict = Depends(get_current_user),
):
    """Admin accepts or denies a room change request."""
    require_admin(current_user)
    request_object_id = parse_object_id(request_id, "room change request ID")

    room_change_request = await db[ROOM_CHANGE_REQUESTS_COLLECTION].find_one({
        "_id": request_object_id,
        "status": "PENDING",
    })
    if not room_change_request:
        raise HTTPException(status_code=404, detail="Room change request not found")

    student = await db.users.find_one({
        "_id": parse_object_id(room_change_request["student_id"], "student ID"),
        "role": UserRole.STUDENT,
    })
    if not student:
        await db[ROOM_CHANGE_REQUESTS_COLLECTION].delete_one({"_id": request_object_id})
        raise HTTPException(status_code=404, detail="Student not found for this request")

    action = request.action
    now = utcnow()

    if action == "ACCEPT":
        if student.get("is_active") is False:
            raise HTTPException(status_code=400, detail="Student account is inactive")

        student_id = str(student["_id"])
        current_room = (student.get("room_number") or "").strip()
        target_room = room_change_request["new_room_number"]

        if current_room and current_room != target_room:
            await close_active_room_assignment(
                student_id=student_id,
                status=RoomAssignmentStatus.TRANSFERRED,
                reason=room_change_request["reason"],
                actor=current_user,
                ended_at=now,
            )

            assignment_doc = build_room_assignment_doc(
                student=student,
                room_number=target_room,
                status=RoomAssignmentStatus.ACTIVE,
                reason=room_change_request["reason"],
                actor=current_user,
                started_at=now,
            )
            await db.room_assignments.insert_one(assignment_doc)

        await db.users.update_one(
            {"_id": student["_id"]},
            {
                "$set": {
                    "room_number": target_room,
                    "updated_at": now,
                    "is_active": True,
                },
                "$unset": {
                    "left_at": "",
                    "left_reason": "",
                },
            },
        )

        await create_student_notification(
            student=student,
            title="Room Change Request Approved",
            message=(
                f"Your room change request has been approved. "
                f"New room: {target_room}."
            ),
            metadata={
                "type": "ROOM_CHANGE_REQUEST",
                "action": "ACCEPT",
                "new_room_number": target_room,
            },
        )

    else:
        await create_student_notification(
            student=student,
            title="Room Change Request Denied",
            message="Your room change request has been denied by admin.",
            metadata={
                "type": "ROOM_CHANGE_REQUEST",
                "action": "DENY",
                "requested_room_number": room_change_request.get("new_room_number"),
            },
        )

    await db[ROOM_CHANGE_REQUESTS_COLLECTION].delete_one({"_id": request_object_id})

    return {
        "message": (
            "Room change request accepted and student notified"
            if action == "ACCEPT"
            else "Room change request denied and student notified"
        )
    }


@router.post("/admin/add-user")
async def add_user(request: AddUserRequest, current_user: dict = Depends(get_current_user)):
    """Admin endpoint to add guards or students"""
    require_admin(current_user)
    if request.role not in [UserRole.GUARD, UserRole.STUDENT]:
        raise HTTPException(status_code=400, detail="Invalid role")

    hostel_type = validate_hostel_type(request.hostel_type)

    user_data = {
        "name": request.name,
        "role": request.role,
        "hostel_type": hostel_type,
        "is_active": True,
        "created_at": utcnow()
    }

    if request.role == UserRole.GUARD:
        if not request.username or not request.password:
            raise HTTPException(status_code=400, detail="Username and password required for guards")

        existing = await db.users.find_one({"username": request.username})
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")

        user_data["username"] = request.username
        user_data["password"] = hash_password(request.password)

    elif request.role == UserRole.STUDENT:
        if not request.roll_number or not request.email or not request.room_number:
            raise HTTPException(status_code=400, detail="Roll number, email, and room number required for students")

        existing = await db.users.find_one({"roll_number": request.roll_number})
        if existing:
            raise HTTPException(status_code=400, detail="Student with this roll number already exists")

        user_data["roll_number"] = request.roll_number
        user_data["email"] = request.email
        user_data["room_number"] = request.room_number
        if request.contact_number:
            user_data["contact_number"] = request.contact_number

    try:
        result = await db.users.insert_one(user_data)
    except DuplicateKeyError:
        # Unique index rejected a concurrent duplicate after our existence check.
        if request.role == UserRole.GUARD:
            raise HTTPException(status_code=400, detail="Username already exists")
        raise HTTPException(status_code=400, detail="Student with this roll number already exists")
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


@router.patch("/admin/student/room-transfer")
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

    now = utcnow()
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


@router.patch("/admin/student/deactivate")
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

    now = utcnow()
    await close_active_room_assignment(
        student_id=student_id,
        status=RoomAssignmentStatus.LEFT_HOSTEL,
        reason=request.reason,
        actor=current_user,
        ended_at=now,
    )

    retention_expires_at = compute_ist_retention_expiry_utc(now, LEFT_STUDENT_RETENTION_DAYS)
    archived_doc: Dict[str, Any] = {
        "source_user_id": str(student["_id"]),
        "name": student.get("name"),
        "roll_number": student.get("roll_number"),
        "email": student.get("email"),
        "contact_number": student.get("contact_number"),
        "hostel_type": student.get("hostel_type"),
        "room_number_before_leaving": student.get("room_number"),
        "left_at": now,
        "left_reason": request.reason,
        "archived_at": now,
        "expires_at": retention_expires_at,
        "archived_by_user_id": str(current_user["_id"]),
        "archived_by_role": current_user.get("role"),
    }
    await left_users_db[LEFT_STUDENTS_ARCHIVE_COLLECTION].insert_one(archived_doc)

    await db.users.delete_one({"_id": student["_id"]})

    await db[ROOM_CHANGE_REQUESTS_COLLECTION].delete_many({"student_id": student_id})
    await db[STUDENT_NOTIFICATIONS_COLLECTION].delete_many({"student_id": student_id})

    student_email = (student.get("email") or "").strip()
    if student_email:
        await db.otps.update_many(
            {"email": student_email, "is_used": False},
            {"$set": {"is_used": True}},
        )

    return {
        "message": "Student marked as left and archived successfully",
        "roll_number": request.roll_number,
        "hostel_type": hostel_type,
        "left_at": serialize_datetime_ist(now),
        "archive_expires_at": serialize_datetime_ist(retention_expires_at),
    }


@router.get("/admin/student/room-history")
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


@router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users (for admin)"""
    require_admin(current_user)
    users = await db.users.find().to_list(1000)
    for user in users:
        user["_id"] = str(user["_id"])
        user.pop("password", None)
    return {"users": users}


@router.get("/admin/parcels/delivered/summary")
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


@router.get("/admin/parcels/delivered/auto-delete-status")
async def get_delivered_auto_delete_status(current_user: dict = Depends(get_current_user)):
    """Get the automatic delivered parcel cleanup countdown"""
    require_admin(current_user)
    return await get_auto_delete_status()


@router.delete("/admin/parcels/delivered")
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
