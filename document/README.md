#  Hostel Parcel Management System

A mobile-first system to manage parcel deliveries in hostel environments. The project includes a FastAPI backend with MongoDB and an Expo (React Native + TypeScript) frontend.

**Live Areas Covered**
- About the project
- Features (Guard and Student flows)
- Tech stack
- System requirements and dependencies
- Environment variables
- Setup and run commands (backend and frontend)
- Seed/test data
- Testing guidance
- Planned changes / roadmap
- Troubleshooting tips

**Related docs**
- See [PROJECT_README.md](PROJECT_README.md) for a deep dive.
- Quick references: [GMAIL_SETUP.md](GMAIL_SETUP.md), [TESTING_CHEAT_SHEET.md](TESTING_CHEAT_SHEET.md), [BUG_FIXES_SUMMARY.md](BUG_FIXES_SUMMARY.md), [LATEST_FIXES.md](LATEST_FIXES.md).

**Code pointers**
- Backend app: [backend/server.py](backend/server.py)
- Backend dependencies: [backend/requirements.txt](backend/requirements.txt)
- Frontend API client: [frontend/utils/api.ts](frontend/utils/api.ts)
- DB seed script: [backend/seed_database.py](backend/seed_database.py)
- Student import script: [backend/import_students.py](backend/import_students.py)
- Backend tests script: [test_backend.sh](test_backend.sh)

**API Base URL used by the app**
- Frontend reads `EXPO_PUBLIC_BACKEND_URL` and defaults to `http://localhost:8001`.

---

**About The Project**
- Guards can log parcels, assign unassigned ones, send OTPs, and mark delivery.
- Students log in via email OTP to view their delivered parcels and hostel-wide parcels.
- Gmail OAuth2 is supported for sending OTP emails; in development, OTPs are logged to the console.

**Features**
- Guard:
  - Add parcel with/without roll number
  - Assign unassigned parcels to students
  - Send and verify OTP for delivery
  - View delivered history
- Student:
  - Request/login via email OTP
  - View hostel parcels (All Parcels)
  - View personal delivered parcels (My Parcels)
- Security:
  - JWT-based auth, bcrypt password hashing
  - Role- and hostel-based access control
  - 10-minute OTPs, single-use enforcement

**Tech Stack**
- Backend: FastAPI (Python), MongoDB
- Frontend: Expo (React Native + TypeScript, Expo Router)
- Email: Gmail API via OAuth2
- State: Zustand

---

**System Requirements**
- Python 3.11+
- MongoDB (local or remote)
- Node.js 18+ and Yarn (or npm)
- Android Studio emulator or Expo Go for mobile testing (optional)

**Backend Dependencies**
- Python packages are listed in [backend/requirements.txt](backend/requirements.txt). Install them with `pip install -r requirements.txt`.

---

**Environment Variables**
- Backend (.env in the backend folder):
  - `MONGO_URL` (e.g., `mongodb://localhost:27017`)
  - `DB_NAME` (e.g., `hostel_parcel_db`)
  - `JWT_SECRET_KEY` (set a strong secret)
  - `GMAIL_CLIENT_ID` (optional, for sending emails)
  - `GMAIL_CLIENT_SECRET` (optional)
  - `GMAIL_REFRESH_TOKEN` (optional)
- Frontend (.env in the frontend folder):
  - `EXPO_PUBLIC_BACKEND_URL` (e.g., `http://localhost:8001`)

---

**Setup & Run**

Backend (Windows):
1. Create `.env` in the backend folder (see variables above).
2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
3. Start MongoDB (ensure the service is running locally or use a remote URL).
4. Run the FastAPI server on port 8001:
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8001
   ```
5. (Optional) Seed test users:
   ```bash
   python seed_database.py
   ```

Frontend (Windows):
1. Create `.env` in the frontend folder and set:
   ```bash
   EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
   ```
2. Install dependencies:
   ```bash
   cd frontend
   yarn install
   ```
3. Start the app:
   ```bash
   yarn start
   ```
4. Open on device/emulator using Expo.

---

**Seed & Test Data**
- Seed guards and sample students via [backend/seed_database.py](backend/seed_database.py). Credentials:
  - Boys Guard: username `boys_guard`, password `guard123`
  - Girls Guard: username `girls_guard`, password `guard123`
- Example student emails follow the `firstname.lastname@iiitg.ac.in` pattern (see [PROJECT_README.md](PROJECT_README.md)).
- To bulk import students from a TSV file, see [backend/import_students.py](backend/import_students.py) and configure `IMPORT_STUDENTS_FILE` in backend `.env`.

---

**Testing**
- Manual API tests: see examples in [PROJECT_README.md](PROJECT_README.md).
- Automated script: [test_backend.sh](test_backend.sh) (run in Git Bash or WSL on Windows).
  - Ensure backend is running on `http://localhost:8001`.

Quick manual checks (replace tokens appropriately):
```bash
# Guard login
curl -X POST http://localhost:8001/api/auth/guard/login \
  -H "Content-Type: application/json" \
  -d '{"username":"boys_guard","password":"guard123","hostel_type":"BOYS"}'

# Add parcel with roll number (requires Bearer token)
curl -X POST http://localhost:8001/api/parcel/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"hostel_type":"BOYS","room_number":"101","roll_number":"2021001"}'
```

---

**Planned Changes / Roadmap**
- Admin improvements: user management UI and audit logs.
- Better email delivery: queueing and retry strategy.
- Data hygiene: pagination and filtering on list endpoints.
- Observability: structured logging and request tracing.
- Docker setup for one-command local development.
- Extended tests: unit tests and minimal E2E flows.

---

**Troubleshooting**
- Email/OTP not received:
  - Without Gmail OAuth set, OTPs are logged in backend console; search logs for the code.
  - Verify `GMAIL_*` variables in backend `.env` (see [GMAIL_SETUP.md](GMAIL_SETUP.md)).
- Parcels not visible:
  - Check youre logged into the correct hostel.
  - Pull to refresh and ensure backend is reachable.
- Auth issues:
  - Clear app storage and re-login.
  - Confirm `JWT_SECRET_KEY` and token validity.

---

**License & Purpose**
- Built for academic/demo purposes. See more context in [PROJECT_README.md](PROJECT_README.md).
