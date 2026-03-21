from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
import google.auth.transport.requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import base64

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

# Gmail OAuth2 Configuration (User will provide these after app completion)
GMAIL_CLIENT_ID = os.environ.get('GMAIL_CLIENT_ID', '')
GMAIL_CLIENT_SECRET = os.environ.get('GMAIL_CLIENT_SECRET', '')
GMAIL_REFRESH_TOKEN = os.environ.get('GMAIL_REFRESH_TOKEN', '')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@hostel.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')
if not ADMIN_PASSWORD:
    if IS_PRODUCTION:
        raise RuntimeError("ADMIN_PASSWORD must be set in production")
    ADMIN_PASSWORD = 'admin123'
    logger.warning("ADMIN_PASSWORD not set. Using development fallback password.")

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

class StudentOTPRequest(BaseModel):
    roll_number: str
    email: EmailStr
    hostel_type: str

class StudentOTPVerify(BaseModel):
    roll_number: str
    email: EmailStr
    otp_code: str

class StudentRegisterVerify(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    roll_number: str
    email: EmailStr
    hostel_type: str
    room_number: str = Field(..., min_length=1, max_length=20)
    otp_code: str
    contact_number: Optional[str] = None

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

# Response Models
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class ParcelResponse(BaseModel):
    id: str
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

async def send_email_otp(email: str, otp_code: str):
    """Send OTP via Gmail OAuth2"""
    try:
        # Check if Gmail credentials are configured
        if not GMAIL_CLIENT_ID or not GMAIL_CLIENT_SECRET or not GMAIL_REFRESH_TOKEN:
            if ENABLE_SENSITIVE_LOGGING:
                logger.info("Gmail not configured. OTP for %s: %s", email, otp_code)
            else:
                logger.info("Gmail not configured. Generated OTP for %s", mask_email(email))
            return True
        
        # Create credentials from refresh token
        creds = Credentials(
            None,
            refresh_token=GMAIL_REFRESH_TOKEN,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=GMAIL_CLIENT_ID,
            client_secret=GMAIL_CLIENT_SECRET
        )
        
        # Refresh the access token
        creds.refresh(google.auth.transport.requests.Request())
        
        # Build Gmail service
        service = build('gmail', 'v1', credentials=creds)
        
        # Create email message
        message = MIMEMultipart()
        message['to'] = email
        message['subject'] = 'Hostel Parcel Management - OTP Verification'
        
        body = f"""
        Dear Student,
        
        Your OTP for parcel verification is: {otp_code}
        
        This OTP is valid for 10 minutes.
        
        Please do not share this OTP with anyone.
        
        Regards,
        Hostel Parcel Management System
        """
        
        message.attach(MIMEText(body, 'plain'))
        
        # Encode message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        # Send email
        service.users().messages().send(
            userId='me',
            body={'raw': raw_message}
        ).execute()

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
        # Check if Gmail credentials are configured
        if not GMAIL_CLIENT_ID or not GMAIL_CLIENT_SECRET or not GMAIL_REFRESH_TOKEN:
            logger.info("Gmail not configured. Notification queued for %s", mask_email(email))
            return True
        
        # Create credentials from refresh token
        creds = Credentials(
            None,
            refresh_token=GMAIL_REFRESH_TOKEN,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=GMAIL_CLIENT_ID,
            client_secret=GMAIL_CLIENT_SECRET
        )
        
        # Refresh the access token
        creds.refresh(google.auth.transport.requests.Request())
        
        # Build Gmail service
        service = build('gmail', 'v1', credentials=creds)
        
        # Create email message
        message = MIMEMultipart()
        message['to'] = email
        message['subject'] = 'Hostel Parcel Management - New Parcel Notification'
        
        body = f"""
        Dear {student_name},
        
        A new parcel has been logged for you!
        
        Room Number: {room_number}
        
        Please collect your parcel from the hostel reception. You will need to verify OTP during collection.
        
        Regards,
        Hostel Parcel Management System
        """
        
        message.attach(MIMEText(body, 'plain'))
        
        # Encode message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        # Send email
        service.users().messages().send(
            userId='me',
            body={'raw': raw_message}
        ).execute()

        logger.info("Notification email sent to %s", mask_email(email))
        return True

    except Exception as e:
        logger.warning("Error sending notification email: %s", str(e))
        logger.info("Notification fallback recorded for %s", mask_email(email))
        return True

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

@api_router.post("/auth/student/request-otp")
async def student_request_otp(request: StudentOTPRequest):
    """Request OTP for student login"""
    validate_hostel_type(request.hostel_type)
    # Check if student exists
    user = await db.users.find_one({
        "roll_number": request.roll_number,
        "email": request.email,
        "role": UserRole.STUDENT,
        "hostel_type": request.hostel_type
    })
    
    if not user:
        raise HTTPException(status_code=404, detail="Student not found with provided credentials")
    
    # Invalidate any previous unused OTPs for this email
    await db.otps.update_many({
        "email": request.email,
        "purpose": OTPPurpose.STUDENT_LOGIN,
        "is_used": False
    }, {"$set": {"is_used": True}})

    # Generate OTP
    otp_code = generate_otp()
    expiry_time = datetime.utcnow() + timedelta(minutes=10)
    
    # Save OTP to database
    otp_doc = {
        "email": request.email,
        "purpose": OTPPurpose.STUDENT_LOGIN,
        "otp_code": otp_code,
        "expiry_time": expiry_time,
        "is_used": False,
        "created_at": datetime.utcnow()
    }
    
    await db.otps.insert_one(otp_doc)
    
    # Send OTP via email
    await send_email_otp(request.email, otp_code)
    
    return {"message": "OTP sent to your email", "email": request.email}

@api_router.post("/auth/student/verify-otp", response_model=TokenResponse)
async def student_verify_otp(request: StudentOTPVerify):
    """Verify OTP and login student"""
    # Find OTP
    otp = await db.otps.find_one({
        "email": request.email,
        "purpose": OTPPurpose.STUDENT_LOGIN,
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
    
    # Get user
    user = await db.users.find_one({
        "roll_number": request.roll_number,
        "email": request.email,
        "role": UserRole.STUDENT
    })
    
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    
    token = create_access_token({
        "user_id": str(user["_id"]),
        "role": user["role"],
        "hostel_type": user["hostel_type"]
    })
    
    user["_id"] = str(user["_id"])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@api_router.post("/auth/student/register/request-otp")
async def student_register_request_otp(request: StudentOTPRequest):
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

@api_router.delete("/admin/parcels/delivered")
async def delete_delivered_parcels(hostel_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Delete delivered parcels (optionally scoped to a hostel type)"""
    require_admin(current_user)
    query = {"status": ParcelStatus.DELIVERED}
    if hostel_type:
        validate_hostel_type(hostel_type)
        query["hostel_type"] = hostel_type

    result = await db.parcels.delete_many(query)
    return {
        "message": "Delivered parcels deleted successfully",
        "deleted_count": result.deleted_count,
    }

# ============= Parcel Routes =============

@api_router.post("/parcel/add")
async def add_parcel(request: AddParcelRequest, current_user: dict = Depends(get_current_user)):
    """Guard adds a new parcel"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can add parcels")
    validate_hostel_type(request.hostel_type)
    if request.hostel_type != current_user["hostel_type"]:
        raise HTTPException(status_code=403, detail="Guards can only add parcels for their own hostel")
    
    parcel_data = {
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
            
            # Send notification email to student
            try:
                await send_parcel_notification(student["email"], student["name"], request.room_number)
            except Exception as e:
                logger.warning("Failed to send notification email: %s", str(e))
    else:
        # Only UNASSIGNED if no roll number provided
        parcel_data["status"] = ParcelStatus.UNASSIGNED
        parcel_data["student_name"] = request.student_name
    
    result = await db.parcels.insert_one(parcel_data)
    parcel_data["_id"] = str(result.inserted_id)
    
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
        query["status"] = ParcelStatus.PENDING
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
    client.close()

@app.on_event("startup")
async def startup_seed_admin():
    await ensure_admin_user()
