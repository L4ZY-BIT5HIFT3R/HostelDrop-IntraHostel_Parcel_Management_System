"""Student self-service routes: room change requests and notifications."""
from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument

from core.config import (
    ROOM_CHANGE_DAILY_COUNTER_COLLECTION,
    ROOM_CHANGE_REQUEST_DAILY_LIMIT,
    ROOM_CHANGE_REQUESTS_COLLECTION,
    STUDENT_NOTIFICATIONS_COLLECTION,
    UserRole,
    utcnow,
)
from core.db import db
from core.domain import get_ist_day_window_utc, normalize_datetime_values
from core.models import CreateRoomChangeRequest
from core.security import get_current_user, require_active_account

router = APIRouter(prefix="/api")


@router.post("/student/room-change-request")
async def create_room_change_request(
    request: CreateRoomChangeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Student creates a room change request for admin review."""
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can create room change requests")

    require_active_account(current_user)
    current_room = (current_user.get("room_number") or "").strip()
    if not current_room:
        raise HTTPException(status_code=400, detail="Current room is not assigned")
    if current_room == request.new_room_number:
        raise HTTPException(status_code=400, detail="New room must be different from current room")

    student_id = str(current_user["_id"])
    existing_pending = await db[ROOM_CHANGE_REQUESTS_COLLECTION].find_one({
        "student_id": student_id,
        "status": "PENDING",
    })
    if existing_pending:
        raise HTTPException(status_code=409, detail="You already have a pending room change request")

    day_window = get_ist_day_window_utc()
    counter = await db[ROOM_CHANGE_DAILY_COUNTER_COLLECTION].find_one_and_update(
        {"day_start": day_window["start"]},
        {
            "$inc": {"count": 1},
            "$setOnInsert": {
                "day_start": day_window["start"],
                "created_at": utcnow(),
            },
            "$set": {"updated_at": utcnow()},
        },
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )

    if (counter or {}).get("count", 0) > ROOM_CHANGE_REQUEST_DAILY_LIMIT:
        await db[ROOM_CHANGE_DAILY_COUNTER_COLLECTION].update_one(
            {"_id": counter["_id"]},
            {"$inc": {"count": -1}, "$set": {"updated_at": utcnow()}},
        )
        raise HTTPException(
            status_code=429,
            detail=(
                "Room change request limit reached for today. "
                f"Please try after {day_window['end_ist'].strftime('%Y-%m-%d %H:%M:%S IST')}."
            ),
        )

    room_change_doc = {
        "student_id": student_id,
        "roll_number": current_user.get("roll_number"),
        "student_name": current_user.get("name"),
        "hostel_type": current_user.get("hostel_type"),
        "current_room_number": current_room,
        "new_room_number": request.new_room_number,
        "reason": request.reason,
        "status": "PENDING",
        "created_at": utcnow(),
    }
    try:
        result = await db[ROOM_CHANGE_REQUESTS_COLLECTION].insert_one(room_change_doc)
    except Exception:
        if counter and counter.get("_id"):
            await db[ROOM_CHANGE_DAILY_COUNTER_COLLECTION].update_one(
                {"_id": counter["_id"]},
                {"$inc": {"count": -1}, "$set": {"updated_at": utcnow()}},
            )
        raise

    return {
        "message": "Room change request submitted successfully",
        "request_id": str(result.inserted_id),
        "current_room_number": current_room,
    }


@router.get("/student/notifications")
async def get_student_notifications(current_user: dict = Depends(get_current_user)):
    """Student fetches in-app notifications."""
    if current_user["role"] != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access notifications")

    notifications = await db[STUDENT_NOTIFICATIONS_COLLECTION].find(
        {"student_id": str(current_user["_id"])}
    ).sort("created_at", -1).to_list(200)

    serialized = []
    for notification in notifications:
        notification["_id"] = str(notification["_id"])
        serialized.append(normalize_datetime_values(notification))

    return {"notifications": serialized}
