"""Authentication, password hashing, JWT issuance/validation, and auth dependencies."""
import hashlib
import hmac
import secrets
import string
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List

import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext

from .config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    SECRET_KEY,
    TOKEN_REVOCATIONS_COLLECTION,
    UserRole,
    utcnow,
)
from .db import db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def generate_qr_token() -> str:
    """Generate a secure random token for QR code pickup."""
    return str(uuid.uuid4())


def generate_otp() -> str:
    return ''.join(secrets.choice(string.digits) for _ in range(6))


def hash_secret_value(secret_value: str) -> str:
    material = f"{SECRET_KEY}:{secret_value}".encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def secret_matches(stored_hash, candidate_value: str) -> bool:
    if not stored_hash:
        return False
    computed = hash_secret_value(candidate_value)
    return hmac.compare_digest(stored_hash, computed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "iat": utcnow(),
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
        "expires_at": {"$gt": utcnow()},
    })
    return revoked is not None


def require_admin(user: dict):
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can access this endpoint")


def require_active_account(user: dict):
    if user.get("is_active") is False:
        raise HTTPException(status_code=401, detail="Account is inactive")


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
