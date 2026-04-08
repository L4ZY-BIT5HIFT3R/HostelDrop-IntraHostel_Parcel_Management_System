import requests
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / "backend/.env")

API_URL = os.environ.get("API_BASE_URL", "http://localhost:8001/api")
TEST_GUARD_USERNAME = os.environ.get("TEST_GUARD_USERNAME", "boys_guard")
TEST_GUARD_PASSWORD = os.environ.get("TEST_GUARD_PASSWORD")
TEST_GUARD_HOSTEL = os.environ.get("TEST_GUARD_HOSTEL", "BOYS")

def test_generate_qr():
    if not TEST_GUARD_PASSWORD:
        raise RuntimeError("TEST_GUARD_PASSWORD must be set to run test_qr.py")

    # 1. Login as guard
    login_data = {
        "username": TEST_GUARD_USERNAME,
        "password": TEST_GUARD_PASSWORD,
        "hostel_type": TEST_GUARD_HOSTEL
    }
    r = requests.post(f"{API_URL}/auth/guard/login", json=login_data)
    if r.status_code != 200:
        print("Login failed:", r.text)
        return
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in successfully")

    # 2. Get pending parcels
    r = requests.get(f"{API_URL}/parcel/guard/pending", headers=headers)
    if r.status_code != 200:
        print("Failed to get parcels:", r.text)
        return
    
    parcels = r.json().get("parcels", [])
    if not parcels:
        print("No pending parcels found.")
        return
        
    parcel_id = parcels[0]["_id"]
    print(f"Testing with parcel {parcel_id}")

    # 3. Generate QR
    r = requests.post(f"{API_URL}/parcel/generate-qr", json={"parcel_id": parcel_id}, headers=headers)
    print("Generate QR Response Status:", r.status_code)
    print("Generate QR Response Body:", r.text)

if __name__ == "__main__":
    test_generate_qr()
