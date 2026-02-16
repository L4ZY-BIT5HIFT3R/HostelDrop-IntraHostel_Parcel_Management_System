# Tech Stack Checklist (One Page)

Use this as a quick study/cheat sheet for your presentation.

## Backend – FastAPI + MongoDB
- Framework: FastAPI app + router under `/api` (see backend/server.py).
- Models: Pydantic request/response models (e.g., GuardLoginRequest, TokenResponse).
- Auth: JWT (HS256, 24h `exp`) via `create_access_token()`; bearer auth with `HTTPBearer` and `get_current_user()`.
- Passwords: `passlib` (bcrypt) `hash_password()` and `verify_password()` for guards.
- OTP Flow:
  - Generate 6-digit code; store in `otps` with `expiry_time`, `is_used=false`.
  - Invalidate previous unused OTPs before issuing new one.
  - Verify: check match + not expired → mark `is_used=true`.
- Email: Gmail OAuth2 if configured; dev fallback logs/prints OTP (send_email_otp, send_parcel_notification).
- MongoDB (Motor): Async CRUD on `users`, `parcels`, `otps`; sort by timestamps; ObjectId handling.
- Parcel lifecycle: `UNASSIGNED` → (assign) → `PENDING` → (verify OTP) → `DELIVERED`.
- Key routes:
  - Auth: POST `/auth/guard/login`, `/auth/student/request-otp`, `/auth/student/verify-otp`.
  - Parcels: POST `/parcel/add`, PUT `/parcel/assign`, POST `/parcel/send-otp`, POST `/parcel/verify-otp`, GET `/parcel/guard/*`, GET `/parcel/hostel/{type}`.
  - Admin: POST `/admin/add-user`, GET `/admin/users`.
- Config: `.env` → `MONGO_URL`, `DB_NAME`, `JWT_SECRET_KEY`, optional Gmail creds; CORS enabled for all origins.
- Run:
  ```bash
  cd backend
  pip install -r requirements.txt
  uvicorn server:app --host 0.0.0.0 --port 8001 --reload
  ```

## Frontend – React Native (Expo)
- Navigation: `expo-router` file-based routing (see frontend/app/*, stacks and tabs).
- State/Auth: Zustand store `store/authStore.ts` (user/token + AsyncStorage persistence).
- API Client: Axios instance `utils/api.ts` with base URL `${EXPO_PUBLIC_BACKEND_URL}/api` and bearer interceptor.
- Screens/Flows:
  - Guard: `guard-login.tsx` → dashboard (`guard-dashboard/index.tsx`): add, assign, send OTP, verify.
  - Student: `student-login.tsx` (request/verify OTP) → dashboard (`student-dashboard/index.tsx`).
- Types: Minimal interfaces for `User`, `Parcel` for clarity.
- Env: Set `EXPO_PUBLIC_BACKEND_URL` to backend host:port.
- Run:
  ```bash
  cd frontend
  yarn
  set EXPO_PUBLIC_BACKEND_URL=http://<your-ip>:8001
  yarn start
  ```

## What to Say (per topic)
- Problem: Track hostel parcels securely; reduce manual errors.
- Auth: Guards use passwords; students use time-bound OTP; both get JWT.
- Data: `users` (roles, hostel, student info), `parcels` (status), `otps` (single-use).
- Security: Hashed passwords, JWT expiry, OTP invalidation; prod would disable dev OTP echo.
- UX: Clear role-based flows, search/filter in dashboards, error handling via modals/alerts.
- Scalability: Stateless backend with JWT, MongoDB indexes (status/hostel/roll), email service swap.

## Code References (quick)
- Routes, auth, OTP, email: backend/server.py
- API client: frontend/utils/api.ts
- Auth state: frontend/store/authStore.ts
- Guard flows: frontend/app/guard-login.tsx, frontend/app/guard-dashboard/index.tsx
- Student flows: frontend/app/student-login.tsx, frontend/app/student-dashboard/index.tsx
