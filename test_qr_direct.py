import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv

load_dotenv(r"backend\.env")

# Settings from server.py
SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'dev-insecure-secret-change-me'
ALGORITHM = "HS256"

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=60*24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def main():
    mongo_url = os.environ.get('MONGO_URL', "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'hosteldrop')]
    
    # Get a guard
    guard = await db.users.find_one({"role": "GUARD"})
    if not guard:
        print("No guard found!")
        return
        
    print(f"Testing with guard: {guard.get('username')} at hostel {guard.get('hostel_type')}")
    
    # Get a pending parcel for this hostel
    parcel = await db.parcels.find_one({
        "status": "PENDING", 
        "hostel_type": guard.get("hostel_type")
    })
    
    if not parcel:
        print(f"No pending parcels found for hostel {guard.get('hostel_type')}")
        return
        
    parcel_id = str(parcel["_id"])
    print(f"Using parcel_id: {parcel_id}")
    
    # Generate token
    token = create_access_token({"user_id": str(guard["_id"])})
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test generation
    API_URL = "http://localhost:8001/api"
    url = f"{API_URL}/parcel/generate-qr"
    print(f"Posting to {url}")
    r = requests.post(url, json={"parcel_id": parcel_id}, headers=headers)
    
    print("Status:", r.status_code)
    print("Response:", r.text)

if __name__ == "__main__":
    asyncio.run(main())
