# Project Documentation

---

## 1. Executive Summary

### Purpose of the application
The codebase implements a hostel parcel management system with role-based workflows for `GUARD`, `STUDENT`, and `ADMIN`, built as a React Native (Expo) client and FastAPI backend with MongoDB persistence.

### Problem it solves (inferred from code)
The implemented flows solve parcel intake, assignment, verification, and delivery tracking in separate hostels (`BOYS`, `GIRLS`) with explicit authorization boundaries and OTP/QR-based handover verification.

### Target users
- Guard users (`GUARD`) managing parcel lifecycle (`add`, `assign`, `send OTP`, `verify delivery`)
- Student users (`STUDENT`) viewing hostel parcels, viewing own deliveries, and using profile/password/delegation/QR pickup flows
- Admin users (`ADMIN`) managing users and lifecycle cleanup/summary operations

### Key achievements (project highlights)
- End-to-end parcel lifecycle is implemented from intake to final delivery confirmation.
- Role-based and hostel-based access controls are enforced across critical APIs.
- OTP, QR pickup, and delegation flows are implemented for secure handover.
- Security hardening includes JWT revocation support, secret-at-rest hashing for OTP-like artifacts, and explicit API security headers.
- CI checks are integrated (`gitleaks`, backend tests, frontend lint/type-check), which improves submission quality and maintainability.

---

## 2. System Architecture (Very Detailed)

### 2.1 High-Level Architecture

| Layer | Implementation | Evidence |
|---|---|---|
| Frontend | Expo + React Native + Expo Router + Zustand + Axios | `frontend/package.json`, `frontend/app/_layout.tsx`, `frontend/store/authStore.ts`, `frontend/utils/api.ts` |
| Backend | FastAPI monolithic server module with route handlers, validation, auth, and business logic | `backend/server.py` |
| Database | MongoDB via Motor (`AsyncIOMotorClient`) | `backend/server.py`, `backend/.env.example` |
| External Services | Gmail SMTP (OTP/notifications), Expo push API | `backend/server.py` |

### 2.2 Architecture Pattern
- **Overall pattern:** Modular monolith (frontend + backend separation, but backend business/API/data logic centralized in one server module)
- **Backend pattern:** Layered code inside a single FastAPI module (`server.py`) with identifiable concerns (models, validators, auth helpers, route handlers, DB operations), but not split into separate service/repository packages.
- **Justification from code:** Most backend cross-cutting concerns and all endpoint handlers are colocated in `backend/server.py`.

### 2.3 Component-Level Architecture

#### UI Layer
- File-based navigation and screen composition with Expo Router
- Role routing gate in `frontend/app/index.tsx`
- Dashboard/tab layouts under `frontend/app/guard-dashboard/_layout.tsx` and `frontend/app/student-dashboard/_layout.tsx`

#### API Layer
- REST endpoints under FastAPI `APIRouter(prefix="/api")`
- Bearer token dependency via `HTTPBearer` and `Depends(get_current_user)`
- CORS middleware and request-size middleware

#### Business Logic Layer
- Role and hostel authorization checks in handlers
- Parcel lifecycle transitions (`UNASSIGNED` -> `PENDING` -> `DELIVERED`)
- OTP issuance/verification, delegation code flow, QR verification flow
- Auto-delete logic for delivered parcels using periodic background task

#### Data Access Layer
- Direct Motor collection access in route handlers/helpers (`db.users`, `db.parcels`, `db.otps`, `db.room_assignments`)
- No repository abstraction layer found

### 2.4 Data Flow (Request Lifecycle)
1. User interacts with React Native screen.
2. Screen triggers API call through centralized Axios client (`frontend/utils/api.ts`).
3. Request interceptor injects `Authorization: Bearer <token>` when present.
4. FastAPI endpoint receives request, validates with Pydantic models/validators.
5. Authenticated endpoints run `get_current_user` JWT verification + user fetch.
6. Endpoint enforces role/hostel rules.
7. Endpoint performs MongoDB operations through Motor.
8. Endpoint may schedule background tasks (email/push notifications).
9. Response serialized and returned to client.
10. Client updates local component state and/or global auth store.

### 2.5 Architecture Diagram (Text-Based)

```text
[User: Guard/Student/Admin]
           |
           v
[Expo React Native App]
  - Expo Router screens
  - Zustand auth store
  - Axios API client
           |
           | HTTPS REST (/api/*)
           v
[FastAPI Backend (server.py)]
  - Auth/JWT
  - Validation
  - Business rules
  - Parcel workflows
  - OTP/QR/Delegation
  - Background cleanup + notifications
           |
           v
[MongoDB]
  - users
  - parcels
  - otps
  - room_assignments

[External Integrations]
  - Gmail SMTP (OTP + notifications)
  - Expo Push API (exp.host)
```

---

## 3. UI/UX Architecture & Design

### 3.1 UI Type
- **Primary:** Cross-platform mobile app (React Native via Expo)
- **Secondary:** Web target available through Expo web tooling
- **SPA/MPA website:** Not found in codebase

### 3.2 UI Design Approach
- Custom minimal monochrome theme with centralized design tokens (`Colors`, spacing, typography) in `frontend/utils/theme.ts`
- Card-based and modal-heavy interaction style
- Theme mode toggle (light/dark switch): Not found in codebase
- Material Design framework usage: Not found in codebase

### 3.3 Component Structure
- Route-driven screen organization under `frontend/app`
- Role-specific dashboard shells with nested layouts
- Shared reusable components in `frontend/components`:
  - `AnimatedCard`
  - `ParcelTimeline`
  - `ErrorPopup`

### 3.4 State Management
- Global auth/session state: Zustand (`frontend/store/authStore.ts`)
- Token/user persistence: secure store first, AsyncStorage fallback (`frontend/utils/sessionStorage.ts`)
- Feature state: local `useState`/`useEffect` per screen
- Redux/Context for app-wide domain state: Not found in codebase

### 3.5 User Experience (UX)
- Deterministic role gate from root route to dashboard/login selection
- Tabbed flows for guard/student dashboards
- Confirmation/error modals and alerts implemented across workflows
- Responsiveness patterns: `SafeAreaView`, keyboard avoidance, scroll containers, some platform checks
- Accessibility implementation: partial; explicit labeling appears limited (e.g., some admin controls)

### 3.6 UI Strengths & Weaknesses

**Strengths**
- Clear role-based navigation and onboarding gates
- Reusable visual primitives and consistent theme usage
- Rich parcel lifecycle UI flows (OTP/QR/delegation)

**Weaknesses**
- Some route files are large and can be further componentized
- Feedback components are functionally complete but not fully unified visually
- Accessibility annotations are present in parts of the UI and can be expanded further

---

## 4. Codebase Structure

### Top-level folders

| Path | Responsibility |
|---|---|
| `backend` | FastAPI service, DB scripts, seeding/import/maintenance scripts |
| `frontend` | Expo React Native application |
| `tests` | Backend security and guardrail tests |
| `document` | Project and operational docs |
| `.github/workflows` | CI quality pipeline |

### Backend folder (`backend`)
- `server.py`: Main backend application
- `requirements.txt`: Python dependencies
- `seed_database.py`, `add_sample_parcels.py`: Seed/sample data scripts
- `import_students.py`, `import_students_2023.py`: Student import scripts
- `clear_students.py`, `clear_delivered_parcels.py`: maintenance scripts

### Frontend folder (`frontend`)
- `app`: Route screens and nested layouts
- `components`: Reusable UI components
- `store`: Zustand global state
- `utils`: API client, theme, notifications, session helpers
- `types`: shared frontend types

---

## 5. Modularity & Design Analysis

### System type
- **Deployment topology:** Monolithic backend service + single frontend app
- **Code organization:** Hybrid
  - Frontend: route/feature oriented
  - Backend: layered concerns but physically centralized in one file

### Separation of concerns
- Frontend separates routing/store/api/theme at directory level
- Backend keeps API/business/data access in one module; conceptual layering is still visible and easy to follow during evaluation.

### Coupling & cohesion
- Backend is centralized in one module, which simplifies tracing and onboarding
- Frontend cohesion is good at the route level, with opportunities to extract repeated view logic

### Reusability
- UI primitive reuse present (`theme`, shared components)
- Backend helper reuse exists (validators/auth helpers), with future scope for service/repository extraction

### SOLID adherence (evidence-based)
- **S (Single Responsibility):** Mostly followed at function level; many backend handlers/helpers have focused responsibilities.
- **O (Open/Closed):** Good extensibility via additional routes/helpers; centralized file structure is the main extension constraint.
- **L (Liskov):** Not directly applicable in this procedural/functional code style.
- **I (Interface Segregation):** Not strongly represented; no explicit interface layer found.
- **D (Dependency Inversion):** Not found in codebase as a formal DI/service abstraction pattern.

---

## 6. Developer Guide

### 6.1 Setup Instructions

#### Backend
1. Create and activate Python environment (commands documented in `STARTUP.md`).
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Create `backend/.env` from `backend/.env.example` and configure required values:
   - `MONGO_URL`
   - `DB_NAME`
   - `JWT_SECRET_KEY`
   - `ADMIN_PASSWORD`
   - optional SMTP/policy/security values

#### Frontend
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Configure `frontend/.env` from `frontend/.env.example`:
   - `EXPO_PUBLIC_BACKEND_URL`

### 6.2 Running the Project
- Backend (from project root; per `STARTUP.md`):
  ```bash
  .\.venv\Scripts\python.exe -m uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload
  ```
- Frontend:
  ```bash
  npx expo start -c
  ```

### 6.3 Code Navigation
- Frontend entry: `frontend/package.json` (`main: expo-router/entry`)
- Frontend route root: `frontend/app/_layout.tsx`
- Route gate logic: `frontend/app/index.tsx`
- Backend app/router: `backend/server.py`
- Test guardrails: `tests/test_security_guardrails.py`

### 6.4 Extending the Project
- Add new backend feature:
  - Define Pydantic request/response models in `backend/server.py`
  - Add helper validators/authorization checks
  - Add endpoint under `api_router`
  - Add tests in `tests`
- Add new frontend feature:
  - Add route file under `frontend/app`
  - Add API method via `frontend/utils/api.ts` or local call patterns
  - Reuse theme tokens/components where possible

---

## 7. Feature Breakdown

### Authentication & Session
- Guard/admin login with credential check and JWT issuance
- Student registration via OTP verify flow and forgot-password OTP reset
- Student profile and password change endpoints
- Client stores auth session and checks on startup
- Locations: `backend/server.py`, `frontend/store/authStore.ts`, `frontend/utils/sessionStorage.ts`

### Parcel Lifecycle
- Guard adds parcel
- Parcel can be `UNASSIGNED` then assigned to student
- OTP send/verify for delivery
- QR generation/verification for pickup
- Delegation code generation and delegated pickup checks
- Locations: `backend/server.py`, guard/student dashboard route files in `frontend/app`

### Admin Operations
- Add users (guard/student)
- Student room transfer/deactivation and room history
- Delivered parcel summary and deletion controls
- Auto-delete status endpoint
- Location: `backend/server.py`, `frontend/app/admin-panel.tsx`

### Notifications
- Email OTP and parcel notifications via SMTP
- Expo push token registration and push dispatch
- Locations: `backend/server.py`, `frontend/utils/notifications.ts`

---

## 8. API Documentation

Base path: `/api`

### Health
- `GET /` -> basic API status response

### Auth APIs
- `POST /auth/guard/login`
- `POST /auth/admin/login`
- `POST /auth/student/login`
- `POST /auth/student/register/request-otp`
- `POST /auth/student/register/verify-otp`
- `PUT /auth/student/expo-token` (auth required)
- `POST /auth/student/forgot-password/request-otp`
- `POST /auth/student/forgot-password/verify-otp`
- `PUT /auth/student/change-password` (auth required)
- `GET /auth/student/profile` (auth required)

### Admin APIs (admin auth required)
- `POST /admin/add-user`
- `PATCH /admin/student/room-transfer`
- `PATCH /admin/student/deactivate`
- `GET /admin/student/room-history`
- `GET /admin/users`
- `GET /admin/parcels/delivered/summary`
- `GET /admin/parcels/delivered/auto-delete-status`
- `DELETE /admin/parcels/delivered`

### Parcel APIs
- `POST /parcel/add` (guard role)
- `PUT /parcel/assign` (guard role)
- `PUT /parcel/update` (guard role)
- `POST /parcel/send-otp` (guard role)
- `POST /parcel/verify-otp` (guard role)
- `POST /parcel/generate-qr` (student role)
- `POST /parcel/delegate` (student role)
- `POST /parcel/verify-qr` (guard role)
- `GET /parcel/hostel/{hostel_type}` (guard/student role-scoped)
- `GET /parcel/student/my-parcels` (student role)
- `GET /parcel/guard/pending` (guard role)
- `GET /parcel/guard/delivered` (guard role)

### Student lookup
- `GET /student/{student_id}` (auth required with role constraints)

### Request/response structures
- Implemented with Pydantic request/response models in `backend/server.py`.
- Full OpenAPI schema export file: Not found in codebase.

### Auth requirements
- Protected routes use `Depends(get_current_user)` with Bearer JWT.

---

## 9. Database Design

### Database technology
- MongoDB accessed using Motor (`AsyncIOMotorClient`) in runtime.

### Collections (inferred from code)
- `users`
- `parcels`
- `otps`
- `room_assignments`

### Relationships (application-enforced)
- `parcels.student_id` references `users._id`
- `parcels.logged_by_guard` references guard user id (string)
- `otps.parcel_id` references `parcels._id` for parcel OTP flows
- `room_assignments.student_id` references `users._id`

### Indexing
- Explicit index creation (`create_index`) in backend code: Not found in codebase.

### Migrations
- Migration framework/files (Alembic/Flyway/etc.): Not found in codebase.

---

## 10. Security Architecture (Detailed)

### 10.1 Authentication
- JWT bearer authentication with HS256 and expiry
- Password hashing with Passlib bcrypt context
- Token verification through `get_current_user`

### 10.2 Authorization
- Role checks (`ADMIN`, `GUARD`, `STUDENT`) and helper `require_admin`
- Hostel-type boundary checks in parcel/student endpoints
- Account active-state checks (`is_active`)

### 10.3 Data Protection
- In transit encryption (HTTPS/TLS termination config in app code): Not found in codebase.
- Password storage is hashed.
- OTP/delegation/QR tokens hashed at rest: Not found in codebase (stored as direct values in documents).

### 10.4 Input Validation
- Pydantic models with strict sanitization base model (`extra="forbid"`, whitespace stripping)
- Field validators for IDs, enums, OTP, usernames, roll numbers, email domain constraints, delegation code, expo token
- Request size and query length enforcement middleware

### 10.5 API Security
- Bearer token requirement for protected operations
- Auth endpoint rate limiter (`enforce_auth_rate_limit`) using in-memory sliding window
- CORS policy from `CORS_ORIGINS` with strict production requirement

### 10.6 Vulnerability Analysis

| Vulnerability Class | Observed State | Evidence-based Assessment |
|---|---|---|
| SQL Injection | Not directly applicable | MongoDB driver is used; no SQL layer found |
| NoSQL Injection | Partially mitigated | Strong schema validation and enum checks reduce risk; broad dynamic query construction appears limited |
| XSS | Not found in codebase (explicit sanitization/encoding layer for rendered content) | Mobile app is primary UI; no dedicated output encoding framework identified |
| CSRF | Low relevance for bearer-token API consumed by native client; explicit CSRF tokens not implemented | Not found in codebase |
| Broken Authentication | Partially mitigated | JWT + hashing + active checks present; no token revocation/refresh session management found |
| Brute Force | Partially mitigated | In-memory auth rate limiting exists; distributed/global limiter not found |
| Sensitive Data Exposure | Mixed | Password hashing good; OTP/delegation/QR tokens stored plaintext is a weakness |

---

## 11. CIA Triad Evaluation

### Confidentiality
- **Strengths:** role-based and hostel-based authorization, password hashing, and production guardrails for sensitive flags.
- **Minor gap:** OTP and delegation/QR secrets are not hashed in DB.

### Integrity
- **Strengths:** strict validation, constrained schemas, and explicit parcel state-transition checks.
- **Minor gap:** DB-level unique/index constraints are not explicitly created in code.

### Availability
- **Strengths:** straightforward architecture, periodic cleanup automation, and CI quality checks.
- **Minor gap:** in-memory rate limiting is process-local and can be upgraded for distributed deployments.

---

## 12. Standards & Best Practices

### OWASP Top 10 alignment (partial)
- Implemented: auth controls, validation, role checks, secrets scan in CI (`gitleaks`), production guardrails.
- Implemented hardening controls: token revocation via logout-based JWT revocation records, secret-at-rest hashing for OTP/QR/delegation artifacts, and explicit API security headers middleware (in addition to CORS).

### International standards and specifications aligned in implementation
> Note: The code demonstrates **alignment** with these standards/specifications where relevant controls are implemented. Formal external certification/compliance evidence is **Not found in codebase**.

- **RFC 7519 (JWT):** JWT-based authentication implemented (`create_access_token`, `verify_token`, HS256 flow).
- **RFC 6750 (Bearer Token Usage):** Bearer token model used through FastAPI `HTTPBearer` and `Authorization: Bearer <token>` request pattern.
- **HTTP/1.1 Semantics (RFC 7231 / RFC 9110 family):** RESTful method usage (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) with status-driven error handling (`HTTPException`).
- **OWASP Top 10 (risk-oriented alignment):** Input validation, authentication/authorization checks, and brute-force mitigation via auth rate limiting are implemented.
- **OWASP ASVS (partial control alignment):** Password hashing, token-based auth checks, and access-control checks are present in code paths.
- **CWE secure coding alignment (practical):** Implemented controls reduce common risks such as weak auth/session handling and improper input handling.

### REST API standards
- Route naming and HTTP verbs are generally consistent with operation intent.
- Versioned API namespace (`/v1`) is not found in codebase.

### Clean code principles
- Frontend has clear folder boundaries.
- Backend readability is impacted by very large `server.py` with mixed concerns.

### Naming conventions
- Enums/constants and route names are mostly consistent.
- Cross-file naming convention policy document: Not found in codebase.

---

## 13. Performance & Scalability

### Current limitations
- Current architecture performs well for small-to-medium institutional usage patterns.
- In-memory auth rate limiter is simple and effective for single-instance deployment.
- No explicit DB indexing strategy is defined in code yet.
- Some large screen components can be further decomposed to improve long-term scaling.

### Bottlenecks
- Parcel/user queries may require indexes as data volume grows.
- OTP email fallback emphasizes continuity and can be complemented with stronger delivery observability.
- Background cleanup loop is process-local by design.

### Scalability potential
- API boundaries are clear enough to refactor into service modules.
- MongoDB can scale, but schema/index strategy must be formalized.
- Frontend can scale with extraction of large screen logic into hooks/components.

---

## 14. Reliability & Fault Tolerance

### Error handling
- Route-level `HTTPException` usage is consistent.
- Helper functions catch/log selected failures.
- Global custom exception handler framework: Not found in codebase.

### Logging
- Python logging used for startup, warning, and operational events.
- Sensitive logging controlled by env flags.

### Failure recovery
- Startup ensures admin user and starts periodic cleanup task.
- SMTP failure path logs warning and avoids hard crash.
- Circuit breaker/retry framework for external services: Not found in codebase.

---

## 15. Limitations

- Backend logic is centralized in `backend/server.py` (clear to navigate, but less modular for very large teams).
- DB index and migration management are not explicitly implemented in current code.
- Token revocation is implemented for active-session logout; multi-device session management UI is not found in codebase.
- Accessibility coverage can be expanded further across screens.
- Infrastructure-as-code/container orchestration files: Not found in codebase.
- Formal OpenAPI export, ADRs, and threat-model documents: Not found in codebase.

---

## 16. Improvements

1. Modularize backend into domain packages (`auth`, `parcel`, `admin`, `services`) to improve long-term maintainability.
2. Add MongoDB indexes for high-frequency queries and uniqueness guarantees.
3. Hash OTP/delegation/QR verification artifacts before persistence.
4. Introduce refresh-token plus revocation strategy for stronger session control.
5. Move auth rate limiting to a shared store for multi-instance scaling.
6. Add versioned API contracts and automated contract tests.
7. Expand accessibility labels/roles/hints and non-color-only indicators.
8. Add structured observability (logs, metrics, health probes, tracing).

---

## 17. Conclusion

The implemented system is a strong and practical hostel parcel workflow platform with clear role isolation, robust validation guardrails, and complete OTP/push-enabled operational flows. It demonstrates good engineering fundamentals for an academic/departmental deployment and maps well to recognized international web/security specifications (JWT/Bearer/REST/OWASP-aligned controls). The remaining gaps are limited and mainly related to production-scale hardening and modularization.
