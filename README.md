<p align="center">
  <img src="logo/logo.png" alt="HostelDrop logo" width="180" />
</p>

<h1 align="center">HostelDrop</h1>

<p align="center">
  Intra-hostel parcel management system for reception guards, students, and administrators.
</p>

<p align="center">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-0.136-009688?logo=fastapi&logoColor=white" />
  <img alt="Expo" src="https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white" />
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=111111" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Motor-47A248?logo=mongodb&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.x-3776AB?logo=python&logoColor=white" />
</p>

## Overview

HostelDrop digitizes parcel intake and pickup inside a hostel. Guards can add incoming parcels, assign them to students or rooms, generate OTP or QR pickup flows, and track delivered items. Students can register, sign in, view their parcels, receive notifications, request room changes, and delegate QR-based pickups. Administrators can manage users, room change requests, student room history, and delivered-parcel cleanup.

## Features

- Role-based access for students, guards, and administrators.
- Student registration, login, forgot-password, and password-change flows.
- Guard parcel intake with pending, unassigned, and delivered parcel states.
- OTP verification for parcel pickup.
- QR pickup tokens with expiry, scan rate limiting, and delegated pickup support.
- Student dashboard for parcel visibility, notifications, profile, and room changes.
- Admin tools for users, room transfers, room history, and delivered-parcel maintenance.
- Email delivery through Gmail SMTP app passwords.
- Expo push notification support for parcel updates.
- Security guardrails for JWT secrets, admin credentials, input validation, CORS, and response headers.
- Locust and k6 stress-test assets with generated reports.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Mobile app | Expo, React Native, Expo Router, TypeScript, Zustand |
| API | FastAPI, Pydantic, Uvicorn |
| Database | MongoDB with Motor async driver |
| Authentication | JWT bearer tokens, passlib bcrypt |
| Notifications | SMTP email, Expo push notifications |
| Testing | Pytest, Locust, k6 |

## Repository Structure

```text
.
|-- backend/                 # FastAPI API, MongoDB models, scripts, env template
|-- frontend/                # Expo Router mobile app and reusable UI components
|-- tests/                   # Pytest security and API guardrail tests
|-- stress-tests/            # Locust and k6 load/stress test suites and reports
|-- document/                # Setup notes, maintenance docs, and project documents
|-- qrAuthFlow readme/       # QR authentication and delegation workflow notes
|-- logo/                    # Project logo used by this README
|-- STARTUP.md               # Local startup notes
|-- populate_display_ids.py  # Utility script for display IDs
|-- pyrightconfig.json       # Python type-checking configuration
`-- README.md
```

## Getting Started

### Prerequisites

- Python 3.11 or newer
- Node.js 20.x or 22.x
- MongoDB running locally or a MongoDB connection string
- Expo development environment for Android, iOS, or web

### 1. Clone and configure

```bash
git clone <your-repository-url>
cd HostelDrop-IntraHostel_Parcel_Management_System
```

Create local environment files from the committed templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Update `backend/.env` with your MongoDB URL, JWT secret, admin password, and optional SMTP credentials. Update `frontend/.env` if the backend is not running at `http://localhost:8001`.

### 2. Start the backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python -m uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload
```

On Windows PowerShell, activate the virtual environment with:

```powershell
.\.venv\Scripts\Activate.ps1
```

The API will be available at:

- Base API: `http://localhost:8001/api`
- Swagger docs: `http://localhost:8001/docs`

### 3. Seed local data

Run these from the repository root after configuring the backend environment:

```bash
python backend/seed_database.py
python backend/add_sample_parcels.py
```

### 4. Start the frontend

```bash
cd frontend
npm install
npx expo start -c
```

Use the Expo CLI options to open the app on Android, iOS, Expo Go, or web.

## Environment Variables

Backend variables are documented in [`backend/.env.example`](backend/.env.example). The most important values are:

- `MONGO_URL` and `DB_NAME` for MongoDB.
- `JWT_SECRET_KEY` and `ADMIN_PASSWORD` for authentication security.
- `CORS_ORIGINS` for allowed frontend origins.
- `SMTP_EMAIL` and `SMTP_APP_PASSWORD` for Gmail SMTP delivery.
- `INCLUDE_DEBUG_OTP_IN_RESPONSE=false` for production-safe OTP behavior.

Frontend variables are documented in [`frontend/.env.example`](frontend/.env.example):

- `EXPO_PUBLIC_BACKEND_URL` points the mobile app to the backend API host.

Never commit real `.env` files or production secrets.

## Core API Areas

| Area | Main endpoints |
| --- | --- |
| Auth | `/api/auth/guard/login`, `/api/auth/admin/login`, `/api/auth/student/login`, `/api/auth/student/register/*` |
| Student | `/api/student/room-change-request`, `/api/student/notifications`, `/api/auth/student/profile` |
| Admin | `/api/admin/users`, `/api/admin/add-user`, `/api/admin/room-change-requests`, `/api/admin/student/room-history` |
| Parcels | `/api/parcel/add`, `/api/parcel/assign`, `/api/parcel/update`, `/api/parcel/send-otp`, `/api/parcel/verify-otp` |
| QR pickup | `/api/parcel/generate-qr`, `/api/parcel/delegate`, `/api/parcel/verify-qr` |

## Testing

Run backend guardrail tests from the repository root:

```bash
pytest
```

Run frontend lint checks:

```bash
cd frontend
npm run lint
```

Load and rate-limit test material is available in [`stress-tests/`](stress-tests/), including Locust and k6 scenarios plus generated reports.

## Security Notes

- Keep `APP_ENV=production` in deployed environments.
- Use a strong `JWT_SECRET_KEY` and admin password.
- Keep `INCLUDE_DEBUG_OTP_IN_RESPONSE=false` outside local development.
- Store secrets in deployment secret managers or CI/CD variables, not in the repository.
- Review [`STARTUP.md`](STARTUP.md) for local operational notes and environment handling.

## Documentation

- Frontend details: [`frontend/README.md`](frontend/README.md)
- Gmail setup: [`document/GMAIL_SETUP.md`](document/GMAIL_SETUP.md)
- Android dependency maintenance: [`document/ANDROID_DEPENDENCY_MAINTENANCE_PLAN.md`](document/ANDROID_DEPENDENCY_MAINTENANCE_PLAN.md)
- QR auth workflow: [`qrAuthFlow readme/qr_auth_flow.md`](qrAuthFlow%20readme/qr_auth_flow.md)
- Stress-test reports: [`stress-tests/`](stress-tests/)

## License

Add your project license here before publishing the repository publicly.
