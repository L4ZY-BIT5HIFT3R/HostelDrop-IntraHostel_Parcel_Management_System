import asyncio
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import random
import string
import jwt
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

# Configure logging early so startup config warnings are visible.
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
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

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise RuntimeError("JWT_SECRET_KEY must be set in production")
    SECRET_KEY = 'dev-insecure-secret-change-me'
    logger.warning("JWT_SECRET_KEY not set. Using development fallback secret.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

ENABLE_SENSITIVE_LOGGING = os.environ.get("ENABLE_SENSITIVE_LOGGING", "false").strip().lower() == "true"
INCLUDE_DEBUG_OTP_IN_RESPONSE = os.environ.get(
    "INCLUDE_DEBUG_OTP_IN_RESPONSE",
    "false"
).strip().lower() == "true"
if IS_PRODUCTION and INCLUDE_DEBUG_OTP_IN_RESPONSE:
    raise RuntimeError("INCLUDE_DEBUG_OTP_IN_RESPONSE cannot be enabled in production")

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Hostel Parcel Management System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

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
    ADMIN_PASSWORD = 'admin123'
    logger.warning("ADMIN_PASSWORD not set. Using development fallback password.")

AUTO_DELETE_DELIVERED_INTERVAL_SECONDS = max(
    1,
    int(os.environ.get("AUTO_DELETE_DELIVERED_INTERVAL_SECONDS", "300"))
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

class OTPPurpose:
    STUDENT_LOGIN = "STUDENT_LOGIN"
    STUDENT_REGISTRATION = "STUDENT_REGISTRATION"
    PARCEL_DELIVERY = "PARCEL_DELIVERY"

# Request Models
class GuardLoginRequest(BaseModel):
    username: str
    password: str
    hostel_type: str

class StudentRegisterRequest(BaseModel):
    roll_number: str
    email: str
    hostel_type: str

class StudentRegisterVerify(BaseModel):
    name: str
    roll_number: str
    email: str
    hostel_type: str
    room_number: str
    contact_number: Optional[str] = None
    password: str
    otp_code: str

class StudentLoginRequest(BaseModel):
    roll_number: str
    password: str
    hostel_type: str

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

class AddUserRequest(BaseModel):
    name: str
    role: str
    hostel_type: str
    username: Optional[str] = None
    password: Optional[str] = None
    roll_number: Optional[str] = None
    email: Optional[EmailStr] = None
    room_number: Optional[str] = None
    contact_number: Optional[str] = None

class AddParcelRequest(BaseModel):
    hostel_type: str
    room_number: str
    roll_number: Optional[str] = None
    student_name: Optional[str] = None
    description: Optional[str] = None

class AssignParcelRequest(BaseModel):
    parcel_id: str
    roll_number: str
    hostel_type: str
    room_number: str

class UpdateParcelRequest(BaseModel):
    parcel_id: str
    room_number: Optional[str] = None
    roll_number: Optional[str] = None
    student_name: Optional[str] = None
    description: Optional[str] = None

class SendOTPRequest(BaseModel):
    parcel_id: str

class VerifyParcelOTPRequest(BaseModel):
    parcel_id: str
    otp_code: str

class UpdateExpoTokenRequest(BaseModel):
    expo_push_token: str

# ============= QR Code Pickup Models =============

class GenerateQRRequest(BaseModel):
    """Guard requests a one-time QR pickup token for a PENDING parcel."""
    parcel_id: str

class GenerateDelegationRequest(BaseModel):
    """Student generates a delegation code for a friend."""
    parcel_id: str

class VerifyQRRequest(BaseModel):
    """Student submits scanned QR payload to verify and collect their parcel."""
    parcel_id: str
    token: str
    delegation_code: Optional[str] = None

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
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
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
    user["_id"] = str(user["_id"])
    return user

def require_admin(user: dict):
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can access this endpoint")

def validate_hostel_type(hostel_type: str):
    if hostel_type not in [HostelType.BOYS, HostelType.GIRLS]:
        raise HTTPException(status_code=400, detail="Invalid hostel type")

def parse_object_id(raw_id: str, field_name: str) -> ObjectId:
    try:
        return ObjectId(raw_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name} format")

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

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
        current_hash = existing.get("password")
        if not current_hash or not verify_password(ADMIN_PASSWORD, current_hash):
            await db.users.update_one(
                {"_id": existing["_id"]},
                {"$set": {"password": hash_password(ADMIN_PASSWORD)}}
            )
            logger.info("Admin password updated from environment for %s", ADMIN_EMAIL)
        return

    admin_user = {
        "name": "Admin",
        "role": UserRole.ADMIN,
        "hostel_type": HostelType.BOYS,
        "email": ADMIN_EMAIL,
        "password": hash_password(ADMIN_PASSWORD),
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
async def guard_login(request: GuardLoginRequest):
    """Guard login with username and password"""
    validate_hostel_type(request.hostel_type)
    user = await db.users.find_one({
        "username": request.username,
        "role": UserRole.GUARD,
        "hostel_type": request.hostel_type
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({
        "user_id": str(user["_id"]),
        "role": user["role"],
        "hostel_type": user["hostel_type"]
    })
    
    user["_id"] = str(user["_id"])
    user.pop("password", None)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@api_router.post("/auth/admin/login", response_model=TokenResponse)
async def admin_login(request: AdminLoginRequest):
    """Admin login with email and password"""
    user = await db.users.find_one({
        "email": request.email,
        "role": UserRole.ADMIN
    })

    if not user or not user.get("password") or not verify_password(request.password, user["password"]):
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
async def student_login(request: StudentLoginRequest):
    """Student login with roll number and password"""
    validate_hostel_type(request.hostel_type)
    
    user = await db.users.find_one({
        "roll_number": request.roll_number,
        "role": UserRole.STUDENT,
        "hostel_type": request.hostel_type
    })
    
    if not user or not user.get("password") or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({
        "user_id": str(user["_id"]),
        "role": user["role"],
        "hostel_type": user["hostel_type"]
    })
    
    user["_id"] = str(user["_id"])
    user.pop("password", None)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@api_router.post("/auth/student/register/request-otp")
async def student_register_request_otp(request: StudentRegisterRequest):
    """Request OTP for student self-registration"""
    validate_hostel_type(request.hostel_type)
    existing = await db.users.find_one({
        "$or": [
            {"roll_number": request.roll_number, "role": UserRole.STUDENT},
            {"email": request.email, "role": UserRole.STUDENT},
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Student already registered. Please login.")

    await db.otps.update_many({
        "email": request.email,
        "purpose": OTPPurpose.STUDENT_REGISTRATION,
        "is_used": False
    }, {"$set": {"is_used": True}})

    otp_code = generate_otp()
    expiry_time = datetime.utcnow() + timedelta(minutes=10)
    otp_doc = {
        "email": request.email,
        "purpose": OTPPurpose.STUDENT_REGISTRATION,
        "otp_code": otp_code,
        "expiry_time": expiry_time,
        "is_used": False,
        "created_at": datetime.utcnow()
    }
    await db.otps.insert_one(otp_doc)
    await send_email_otp(request.email, otp_code)
    return {"message": "Registration OTP sent to your email", "email": request.email}

@api_router.post("/auth/student/register/verify-otp", response_model=TokenResponse)
async def student_register_verify_otp(request: StudentRegisterVerify):
    """Verify OTP and create a new student account"""
    validate_hostel_type(request.hostel_type)
    existing = await db.users.find_one({
        "$or": [
            {"roll_number": request.roll_number, "role": UserRole.STUDENT},
            {"email": request.email, "role": UserRole.STUDENT},
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Student already registered. Please login.")

    otp = await db.otps.find_one({
        "email": request.email,
        "purpose": OTPPurpose.STUDENT_REGISTRATION,
        "otp_code": request.otp_code,
        "is_used": False
    })
    if not otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    if otp["expiry_time"] < datetime.utcnow():
        raise HTTPException(status_code=401, detail="OTP has expired")

    await db.otps.update_one(
        {"_id": otp["_id"]},
        {"$set": {"is_used": True}}
    )

    student_doc = {
        "name": request.name.strip(),
        "role": UserRole.STUDENT,
        "hostel_type": request.hostel_type,
        "roll_number": request.roll_number.strip(),
        "email": request.email,
        "password": hash_password(request.password),
        "room_number": request.room_number.strip(),
        "created_at": datetime.utcnow()
    }
    if request.contact_number and request.contact_number.strip():
        student_doc["contact_number"] = request.contact_number.strip()

    result = await db.users.insert_one(student_doc)
    student_doc["_id"] = str(result.inserted_id)

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

# ============= Admin Routes =============

@api_router.post("/admin/add-user")
async def add_user(request: AddUserRequest, current_user: dict = Depends(get_current_user)):
    """Admin endpoint to add guards or students"""
    require_admin(current_user)
    # Validate role
    if request.role not in [UserRole.GUARD, UserRole.STUDENT]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Validate hostel type
    validate_hostel_type(request.hostel_type)
    
    user_data = {
        "name": request.name,
        "role": request.role,
        "hostel_type": request.hostel_type,
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
    user_data.pop("password", None)
    
    return {"message": "User added successfully", "user": user_data}

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
async def delete_delivered_parcels(hostel_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Delete delivered parcels (optionally scoped to a hostel type)"""
    require_admin(current_user)
    query = {"status": ParcelStatus.DELIVERED}
    if hostel_type:
        validate_hostel_type(hostel_type)
        query["hostel_type"] = hostel_type

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
    validate_hostel_type(request.hostel_type)
    if request.hostel_type != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Guards can only add parcels for their own hostel")
    
    parcel_data = {
        "display_id": generate_display_id(request.description),
        "hostel_type": current_user["hostel_type"],
        "room_number": request.room_number,
        "description": request.description,
        "logged_by_guard": current_user["_id"],
        "created_at": datetime.utcnow()
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
    
    return {"message": "Parcel added successfully", "parcel": parcel_data}

@api_router.put("/parcel/assign")
async def assign_parcel(request: AssignParcelRequest, current_user: dict = Depends(get_current_user)):
    """Guard assigns unassigned parcel to a student"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can assign parcels")
    validate_hostel_type(request.hostel_type)
    if request.hostel_type != current_user["hostel_type"]:
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
    result = await db.parcels.update_one(
        {"_id": parcel_object_id},
        {"$set": {
            "student_id": str(student["_id"]),
            "roll_number": request.roll_number,
            "student_name": student["name"],
            "student_email": student["email"],
            "room_number": request.room_number,
            "hostel_type": current_user["hostel_type"],
            "status": ParcelStatus.PENDING
        }}
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

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    updates["updated_at"] = datetime.utcnow()
    await db.parcels.update_one({"_id": parcel_object_id}, {"$set": updates})
    updated_parcel = await db.parcels.find_one({"_id": parcel_object_id})
    updated_parcel["_id"] = str(updated_parcel["_id"])
    return {"message": "Parcel updated successfully", "parcel": updated_parcel}

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
    }, {"$set": {"is_used": True}})

    # Generate OTP
    otp_code = generate_otp()
    expiry_time = datetime.utcnow() + timedelta(minutes=10)
    
    # Save OTP
    otp_doc = {
        "parcel_id": request.parcel_id,
        "email": parcel["student_email"],
        "purpose": OTPPurpose.PARCEL_DELIVERY,
        "otp_code": otp_code,
        "expiry_time": expiry_time,
        "is_used": False,
        "created_at": datetime.utcnow()
    }
    
    await db.otps.insert_one(otp_doc)
    
    # Send OTP
    await send_email_otp(parcel["student_email"], otp_code)
    
    response_payload = {
        "message": "OTP sent to student email",
        "email": parcel["student_email"]
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
    otp = await db.otps.find_one({
        "parcel_id": request.parcel_id,
        "purpose": OTPPurpose.PARCEL_DELIVERY,
        "otp_code": request.otp_code,
        "is_used": False
    })
    
    if not otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Check expiry
    if otp["expiry_time"] < datetime.utcnow():
        raise HTTPException(status_code=401, detail="OTP has expired")
    
    # Mark OTP as used
    await db.otps.update_one(
        {"_id": otp["_id"]},
        {"$set": {"is_used": True}}
    )
    
    # Update parcel status
    await db.parcels.update_one(
        {"_id": parcel_object_id},
        {"$set": {
            "status": ParcelStatus.DELIVERED,
            "delivered_at": datetime.utcnow()
        }}
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
    await db.parcels.update_one(
        {"_id": parcel_object_id},
        {"$set": {"qr_pickup_token": qr_token}}
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
        
    delegation_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    expiry_time = datetime.utcnow() + timedelta(minutes=10)
    
    await db.parcels.update_one(
        {"_id": parcel_object_id},
        {"$set": {
            "delegation_code": delegation_code,
            "delegation_expiry": expiry_time
        }}
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
        
    # Security: Ensure this student owns the parcel, OR provided a valid delegation code
    if parcel.get("student_id") != current_user["_id"]:
        if not request.delegation_code or parcel.get("delegation_code") != request.delegation_code.upper():
            raise HTTPException(status_code=403, detail="This parcel belongs to a different student")
        delegation_expiry = parcel.get("delegation_expiry")
        if not delegation_expiry or delegation_expiry < datetime.utcnow():
            raise HTTPException(status_code=401, detail="Delegation code has expired")
        
    # Verify the token matches
    saved_token = parcel.get("qr_pickup_token")
    if not saved_token or saved_token != request.token:
        raise HTTPException(status_code=401, detail="Invalid or expired QR code")
        
    # Mark as delivered and clear token and delegation fields
    await db.parcels.update_one(
        {"_id": parcel_object_id},
        {
            "$set": {
                "status": ParcelStatus.DELIVERED,
                "delivered_at": datetime.utcnow(),
                "collected_by_delegate": parcel.get("student_id") != current_user["_id"]
            },
            "$unset": {
                "qr_pickup_token": "",
                "delegation_code": "",
                "delegation_expiry": ""
            }
        }
    )
    
    return {"message": "Parcel claimed successfully via QR code!"}

@api_router.get("/parcel/hostel/{hostel_type}")
async def get_hostel_parcels(hostel_type: str, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get parcels for a specific hostel"""
    validate_hostel_type(hostel_type)
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
        query["status"] = {"$in": [ParcelStatus.PENDING, ParcelStatus.UNASSIGNED]}
    elif status:
        query["status"] = status
    
    parcels = await db.parcels.find(query).sort("created_at", -1).to_list(1000)
    
    for parcel in parcels:
        parcel["_id"] = str(parcel["_id"])
    
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
    
    for parcel in parcels:
        parcel["_id"] = str(parcel["_id"])
    
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
    
    for parcel in parcels:
        parcel["_id"] = str(parcel["_id"])
    
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
    
    for parcel in parcels:
        parcel["_id"] = str(parcel["_id"])
    
    return {"parcels": parcels}

@api_router.get("/student/{student_id}")
async def get_student_details(student_id: str, current_user: dict = Depends(get_current_user)):
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
