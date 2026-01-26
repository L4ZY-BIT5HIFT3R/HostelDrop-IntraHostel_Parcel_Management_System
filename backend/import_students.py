import os
import csv
import io
import re
from typing import Optional
from dotenv import load_dotenv
from pymongo import MongoClient


def map_hostel_type(gender: str) -> str:
  g = (gender or '').strip().lower()
  if g == 'female':
    return 'GIRLS'
  return 'BOYS'


def to_contact_number(mobile: Optional[str]) -> Optional[str]:
  if not mobile:
    return None
  # Normalize: keep digits only
  digits = ''.join(ch for ch in str(mobile) if ch.isdigit())
  return digits or None

def make_iiitg_email(full_name: str) -> Optional[str]:
  name = (full_name or '').strip()
  if not name:
    return None
  parts = re.split(r"\s+", name)
  first = parts[0] if parts else ''
  last = parts[-1] if len(parts) > 1 else (parts[0] if parts else '')
  # Keep letters only, lowercase
  def clean(s: str) -> str:
    return re.sub(r"[^a-z]", "", s.lower())
  f = clean(first)
  l = clean(last)
  if not f:
    f = 'student'
  if not l:
    l = 'iiitg'
  return f"{f}.{l}@iiitg.ac.in"


def main():
  # Load environment
  load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
  mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
  db_name = os.environ.get('DB_NAME', 'hostel_parcel_db')

  # Input file path (TSV)
  # Default to user's Downloads file if not provided via env
  input_path = os.environ.get('IMPORT_STUDENTS_FILE', r"C:\Users\asus\Downloads\IIIT Guwahati - Intern - Eligible Candidate List (2).txt")
  if not os.path.exists(input_path):
    raise FileNotFoundError(f"Input file not found: {input_path}")

  client = MongoClient(mongo_url)
  db = client[db_name]

  inserted = 0
  updated = 0

  # Read with BOM/encoding detection (supports UTF-8/UTF-16)
  with open(input_path, 'rb') as fb:
    raw = fb.read()

  enc = 'utf-8'
  if raw.startswith(b'\xff\xfe') or raw.startswith(b'\xfe\xff'):
    enc = 'utf-16'
  elif raw.startswith(b'\xef\xbb\bf'):
    enc = 'utf-8-sig'

  text = raw.decode(enc)
  f = io.StringIO(text)
  reader = csv.DictReader(f, delimiter='\t')
  for row in reader:
      name = (row.get('Candidate Name') or '').strip()
      # Construct institute email from name: firstname.lastname@iiitg.ac.in
      email = (make_iiitg_email(row.get('Candidate Name')) or '').lower()
      gender = (row.get('Gender') or '').strip()
      candidate_id = (row.get('Candidate Id') or '').strip()
      mobile = to_contact_number(row.get('Mobile'))

      if not name or not email:
        # Skip incomplete rows
        continue

      hostel_type = map_hostel_type(gender)

      # Required fields for student per API design
      student_doc = {
        'name': name,
        'role': 'STUDENT',
        'hostel_type': hostel_type,
        # Use candidate id as roll_number surrogate
        'roll_number': candidate_id or email.split('@')[0],
        'email': email,
        # Placeholder room number; update later if you have real data
        'room_number': '000',
      }

      if mobile:
        student_doc['contact_number'] = mobile

      # Upsert by email to avoid duplicates
      result = db.users.update_one(
        {'email': email, 'role': 'STUDENT'},
        {'$set': student_doc},
        upsert=True,
      )

      if result.matched_count:
        updated += 1
      elif result.upserted_id is not None:
        inserted += 1
      else:
        # If neither matched nor upserted, treat as updated (rare)
        updated += 1

  print(f"Import complete. Inserted: {inserted}, Updated: {updated}")


if __name__ == '__main__':
  main()
