import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
import requests
from dotenv import load_dotenv

load_dotenv(r"backend\.env")

API_URL = "http://localhost:8001/api"
TEST_EMAIL = "test.pw123@iiitg.ac.in"
TEST_ROLL = "TT9999"
TEST_PASS = "SecretPass123!"

async def verify():
    mongo_url = os.environ.get('MONGO_URL', "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'hosteldrop')]
    
    print("1. Cleaning up previous test data...")
    await db.users.delete_many({"roll_number": TEST_ROLL})
    await db.otps.delete_many({"email": TEST_EMAIL})

    print("\n2. Testing Registration Request OTP...")
    r1 = requests.post(f"{API_URL}/auth/student/register/request-otp", json={
        "roll_number": TEST_ROLL,
        "email": TEST_EMAIL,
        "hostel_type": "BOYS"
    })
    print(r1.status_code, r1.text)
    
    print("\n3. Fetching OTP from DB directly...")
    otp_doc = await db.otps.find_one({"email": TEST_EMAIL, "is_used": False})
    if not otp_doc:
        print("FAIL: OTP not found in DB!")
        return
    otp = otp_doc["otp_code"]
    print(f"Got OTP: {otp}")

    print("\n4. Testing Registration Verify OTP + Set Password...")
    r2 = requests.post(f"{API_URL}/auth/student/register/verify-otp", json={
        "name": "Test Password User",
        "roll_number": TEST_ROLL,
        "email": TEST_EMAIL,
        "hostel_type": "BOYS",
        "room_number": "999",
        "password": TEST_PASS,
        "otp_code": otp
    })
    print(r2.status_code, r2.text[:100], "...")
    
    print("\n5. Verifying DB Hash...")
    user_doc = await db.users.find_one({"roll_number": TEST_ROLL})
    if not user_doc or "password" not in user_doc:
        print("FAIL: User/Password hash not in DB!")
    else:
        print(f"Hash successfully stored: {user_doc['password'][:20]}...")

    print("\n6. Testing Login with correct Password...")
    r3 = requests.post(f"{API_URL}/auth/student/login", json={
        "roll_number": TEST_ROLL,
        "password": TEST_PASS,
        "hostel_type": "BOYS"
    })
    print(r3.status_code, r3.text[:100], "...")
    if r3.status_code == 200 and "access_token" in r3.json():
        print("\n✅ LOGIN SUCCESSFUL")
    else:
        print("\n❌ LOGIN FAILED")

    print("\n7. Testing Login with WRONG Password...")
    r4 = requests.post(f"{API_URL}/auth/student/login", json={
        "roll_number": TEST_ROLL,
        "password": "WrongPassword456!",
        "hostel_type": "BOYS"
    })
    print(r4.status_code, r4.text)
    if r4.status_code == 401:
        print("\n✅ INCORRECT LOGIN PROPERLY REJECTED")

if __name__ == "__main__":
    asyncio.run(verify())
