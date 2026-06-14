"""Domain helpers: parcels, rooms, datetime handling, cleanup, and bootstrap."""
import asyncio
import os
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from pymongo.errors import PyMongoError

from .config import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    AUTO_DELETE_DELIVERED_INTERVAL_SECONDS,
    AUTO_DELETE_DELIVERED_POLL_SECONDS,
    HostelType,
    IS_PRODUCTION,
    IST_TIMEZONE,
    LEFT_STUDENTS_ARCHIVE_COLLECTION,
    ParcelStatus,
    ParcelTimelineEvent,
    ROOM_CHANGE_DAILY_COUNTER_COLLECTION,
    ROOM_CHANGE_REQUESTS_COLLECTION,
    RoomAssignmentStatus,
    STUDENT_NOTIFICATIONS_COLLECTION,
    STUDENT_NOTIFICATION_TTL_SECONDS,
    TOKEN_REVOCATIONS_COLLECTION,
    UserRole,
    logger,
    utcnow,
)
from .db import db, left_users_db
from .security import hash_password, verify_password

AUTO_DELETE_STATE = {
    "last_run_at": None,
    "last_deleted_count": 0,
}


def generate_display_id(description: Optional[str]) -> str:
    """Generate a human-readable parcel ID like PF1024 or PU0001"""
    prefix = "U"
    if description:
        desc_upper = description.upper()
        if "FLIPKART" in desc_upper:
            prefix = "F"
        elif "AMAZON" in desc_upper:
            prefix = "A"
        elif "MYNTRA" in desc_upper:
            prefix = "M"
        elif "BLINKIT" in desc_upper:
            prefix = "B"
        elif "SWIGGY" in desc_upper:
            prefix = "S"
        elif "ZOMATO" in desc_upper:
            prefix = "Z"
        else:
            alpha_chars = [c for c in desc_upper if c.isalpha()]
            if alpha_chars:
                prefix = alpha_chars[0]

    rand_num = "".join(random.choices(string.digits, k=4))
    return f"P{prefix}{rand_num}"


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
    now = utcnow()
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


def ensure_utc_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def get_ist_day_window_utc(now: Optional[datetime] = None) -> Dict[str, datetime]:
    current_utc = now or utcnow()
    current_aware = ensure_utc_datetime(current_utc)
    current_ist = current_aware.astimezone(IST_TIMEZONE)
    day_start_ist = current_ist.replace(hour=0, minute=0, second=0, microsecond=0)
    next_day_ist = day_start_ist + timedelta(days=1)

    day_start_utc = day_start_ist.astimezone(timezone.utc).replace(tzinfo=None)
    next_day_utc = next_day_ist.astimezone(timezone.utc).replace(tzinfo=None)
    return {
        "start": day_start_utc,
        "end": next_day_utc,
        "start_ist": day_start_ist,
        "end_ist": next_day_ist,
    }


def build_status_event(
    event: str,
    actor: Optional[dict] = None,
    timestamp: Optional[datetime] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    event_doc: Dict[str, Any] = {
        "event": event,
        "timestamp": timestamp or utcnow(),
    }
    if actor:
        if actor.get("_id"):
            event_doc["actor_id"] = str(actor["_id"])
        if actor.get("role"):
            event_doc["actor_role"] = actor["role"]
    if meta:
        event_doc["meta"] = meta
    return event_doc


def parcel_claimed_by_user(parcel: Dict[str, Any], current_user: Dict[str, Any]) -> bool:
    user_id = current_user.get("_id")
    user_id_str = str(user_id) if user_id is not None else ""

    owner_id = parcel.get("student_id")
    delegate_id = parcel.get("delegated_receiver_student_id")

    return (
        owner_id == user_id
        or str(owner_id) == user_id_str
        or str(delegate_id) == user_id_str
    )


def serialize_datetime_utc(value: datetime) -> str:
    return ensure_utc_datetime(value).isoformat().replace("+00:00", "Z")


def serialize_datetime_ist(value: datetime) -> str:
    return ensure_utc_datetime(value).astimezone(IST_TIMEZONE).isoformat()


def compute_ist_retention_expiry_utc(from_utc: datetime, retention_days: int) -> datetime:
    """Compute retention expiry based on IST calendar time and return naive UTC datetime for Mongo TTL."""
    source_aware = ensure_utc_datetime(from_utc)
    source_ist = source_aware.astimezone(IST_TIMEZONE)
    expiry_ist = source_ist + timedelta(days=retention_days)
    return expiry_ist.astimezone(timezone.utc).replace(tzinfo=None)


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
                event_doc["timestamp"] = timestamp or utcnow()
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
    """Backfill parcel ownership for students who register after parcels were logged."""
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


def get_cors_origins() -> List[str]:
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    if IS_PRODUCTION:
        raise RuntimeError("CORS_ORIGINS must be set in production")

    logger.warning("CORS_ORIGINS not set. Allowing all origins in development.")
    return ["*"]


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
        "created_at": utcnow(),
    }
    await db.users.insert_one(admin_user)


async def ensure_database_indexes() -> None:
    await db[TOKEN_REVOCATIONS_COLLECTION].create_index(
        "expires_at",
        expireAfterSeconds=0,
    )
    await db[ROOM_CHANGE_REQUESTS_COLLECTION].create_index(
        [("status", 1), ("hostel_type", 1), ("created_at", 1)],
        name="room_change_requests_pending_lookup",
    )
    await db[ROOM_CHANGE_DAILY_COUNTER_COLLECTION].create_index(
        "day_start",
        unique=True,
        name="room_change_daily_counter_unique_day",
    )
    await db[ROOM_CHANGE_DAILY_COUNTER_COLLECTION].create_index(
        "created_at",
        expireAfterSeconds=max(86400, 3 * 24 * 60 * 60),
        name="room_change_daily_counter_ttl",
    )
    await db[STUDENT_NOTIFICATIONS_COLLECTION].create_index(
        [("student_id", 1), ("created_at", -1)],
        name="student_notifications_lookup",
    )
    await db[STUDENT_NOTIFICATIONS_COLLECTION].create_index(
        "created_at",
        expireAfterSeconds=STUDENT_NOTIFICATION_TTL_SECONDS,
        name="student_notifications_ttl",
    )
    await left_users_db[LEFT_STUDENTS_ARCHIVE_COLLECTION].create_index(
        "source_user_id",
        name="left_students_archive_source_user_lookup",
    )
    await left_users_db[LEFT_STUDENTS_ARCHIVE_COLLECTION].create_index(
        "expires_at",
        expireAfterSeconds=0,
        name="left_students_archive_ttl",
    )

    # Database-level uniqueness for accounts. These close the find-then-insert
    # race where two concurrent registrations could both pass the app-level
    # existence check and create duplicate accounts. Partial filters scope each
    # constraint to the role that actually owns the field. Index creation is
    # wrapped so a pre-existing duplicate in legacy data cannot crash startup —
    # the duplicate is logged for manual cleanup instead.
    unique_account_indexes = [
        ("roll_number", {"role": UserRole.STUDENT}, "users_student_roll_number_unique"),
        ("email", {"role": UserRole.STUDENT}, "users_student_email_unique"),
        ("username", {"role": UserRole.GUARD}, "users_guard_username_unique"),
    ]
    for field, partial_filter, index_name in unique_account_indexes:
        try:
            await db.users.create_index(
                field,
                unique=True,
                partialFilterExpression=partial_filter,
                name=index_name,
            )
        except PyMongoError as exc:
            logger.warning(
                "Could not create unique index %s on users.%s "
                "(likely pre-existing duplicate data needing cleanup): %s",
                index_name,
                field,
                exc,
            )


async def delete_delivered_parcels_by_query(query: dict) -> int:
    result = await db.parcels.delete_many(query)
    return result.deleted_count


async def get_auto_delete_status() -> dict:
    now = utcnow()
    oldest_delivered = await db.parcels.find_one(
        {
            "status": ParcelStatus.DELIVERED,
            "delivered_at": {"$exists": True, "$ne": None},
        },
        sort=[("delivered_at", 1)],
    )

    next_run_at: Optional[datetime] = None
    remaining_seconds = 0
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
        "next_run_at": serialize_datetime_ist(next_run_at) if next_run_at else None,
        "remaining_seconds": remaining_seconds,
        "has_pending_cleanup": has_pending_cleanup,
        "last_run_at": (
            serialize_datetime_ist(AUTO_DELETE_STATE["last_run_at"])
            if AUTO_DELETE_STATE["last_run_at"] else None
        ),
        "server_time_ist": serialize_datetime_ist(now),
        "last_deleted_count": AUTO_DELETE_STATE["last_deleted_count"],
    }


async def periodic_delivered_cleanup():
    while True:
        await asyncio.sleep(AUTO_DELETE_DELIVERED_POLL_SECONDS)
        try:
            cutoff = utcnow() - timedelta(seconds=AUTO_DELETE_DELIVERED_INTERVAL_SECONDS)
            deleted_count = await delete_delivered_parcels_by_query({
                "status": ParcelStatus.DELIVERED,
                "delivered_at": {"$lte": cutoff},
            })
            AUTO_DELETE_STATE["last_run_at"] = utcnow()
            AUTO_DELETE_STATE["last_deleted_count"] = deleted_count
            if deleted_count:
                logger.info(
                    "Auto-deleted %s delivered parcel(s) after retention expiry",
                    deleted_count,
                )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            AUTO_DELETE_STATE["last_run_at"] = utcnow()
            AUTO_DELETE_STATE["last_deleted_count"] = 0
            logger.warning("Automatic delivered parcel cleanup failed: %s", exc)
