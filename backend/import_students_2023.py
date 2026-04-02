"""
Import students from TSV file into MongoDB.
- Clears ALL existing STUDENT records first
- Imports new students from students_2023.tsv
- Generates email as firstname.lastname@iiitg.ac.in
- Maps gender: Male -> BOYS hostel, Female -> GIRLS hostel
- Room number defaults to '000' (update later with real data)

Usage:
  .\.venv\Scripts\python.exe backend\import_students_2023.py
"""

import os
import re
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient


def make_email(full_name: str, roll_number: str) -> str:
    """Generate iiitg email: firstname.lastname@iiitg.ac.in"""
    name = (full_name or '').strip()
    if not name:
        return f"{roll_number}@iiitg.ac.in"

    # Clean special characters (e.g. K.SHREEJA -> KSHREEJA)
    name = name.replace('.', ' ')
    parts = re.split(r'\s+', name.strip())

    def clean(s: str) -> str:
        return re.sub(r'[^a-z]', '', s.lower())

    first = clean(parts[0]) if parts else 'student'
    last = clean(parts[-1]) if len(parts) > 1 else first

    if not first:
        first = 'student'
    if not last:
        last = 'iiitg'

    return f"{first}.{last}@iiitg.ac.in"


def main():
    # Load environment
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(env_path)

    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'hostel_parcel_db')

    # Data file
    data_file = os.path.join(os.path.dirname(__file__), 'students_2023.tsv')
    if not os.path.exists(data_file):
        raise FileNotFoundError(f"Data file not found: {data_file}")

    client = MongoClient(mongo_url)
    db = client[db_name]

    # Step 1: Clear existing students
    delete_result = db.users.delete_many({'role': 'STUDENT'})
    print(f"Cleared {delete_result.deleted_count} existing student records.")

    # Step 2: Parse and import new students
    students = []
    with open(data_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split('\t')
            if len(parts) < 3:
                print(f"  Skipping malformed line: {line}")
                continue

            roll_number = parts[0].strip()
            name = parts[1].strip()
            gender = parts[2].strip()

            # Title case the name (AADITYA SRIVASTAVA -> Aaditya Srivastava)
            name_title = name.title()

            hostel_type = 'GIRLS' if gender.lower() == 'female' else 'BOYS'
            email = make_email(name, roll_number)

            students.append({
                'name': name_title,
                'role': 'STUDENT',
                'hostel_type': hostel_type,
                'roll_number': roll_number,
                'email': email,
                'room_number': '000',
                'created_at': datetime.utcnow(),
            })

    if students:
        db.users.insert_many(students)

    # Summary
    boys = sum(1 for s in students if s['hostel_type'] == 'BOYS')
    girls = sum(1 for s in students if s['hostel_type'] == 'GIRLS')
    print(f"\nImported {len(students)} students:")
    print(f"  Boys Hostel: {boys}")
    print(f"  Girls Hostel: {girls}")
    print(f"\nSample entries:")
    for s in students[:5]:
        print(f"  {s['roll_number']} | {s['name']} | {s['email']} | {s['hostel_type']}")
    print("\nDone!")


if __name__ == '__main__':
    main()
