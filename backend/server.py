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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import google.auth.transport.requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

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
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

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
    user = await db.users.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user["_id"] = str(user["_id"])
    return user

def require_admin(user: dict):
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can access this endpoint")

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

async def send_email_otp(email: str, otp_code: str):
    """Send OTP via Gmail OAuth2"""
    try:
        # Check if Gmail credentials are configured
        if not GMAIL_CLIENT_ID or not GMAIL_CLIENT_SECRET or not GMAIL_REFRESH_TOKEN:
            print(f"Gmail not configured. OTP for {email}: {otp_code}")
            # For development, just log the OTP
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
        send_message = service.users().messages().send(
            userId='me',
            body={'raw': raw_message}
        ).execute()
        
        print(f"Email sent successfully to {email}")
        return True
        
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        print(f"OTP for {email}: {otp_code}")
        # For development, return True even if email fails
        return True

async def ensure_admin_user():
    existing = await db.users.find_one({"role": UserRole.ADMIN, "email": ADMIN_EMAIL})
    if existing:
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
            print(f"Gmail not configured. Notification for {email}: Parcel logged for Room {room_number}")
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
        send_message = service.users().messages().send(
            userId='me',
            body={'raw': raw_message}
        ).execute()
        
        print(f"Notification email sent successfully to {email}")
        return True
        
    except Exception as e:
        print(f"Error sending notification email: {str(e)}")
        print(f"Notification for {email}: Parcel logged for Room {room_number}")
        return True

# ============= Routes =============

@api_router.get("/")
async def root():
    return {"message": "Hostel Parcel Management API", "version": "1.0"}

# ============= Authentication Routes =============

@api_router.post("/auth/guard/login", response_model=TokenResponse)
async def guard_login(request: GuardLoginRequest):
    """Guard login with username and password"""
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
        "is_used": False
    }, {"$set": {"is_used": True}})

    # Generate OTP
    otp_code = generate_otp()
    expiry_time = datetime.utcnow() + timedelta(minutes=10)
    
    # Save OTP to database
    otp_doc = {
        "email": request.email,
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

# ============= Admin Routes =============

@api_router.post("/admin/add-user")
async def add_user(request: AddUserRequest, current_user: dict = Depends(get_current_user)):
    """Admin endpoint to add guards or students"""
    require_admin(current_user)
    # Validate role
    if request.role not in [UserRole.GUARD, UserRole.STUDENT]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Validate hostel type
    if request.hostel_type not in [HostelType.BOYS, HostelType.GIRLS]:
        raise HTTPException(status_code=400, detail="Invalid hostel type")
    
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
        if hostel_type not in [HostelType.BOYS, HostelType.GIRLS]:
            raise HTTPException(status_code=400, detail="Invalid hostel type")
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
    
    parcel_data = {
        "hostel_type": request.hostel_type,
        "room_number": request.room_number,
        "description": request.description,
        "logged_by_guard": current_user["_id"],
        "created_at": datetime.utcnow()
    }
    
    if request.roll_number:
        # Find student by roll number
        student = await db.users.find_one({
            "roll_number": request.roll_number,
            "role": UserRole.STUDENT
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
                print(f"Failed to send notification email: {str(e)}")
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
    
    # Validate parcel exists first
    try:
        parcel = await db.parcels.find_one({"_id": ObjectId(request.parcel_id)})
        if not parcel:
            raise HTTPException(status_code=404, detail=f"Parcel not found with ID: {request.parcel_id}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid parcel ID format: {str(e)}")
    
    # Find student
    student = await db.users.find_one({
        "roll_number": request.roll_number,
        "role": UserRole.STUDENT,
        "hostel_type": request.hostel_type
    })
    
    if not student:
        raise HTTPException(status_code=404, detail=f"Student not found with roll number: {request.roll_number}")
    
    # Update parcel
    result = await db.parcels.update_one(
        {"_id": ObjectId(request.parcel_id)},
        {"$set": {
            "student_id": str(student["_id"]),
            "roll_number": request.roll_number,
            "student_name": student["name"],
            "student_email": student["email"],
            "room_number": request.room_number,
            "hostel_type": request.hostel_type,
            "status": ParcelStatus.PENDING
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to update parcel")
    
    # Send notification email to student
    try:
        await send_parcel_notification(student["email"], student["name"], request.room_number)
    except Exception as e:
        print(f"Failed to send notification email: {str(e)}")
    
    return {"message": "Parcel assigned successfully"}

@api_router.post("/parcel/send-otp")
async def send_parcel_otp(request: SendOTPRequest, current_user: dict = Depends(get_current_user)):
    """Guard triggers OTP for parcel delivery"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can send OTP")
    
    # Find parcel
    parcel = await db.parcels.find_one({"_id": ObjectId(request.parcel_id)})
    
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    
    if parcel["status"] != ParcelStatus.PENDING:
        raise HTTPException(status_code=400, detail="Parcel must be in PENDING status")
    
    if not parcel.get("student_email"):
        raise HTTPException(status_code=400, detail="No student email associated with parcel")
    
    # Invalidate any previous unused OTPs for this parcel
    await db.otps.update_many({
        "parcel_id": request.parcel_id,
        "is_used": False
    }, {"$set": {"is_used": True}})

    # Generate OTP
    otp_code = generate_otp()
    expiry_time = datetime.utcnow() + timedelta(minutes=10)
    
    # Save OTP
    otp_doc = {
        "parcel_id": request.parcel_id,
        "email": parcel["student_email"],
        "otp_code": otp_code,
        "expiry_time": expiry_time,
        "is_used": False,
        "created_at": datetime.utcnow()
    }
    
    await db.otps.insert_one(otp_doc)
    
    # Send OTP
    await send_email_otp(parcel["student_email"], otp_code)
    
    return {
        "message": "OTP sent to student email",
        "email": parcel["student_email"],
        "otp": otp_code  # Only for development, remove in production
    }

@api_router.post("/parcel/verify-otp")
async def verify_parcel_otp(request: VerifyParcelOTPRequest, current_user: dict = Depends(get_current_user)):
    """Guard verifies OTP and marks parcel as delivered"""
    if current_user["role"] != UserRole.GUARD:
        raise HTTPException(status_code=403, detail="Only guards can verify OTP")
    
    # Find OTP
    otp = await db.otps.find_one({
        "parcel_id": request.parcel_id,
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
        {"_id": ObjectId(request.parcel_id)},
        {"$set": {
            "status": ParcelStatus.DELIVERED,
            "delivered_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Parcel delivered successfully"}

@api_router.get("/parcel/hostel/{hostel_type}")
async def get_hostel_parcels(hostel_type: str, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get parcels for a specific hostel"""
    query = {"hostel_type": hostel_type}
    
    if status:
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
    
    student = await db.users.find_one({
        "_id": ObjectId(student_id),
        "role": UserRole.STUDENT
    })
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student["_id"] = str(student["_id"])
    student.pop("password", None)  # Remove password if exists
    # Ensure contact number included if exists
    # (Mongo document already contains it; we simply relay it)
    return {"student": student}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.on_event("startup")
async def startup_seed_admin():
    await ensure_admin_user()
