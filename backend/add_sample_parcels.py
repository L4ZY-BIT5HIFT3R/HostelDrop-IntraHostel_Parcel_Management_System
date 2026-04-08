"""
Add sample parcels for testing
"""

import requests
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8001/api")
BOYS_GUARD_USERNAME = os.environ.get("BOYS_GUARD_USERNAME", "boys_guard")
GIRLS_GUARD_USERNAME = os.environ.get("GIRLS_GUARD_USERNAME", "girls_guard")
BOYS_GUARD_PASSWORD = os.environ.get("BOYS_GUARD_PASSWORD")
GIRLS_GUARD_PASSWORD = os.environ.get("GIRLS_GUARD_PASSWORD")

# First, login as guard to get token
def get_guard_token(hostel_type, username, password):
    response = requests.post(f"{BASE_URL}/auth/guard/login", json={
        "username": username,
        "password": password,
        "hostel_type": hostel_type
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

# Add sample parcels
def add_sample_parcels():
    print("=" * 60)
    print("Adding Sample Parcels for Testing")
    print("=" * 60)

    if not BOYS_GUARD_PASSWORD or not GIRLS_GUARD_PASSWORD:
        print("Set BOYS_GUARD_PASSWORD and GIRLS_GUARD_PASSWORD in environment before running this script.")
        return
    
    # Boys Hostel Parcels
    print("\n📦 Adding Boys Hostel Parcels...")
    boys_token = get_guard_token("BOYS", BOYS_GUARD_USERNAME, BOYS_GUARD_PASSWORD)
    if not boys_token:
        print("Failed to login boys guard. Check BOYS_GUARD_USERNAME/BOYS_GUARD_PASSWORD.")
        return
    
    boys_parcels = [
        {
            "hostel_type": "BOYS",
            "room_number": "101",
            "roll_number": "2021001",
            "student_name": "Rahul Kumar",
            "description": "Amazon Package - Books"
        },
        {
            "hostel_type": "BOYS",
            "room_number": "102",
            "roll_number": "2021002",
            "student_name": "Amit Singh",
            "description": "Flipkart - Electronics"
        },
        {
            "hostel_type": "BOYS",
            "room_number": "103",
            "roll_number": "2021003",
            "student_name": "Raj Sharma",
            "description": "Myntra - Clothing"
        },
        {
            "hostel_type": "BOYS",
            "room_number": "104",
            "student_name": "Unknown Student",
            "description": "Speed Post - Documents"
        },
        {
            "hostel_type": "BOYS",
            "room_number": "105",
            "student_name": "Unknown",
            "description": "Courier - Package"
        }
    ]
    
    for parcel in boys_parcels:
        try:
            response = requests.post(
                f"{BASE_URL}/parcel/add",
                json=parcel,
                headers={"Authorization": f"Bearer {boys_token}"}
            )
            if response.status_code == 200:
                status = response.json()["parcel"]["status"]
                print(f"✓ Added parcel for Room {parcel['room_number']} - Status: {status}")
            else:
                print(f"✗ Failed to add parcel for Room {parcel['room_number']}")
        except Exception as e:
            print(f"✗ Error: {str(e)}")
    
    # Girls Hostel Parcels
    print("\n📦 Adding Girls Hostel Parcels...")
    girls_token = get_guard_token("GIRLS", GIRLS_GUARD_USERNAME, GIRLS_GUARD_PASSWORD)
    if not girls_token:
        print("Failed to login girls guard. Check GIRLS_GUARD_USERNAME/GIRLS_GUARD_PASSWORD.")
        return
    
    girls_parcels = [
        {
            "hostel_type": "GIRLS",
            "room_number": "201",
            "roll_number": "2021004",
            "student_name": "Priya Patel",
            "description": "Amazon - Cosmetics"
        },
        {
            "hostel_type": "GIRLS",
            "room_number": "202",
            "roll_number": "2021005",
            "student_name": "Sneha Reddy",
            "description": "Nykaa - Beauty Products"
        },
        {
            "hostel_type": "GIRLS",
            "room_number": "203",
            "roll_number": "2021006",
            "student_name": "Ananya Gupta",
            "description": "Flipkart - Books"
        },
        {
            "hostel_type": "GIRLS",
            "room_number": "204",
            "student_name": "Unknown Student",
            "description": "Blue Dart - Package"
        }
    ]
    
    for parcel in girls_parcels:
        try:
            response = requests.post(
                f"{BASE_URL}/parcel/add",
                json=parcel,
                headers={"Authorization": f"Bearer {girls_token}"}
            )
            if response.status_code == 200:
                status = response.json()["parcel"]["status"]
                print(f"✓ Added parcel for Room {parcel['room_number']} - Status: {status}")
            else:
                print(f"✗ Failed to add parcel for Room {parcel['room_number']}")
        except Exception as e:
            print(f"✗ Error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("Sample Parcels Added Successfully!")
    print("=" * 60)
    print("\n📋 Summary:")
    print("  Boys Hostel: 5 parcels (3 PENDING, 2 UNASSIGNED)")
    print("  Girls Hostel: 4 parcels (3 PENDING, 1 UNASSIGNED)")
    print("\n💡 Now you can:")
    print("  1. Login as guard to see and manage parcels")
    print("  2. Send OTP and deliver parcels")
    print("  3. Login as student to view parcels")
    print("=" * 60)

if __name__ == "__main__":
    add_sample_parcels()
