"""
Database Seed Script
Run this to add initial users for testing

Users to add:
1. Boys Hostel Guard: username=boys_guard
2. Girls Hostel Guard: username=girls_guard
3. Sample Students for both hostels
"""

import requests
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8001/api")
SEED_GUARD_PASSWORD = os.environ.get("SEED_GUARD_PASSWORD")

def add_users():
    print("=" * 60)
    print("Adding Initial Users to Database")
    print("=" * 60)

    if not SEED_GUARD_PASSWORD:
        raise RuntimeError("SEED_GUARD_PASSWORD must be set before running seed_database.py")
    
    users = [
        # Guards
        {
            "name": "Boys Hostel Guard",
            "role": "GUARD",
            "hostel_type": "BOYS",
            "username": "boys_guard",
            "password": SEED_GUARD_PASSWORD
        },
        {
            "name": "Girls Hostel Guard",
            "role": "GUARD",
            "hostel_type": "GIRLS",
            "username": "girls_guard",
            "password": SEED_GUARD_PASSWORD
        },
        # Boys Hostel Students
        {
            "name": "Rahul Kumar",
            "role": "STUDENT",
            "hostel_type": "BOYS",
            "roll_number": "2021001",
            "email": "rahul.kumar@iiitg.ac.in",
            "room_number": "101",
            "contact_number": "9876543210"
        },
        {
            "name": "Amit Singh",
            "role": "STUDENT",
            "hostel_type": "BOYS",
            "roll_number": "2021002",
            "email": "amit.singh@iiitg.ac.in",
            "room_number": "102",
            "contact_number": "9876501234"
        },
        {
            "name": "Raj Sharma",
            "role": "STUDENT",
            "hostel_type": "BOYS",
            "roll_number": "2021003",
            "email": "raj.sharma@iiitg.ac.in",
            "room_number": "103",
            "contact_number": "9876512345"
        },
        # Girls Hostel Students
        {
            "name": "Priya Patel",
            "role": "STUDENT",
            "hostel_type": "GIRLS",
            "roll_number": "2021004",
            "email": "priya.patel@iiitg.ac.in",
            "room_number": "201",
            "contact_number": "9876523456"
        },
        {
            "name": "Sneha Reddy",
            "role": "STUDENT",
            "hostel_type": "GIRLS",
            "roll_number": "2021005",
            "email": "sneha.reddy@iiitg.ac.in",
            "room_number": "202",
            "contact_number": "9876534567"
        },
        {
            "name": "Ananya Gupta",
            "role": "STUDENT",
            "hostel_type": "GIRLS",
            "roll_number": "2021006",
            "email": "ananya.gupta@iiitg.ac.in",
            "room_number": "203",
            "contact_number": "9876545678"
        },
    ]
    
    print(f"\nAdding {len(users)} users...\n")
    
    for user in users:
        try:
            response = requests.post(f"{BASE_URL}/admin/add-user", json=user)
            if response.status_code == 200:
                print(f"✓ Added {user['role']}: {user['name']}")
            else:
                print(f"✗ Failed to add {user['name']}: {response.json().get('detail', 'Unknown error')}")
        except Exception as e:
            print(f"✗ Error adding {user['name']}: {str(e)}")
    
    print("\n" + "=" * 60)
    print("Seeding Complete!")
    print("=" * 60)
    print("\n📋 Login Credentials:")
    print("\nGuards:")
    print("  Boys Hostel: username=boys_guard, password=<SEED_GUARD_PASSWORD>")
    print("  Girls Hostel: username=girls_guard, password=<SEED_GUARD_PASSWORD>")
    print("\nStudents (use roll number + email, then OTP):")
    print("  Example: roll=2021001, email=rahul.kumar@iiitg.ac.in")
    print("=" * 60)

if __name__ == "__main__":
    add_users()
