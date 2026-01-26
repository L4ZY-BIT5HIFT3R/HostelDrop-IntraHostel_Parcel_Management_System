# Hostel Parcel Management – Presentation Guide

Use this as a quick prep and walkthrough for your professor. It covers what to learn, how to demo, and common questions.

## What You Should Understand (and be able to explain)
- Problem & Users: Guards log/assign parcels; Students receive OTP and collect; Admin seeds data.
- Architecture: React Native (Expo + expo-router) frontend, FastAPI backend, MongoDB database.
- Auth Flows:
  - Guard: Username/password (bcrypt) → JWT bearer.
  - Student: Email OTP (6-digit, valid 10 minutes) → JWT bearer.
- Data Model (MongoDB collections):
  - `users`: guards, students, admins; key fields `role`, `hostel_type`, `username/password` (guard), `roll_number/email/room_number` (student).
  - `parcels`: `status` in {`UNASSIGNED`, `PENDING`, `DELIVERED`}; links to student via `student_id/roll_number`.
  - `otps`: transient OTP records with `expiry_time` and `is_used`.
- Parcel Lifecycle:
  1) Guard adds parcel → `UNASSIGNED` if no roll number, else `PENDING` and email notification.
  2) Guard can assign `UNASSIGNED` → student (becomes `PENDING`).
  3) Guard sends OTP → student receives email (dev: OTP visible in logs/response).
  4) Guard verifies OTP → `DELIVERED` with timestamp.
- API Surface (high level):
  - Auth: `POST /api/auth/guard/login`, `POST /api/auth/student/request-otp`, `POST /api/auth/student/verify-otp`.
  - Parcels: `POST /api/parcel/add`, `PUT /api/parcel/assign`, `POST /api/parcel/send-otp`, `POST /api/parcel/verify-otp`, `GET /api/parcel/guard/*`, `GET /api/parcel/hostel/{type}`.
  - Admin: `POST /api/admin/add-user`, `GET /api/admin/users`.
- Security:
  - JWT: `HS256`, 24h expiry; HTTP Bearer via interceptor.
  - Passwords hashed with bcrypt.
  - OTP: 6 digits, single-use, 10-minute TTL.
- Frontend Key Pieces:
  - Navigation: expo-router stacks/tabs under `frontend/app/*`.
  - State: Zustand store `store/authStore.ts` + AsyncStorage persistence.
  - API client: `utils/api.ts` (base URL from `EXPO_PUBLIC_BACKEND_URL`, auth interceptor, 401 handling).

## Demo Script (step-by-step)
1) Start Backend (FastAPI):
   - Ensure `.env` in `backend/`:
     - `MONGO_URL=mongodb://localhost:27017`
     - `DB_NAME=hostel_parcels`
     - `JWT_SECRET_KEY=dev-secret-change`
     - Optional Gmail OAuth2 for real emails: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` (otherwise OTP is logged).
   - Install deps and run:
     ```bash
     cd backend
     pip install -r requirements.txt
     uvicorn server:app --host 0.0.0.0 --port 8001 --reload
     ```
   - Seed data (optional helpers): `seed_database.py`, `import_students.py`, `add_sample_parcels.py`.

2) Start Frontend (Expo):
   - Set backend URL for the app:
     - In your shell: `set EXPO_PUBLIC_BACKEND_URL=http://<your-ip>:8001` (Windows), or use `.env` for Expo.
   - Run Expo:
     ```bash
     cd frontend
     yarn
     yarn start
     ```
   - Open Android emulator or Expo Go.

3) Guard Flow:
   - Navigate: Role → Hostel → Guard Login.
   - Login with seeded guard credentials.
   - On Guard Dashboard:
     - Add Parcel (with or without roll number).
     - Assign an UNASSIGNED parcel to a student (roll number + room).
     - Send OTP for a PENDING parcel (note the dev OTP in alert/logs if Gmail not configured).
     - Verify OTP → status becomes DELIVERED.

4) Student Flow:
   - Navigate: Role → Hostel → Student Login.
   - Enter roll number + IIITG email → Request OTP (check email or dev logs).
   - Verify OTP → lands on Student Dashboard.
   - View PENDING parcels list for the hostel; discuss design choice (visibility/filtering) and possible enhancements.

## Files to Reference During Q&A
- Backend:
  - `backend/server.py` – routes, models, OTP/email, JWT handling.
  - `.env` – secrets and Gmail OAuth2.
- Frontend:
  - `frontend/utils/api.ts` – axios setup + JWT interceptors.
  - `frontend/store/authStore.ts` – Zustand state + persistence.
  - `frontend/app/*` – screens: guard/student login, dashboards, assign/OTP modals.

## Common Questions & Good Answers
- Why MongoDB? Flexible schema for users/parcels/otps; fast iteration.
- How secure is OTP? 6-digit, 10-min TTL, single-use, invalidated on resend.
- What if email fails? In dev, OTP is logged/returned; in prod, configure Gmail OAuth2.
- JWT expiry? 24 hours; interceptor clears invalid/expired tokens.
- Scalability? Separate services, stateless JWTs, MongoDB indexes (can add on `status`, `hostel_type`, `roll_number`).
- Possible Improvements: Student dashboard privacy (only own parcels), rate-limit OTP, admin UI, analytics, tests.

## Minimal Sequence Diagram (verbal)
- Guard login → JWT → add/assign parcel → send OTP → verify OTP → mark DELIVERED.
- Student request OTP → email → verify OTP → JWT → view parcels.

## Quick Commands
```bash
# Backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend
cd frontend
set EXPO_PUBLIC_BACKEND_URL=http://<your-ip>:8001
yarn start
```

Good luck on the presentation — keep it story-first, then show the flows!
