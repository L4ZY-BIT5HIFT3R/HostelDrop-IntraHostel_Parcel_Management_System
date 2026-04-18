
# HostelDrop Intra-Hostel Parcel Management System
## Comprehensive Technical Project Report (Professor Submission Edition)

**Report Version:** 3.0  
**Report Date:** April 17, 2026  
**Repository Root:** `d:\CS300\HostelDrop-IntraHostel_Parcel_Management_System`  
**Primary Reference for Load/Stress Evidence:** [documentation.md](documentation.md)

<a id="sec-0-table-of-contents"></a>
## 0. Table of Contents
- [1. Document Control](#sec-1-document-control)
- [2. Quick Navigation and Reading Guide](#sec-2-quick-navigation-and-reading-guide)
- [3. Executive Summary](#sec-3-executive-summary)
- [4. Problem Statement, Motivation, and Context](#sec-4-problem-statement-motivation-and-context)
- [5. Project Goals, Outcomes, and Evaluation Criteria](#sec-5-project-goals-outcomes-and-evaluation-criteria)
- [6. Scope Definition](#sec-6-scope-definition)
  - [6.1 In-Scope Capabilities](#sec-61-in-scope-capabilities)
  - [6.2 Out-of-Scope Boundaries](#sec-62-out-of-scope-boundaries)
- [7. Stakeholders and User Roles](#sec-7-stakeholders-and-user-roles)
  - [7.1 Guard Role](#sec-71-guard-role)
  - [7.2 Student Role](#sec-72-student-role)
  - [7.3 Admin Role](#sec-73-admin-role)
- [8. Functional Specification Coverage](#sec-8-functional-specification-coverage)
  - [8.1 Authentication and Identity Flows](#sec-81-authentication-and-identity-flows)
  - [8.2 Parcel Lifecycle Flows](#sec-82-parcel-lifecycle-flows)
  - [8.3 Admin and Room Management Flows](#sec-83-admin-and-room-management-flows)
  - [8.4 Communication and Notification Flows](#sec-84-communication-and-notification-flows)
  - [8.5 Policy and Consent Screens](#sec-85-policy-and-consent-screens)
- [9. Non-Functional Requirements](#sec-9-non-functional-requirements)
  - [9.1 Security](#sec-91-security)
  - [9.2 Reliability and Availability](#sec-92-reliability-and-availability)
  - [9.3 Performance](#sec-93-performance)
  - [9.4 Maintainability](#sec-94-maintainability)
  - [9.5 Usability and Compatibility](#sec-95-usability-and-compatibility)
- [10. System Architecture](#sec-10-system-architecture)
  - [10.1 Logical Architecture](#sec-101-logical-architecture)
  - [10.2 Component Responsibilities](#sec-102-component-responsibilities)
  - [10.3 Core Runtime Flows](#sec-103-core-runtime-flows)
  - [10.4 Error-Handling Strategy](#sec-104-error-handling-strategy)
- [11. Backend Engineering Design (FastAPI + MongoDB)](#sec-11-backend-engineering-design-fastapi--mongodb)
  - [11.1 Bootstrap and Lifecycle](#sec-111-bootstrap-and-lifecycle)
  - [11.2 Model and Validation Layer](#sec-112-model-and-validation-layer)
  - [11.3 Authorization and Access Guards](#sec-113-authorization-and-access-guards)
  - [11.4 Background Processing and Cleanup](#sec-114-background-processing-and-cleanup)
  - [11.5 Security Middleware and Hardening](#sec-115-security-middleware-and-hardening)
- [12. Frontend Engineering Design (Expo + React Native)](#sec-12-frontend-engineering-design-expo--react-native)
  - [12.1 Route Architecture](#sec-121-route-architecture)
  - [12.2 State and Session Management](#sec-122-state-and-session-management)
  - [12.3 API Client and Interceptor Design](#sec-123-api-client-and-interceptor-design)
  - [12.4 Notification Integration](#sec-124-notification-integration)
  - [12.5 UI Components and UX Utilities](#sec-125-ui-components-and-ux-utilities)
- [13. Data Model, Collections, and Retention Policy](#sec-13-data-model-collections-and-retention-policy)
  - [13.1 Primary Collections](#sec-131-primary-collections)
  - [13.2 Indexing and TTL Strategy](#sec-132-indexing-and-ttl-strategy)
  - [13.3 Data Retention and Archive Lifecycle](#sec-133-data-retention-and-archive-lifecycle)
- [14. API Endpoint Inventory (37 Endpoints)](#sec-14-api-endpoint-inventory-37-endpoints)
  - [14.1 Endpoint Summary by Domain](#sec-141-endpoint-summary-by-domain)
  - [14.2 API Design Notes](#sec-142-api-design-notes)
- [15. Security Architecture and Threat Controls](#sec-15-security-architecture-and-threat-controls)
  - [15.1 Identity and Token Security](#sec-151-identity-and-token-security)
  - [15.2 Input and Payload Protections](#sec-152-input-and-payload-protections)
  - [15.3 Rate Limiting and Abuse Controls](#sec-153-rate-limiting-and-abuse-controls)
  - [15.4 Transport and Header Protections](#sec-154-transport-and-header-protections)
  - [15.5 Environment Hardening and Operational Safety](#sec-155-environment-hardening-and-operational-safety)
- [16. International Standards and Coding Standards Alignment](#sec-16-international-standards-and-coding-standards-alignment)
  - [16.1 International and Industry Standards](#sec-161-international-and-industry-standards)
  - [16.2 Language-Level and Team Coding Standards](#sec-162-language-level-and-team-coding-standards)
  - [16.3 Standards Compliance Statement](#sec-163-standards-compliance-statement)
- [17. Testing, Verification, and Quality Assurance](#sec-17-testing-verification-and-quality-assurance)
  - [17.1 Automated Backend Guardrail Tests](#sec-171-automated-backend-guardrail-tests)
  - [17.2 CI Quality Gates](#sec-172-ci-quality-gates)
  - [17.3 Stress and Load Test Strategy](#sec-173-stress-and-load-test-strategy)
- [18. Performance Results Summary (From documentation.md)](#sec-18-performance-results-summary-from-documentationmd)
  - [18.1 k6 Summary](#sec-181-k6-summary)
  - [18.2 Locust Summary](#sec-182-locust-summary)
  - [18.3 Interpretation for Production Readiness](#sec-183-interpretation-for-production-readiness)
- [19. DevOps, Deployment, and Operations](#sec-19-devops-deployment-and-operations)
  - [19.1 Local Development Workflow](#sec-191-local-development-workflow)
  - [19.2 CI/CD Workflows](#sec-192-cicd-workflows)
  - [19.3 Android Maintenance Operations](#sec-193-android-maintenance-operations)
  - [19.4 Operational Considerations](#sec-194-operational-considerations)
- [20. Repository Structure and Important Files](#sec-20-repository-structure-and-important-files)
- [21. Current Limitations, Risks, and Mitigation Plan](#sec-21-current-limitations-risks-and-mitigation-plan)
- [22. Future Enhancement Roadmap](#sec-22-future-enhancement-roadmap)
- [23. Conclusion](#sec-23-conclusion)
- [24. Reference List](#sec-24-reference-list)
- [25. Heading-to-Artifact Traceability Matrix](#sec-25-heading-to-artifact-traceability-matrix)
- [26. Appendix A - Full Endpoint List](#sec-26-appendix-a---full-endpoint-list)
- [27. Appendix B - Environment Variable Catalog](#sec-27-appendix-b---environment-variable-catalog)

<a id="sec-1-document-control"></a>
## 1. Document Control
- **Document Title:** HostelDrop Intra-Hostel Parcel Management System - Comprehensive Technical Project Report
- **Intended Audience:** Professor/Evaluator, technical reviewers, future maintainers
- **Revision:** 3.0
- **Prepared On:** April 17, 2026
- **Evidence Window:** Source code and project artifacts present in this repository as of report date
- **Primary Performance Evidence:** [documentation.md](documentation.md) (test date: April 10, 2026)

<a id="sec-2-quick-navigation-and-reading-guide"></a>
## 2. Quick Navigation and Reading Guide
1. Use the **Table of Contents** above to jump to any heading or subheading.
2. Read Sections **3 to 10** for problem framing and architecture.
3. Read Sections **11 to 16** for implementation depth, security, and standards alignment.
4. Read Sections **17 to 19** for validation, performance evidence, and operations.
5. Use Sections **24 to 27** for references, traceability, endpoint inventory, and environment catalog.

<a id="sec-3-executive-summary"></a>
## 3. Executive Summary
HostelDrop is a mobile-first parcel management system designed for hostels where guards handle parcel intake/delivery and students require transparent, secure pickup workflows. The system replaces informal paper-based processes with a role-controlled digital workflow across three users: **Guard**, **Student**, and **Admin**.

The implementation combines:
- A React Native + Expo frontend (19 route files under `frontend/app`),
- A FastAPI backend (`backend/server.py`, 3366 lines),
- MongoDB data storage,
- Notification channels (email and Expo push),
- Security-first controls (JWT, OTP, validation, headers, and rate limits),
- Automated testing and CI validation.

Performance and resilience validation is explicitly documented in [documentation.md](documentation.md), with k6 and Locust evidence across ramp, spike, soak, breakpoint, and rate-limit scenarios.

<a id="sec-4-problem-statement-motivation-and-context"></a>
## 4. Problem Statement, Motivation, and Context
Typical hostel parcel handling faces four operational weaknesses:
1. Parcel status is not visible to students in real time.
2. Delivery handover has weak identity assurance and poor audit trails.
3. Staff spend time on repetitive manual coordination.
4. Historical records and accountability are difficult to maintain.

HostelDrop addresses these weaknesses by creating a digital parcel lifecycle from logging to verified handover, while preserving role boundaries and hostel-specific access control.

<a id="sec-5-project-goals-outcomes-and-evaluation-criteria"></a>
## 5. Project Goals, Outcomes, and Evaluation Criteria
| Goal | Expected Outcome | Evaluation Evidence |
|---|---|---|
| Secure authentication and role separation | Only authorized users can execute role-specific actions | Backend access-control checks in `backend/server.py`; guardrail tests in `tests/test_security_guardrails.py` |
| Complete parcel lifecycle management | Parcel moves through UNASSIGNED/PENDING/DELIVERED with history | Parcel endpoints and status timeline logic in `backend/server.py` |
| Student-facing transparency | Students can see parcel state and notifications | Student dashboard API usage in `frontend/app/student-dashboard/*.tsx` |
| Operational resilience under load | Stable API behavior under realistic traffic | [documentation.md](documentation.md), `stress-tests/` artifacts |
| Maintainable engineering pipeline | Repeatable checks and builds | `.github/workflows/quality.yml`, `.github/workflows/build-android-apk.yml` |

<a id="sec-6-scope-definition"></a>
## 6. Scope Definition

<a id="sec-61-in-scope-capabilities"></a>
### 6.1 In-Scope Capabilities
- Multi-role authentication (guard/admin/student).
- Student registration with OTP verification.
- Student password reset via OTP verification.
- Guard parcel intake, assignment, update, OTP dispatch, and OTP verification.
- QR-based pickup validation and student delegation flow.
- Student room-change request lifecycle with admin review and resolution.
- In-app student notifications and optional push token registration.
- Delivered parcel summary/cleanup operations for admin.
- Student archival workflow on deactivation.

<a id="sec-62-out-of-scope-boundaries"></a>
### 6.2 Out-of-Scope Boundaries
- Payment collection and billing workflows.
- Hardware-integrated scanner management beyond mobile camera usage.
- Multi-campus federation or distributed multi-tenant administration.
- Formal external security certification audit artifacts.

<a id="sec-7-stakeholders-and-user-roles"></a>
## 7. Stakeholders and User Roles

<a id="sec-71-guard-role"></a>
### 7.1 Guard Role
- Registers new parcels.
- Assigns parcels to students/rooms.
- Sends OTPs for pickup verification.
- Generates QR pickup tokens.
- Marks parcel delivered through OTP or verified QR flow.
- Views pending and delivered parcels for assigned hostel.

<a id="sec-72-student-role"></a>
### 7.2 Student Role
- Authenticates using roll number and password.
- Registers account through OTP verification flow.
- Views own/all relevant parcel data (hostel-scoped and role-scoped).
- Claims parcel via QR validation.
- Delegates parcel pickup through short delegation code.
- Receives notifications and can submit room-change requests.

<a id="sec-73-admin-role"></a>
### 7.3 Admin Role
- Adds users.
- Resolves room-change requests.
- Transfers/deactivates students.
- Reviews delivered parcel summaries.
- Triggers delivered-parcel cleanup and monitors cleanup state.

<a id="sec-8-functional-specification-coverage"></a>
## 8. Functional Specification Coverage

<a id="sec-81-authentication-and-identity-flows"></a>
### 8.1 Authentication and Identity Flows
| FR ID | Requirement | Implemented Through |
|---|---|---|
| FR-01 | Guard login | `POST /api/auth/guard/login` |
| FR-02 | Admin login | `POST /api/auth/admin/login` |
| FR-03 | Student login | `POST /api/auth/student/login` |
| FR-04 | Logout with token revocation | `POST /api/auth/logout` |
| FR-05 | Student registration OTP request | `POST /api/auth/student/register/request-otp` |
| FR-06 | Student registration OTP verification + account creation | `POST /api/auth/student/register/verify-otp` |
| FR-07 | Student forgot-password OTP request | `POST /api/auth/student/forgot-password/request-otp` |
| FR-08 | Student forgot-password OTP verify/reset | `POST /api/auth/student/forgot-password/verify-otp` |
| FR-09 | Change password | `PUT /api/auth/student/change-password` |
| FR-10 | Student profile retrieval | `GET /api/auth/student/profile` |

<a id="sec-82-parcel-lifecycle-flows"></a>
### 8.2 Parcel Lifecycle Flows
| FR ID | Requirement | Implemented Through |
|---|---|---|
| FR-11 | Add parcel | `POST /api/parcel/add` |
| FR-12 | Assign parcel | `PUT /api/parcel/assign` |
| FR-13 | Update parcel | `PUT /api/parcel/update` |
| FR-14 | Send parcel OTP | `POST /api/parcel/send-otp` |
| FR-15 | Verify OTP and deliver | `POST /api/parcel/verify-otp` |
| FR-16 | Generate QR pickup token | `POST /api/parcel/generate-qr` |
| FR-17 | Student delegation token generation | `POST /api/parcel/delegate` |
| FR-18 | Verify QR and complete pickup | `POST /api/parcel/verify-qr` |
| FR-19 | List hostel parcels by role scope | `GET /api/parcel/hostel/{hostel_type}` |
| FR-20 | Student delivered parcels list | `GET /api/parcel/student/my-parcels` |

<a id="sec-83-admin-and-room-management-flows"></a>
### 8.3 Admin and Room Management Flows
| FR ID | Requirement | Implemented Through |
|---|---|---|
| FR-21 | Create room-change request | `POST /api/student/room-change-request` |
| FR-22 | View room-change requests | `GET /api/admin/room-change-requests` |
| FR-23 | Resolve room-change request | `PATCH /api/admin/room-change-request/{request_id}` |
| FR-24 | Transfer student room | `PATCH /api/admin/student/room-transfer` |
| FR-25 | Deactivate/archive student | `PATCH /api/admin/student/deactivate` |
| FR-26 | View student room history | `GET /api/admin/student/room-history` |
| FR-27 | Add users | `POST /api/admin/add-user` |

<a id="sec-84-communication-and-notification-flows"></a>
### 8.4 Communication and Notification Flows
| FR ID | Requirement | Implemented Through |
|---|---|---|
| FR-28 | Store Expo push token | `PUT /api/auth/student/expo-token` |
| FR-29 | Retrieve student in-app notifications | `GET /api/student/notifications` |
| FR-30 | Email notification when parcel logged | Background send function in backend |
| FR-31 | Email OTP delivery for verification flows | OTP email functions in backend |

<a id="sec-85-policy-and-consent-screens"></a>
### 8.5 Policy and Consent Screens
Frontend includes user-facing policy and notice screens:
- `frontend/app/notice-board.tsx`
- `frontend/app/privacy-policy.tsx`
- `frontend/app/terms-and-conditions.tsx`

These support user awareness and consent communication before/within app workflows.

<a id="sec-9-non-functional-requirements"></a>
## 9. Non-Functional Requirements

<a id="sec-91-security"></a>
### 9.1 Security
- JWT-based identity with expiry and token revocation checks.
- Password hashing using bcrypt via passlib.
- OTP and QR/delegation secrets hashed before persistence.
- Strict input validators with control-character rejection and bounded lengths.

<a id="sec-92-reliability-and-availability"></a>
### 9.2 Reliability and Availability
- Async API stack using FastAPI + Motor.
- Index initialization at startup.
- Periodic maintenance task for delivered parcel cleanup.
- Graceful handling of notification failures (fallback logging behavior).

<a id="sec-93-performance"></a>
### 9.3 Performance
- Stress-tested under multiple load profiles (k6 + Locust).
- Measured low-to-moderate p95 latencies for major workflows.
- Stable workflow endpoints under sustained load in submitted artifacts.

<a id="sec-94-maintainability"></a>
### 9.4 Maintainability
- Centralized validation models.
- CI workflows for test/lint/type checks and secret scanning.
- Dedicated stress-test folder with reusable scripts.
- Environment templates (`backend/.env.example`, `frontend/.env.example`).

<a id="sec-95-usability-and-compatibility"></a>
### 9.5 Usability and Compatibility
- Mobile-oriented UI with role-specific dashboards.
- Expo-based cross-platform client path.
- Search and dashboard navigation support in current UI implementation.
- Session persistence with secure-store-first fallback strategy.

<a id="sec-10-system-architecture"></a>
## 10. System Architecture

<a id="sec-101-logical-architecture"></a>
### 10.1 Logical Architecture
```text
+-------------------------+       +---------------------------+       +-------------------------+
| Mobile App (Expo/RN)    | <-->  | FastAPI Backend (/api/*)  | <-->  | MongoDB                 |
| Guard/Student/Admin UI  |       | Validation + Auth + RBAC  |       | Users/Parcels/OTPs/etc. |
+-------------------------+       +---------------------------+       +-------------------------+
            |                                   |
            |                                   |
            v                                   v
+-------------------------+       +---------------------------+
| Expo Push Service       |       | SMTP Mail Delivery        |
| Push token messaging    |       | OTP + parcel notifications|
+-------------------------+       +---------------------------+
```

<a id="sec-102-component-responsibilities"></a>
### 10.2 Component Responsibilities
| Component | Responsibilities |
|---|---|
| Frontend app | User interaction, role-specific screens, token-based API calls, QR scan/display, local session storage |
| Backend API | Business logic, authn/authz, validation, data persistence, notifications, maintenance tasks |
| MongoDB | Persistent state for users, parcels, OTPs, notifications, revocations, archives |
| Stress-test suite | Performance and stability verification under controlled workloads |
| CI workflows | Quality checks, secret scanning, build automation |

<a id="sec-103-core-runtime-flows"></a>
### 10.3 Core Runtime Flows
1. **Authentication flow:** login -> JWT issuance -> interceptor-based authenticated API calls.
2. **Parcel intake flow:** add parcel -> optional assignment -> status timeline updates.
3. **Delivery flow (OTP):** send OTP -> verify OTP -> status DELIVERED.
4. **Delivery flow (QR):** guard generates token -> student verifies QR -> status DELIVERED.
5. **Room change flow:** student request -> admin resolve -> history/notifications updated.

<a id="sec-104-error-handling-strategy"></a>
### 10.4 Error-Handling Strategy
- Structured HTTP status code responses using `HTTPException`.
- Input validation errors surfaced before business logic execution.
- Rate-limit violations return `429`.
- Explicit `401/403/404` handling for auth and entity scope boundaries.

<a id="sec-11-backend-engineering-design-fastapi--mongodb"></a>
## 11. Backend Engineering Design (FastAPI + MongoDB)

<a id="sec-111-bootstrap-and-lifecycle"></a>
### 11.1 Bootstrap and Lifecycle
- App starts with `FastAPI` lifespan context.
- Startup tasks include index creation and admin user ensurement.
- Background cleanup task runs for delivered parcel maintenance.
- Shutdown path cancels background task and closes DB client.

<a id="sec-112-model-and-validation-layer"></a>
### 11.2 Model and Validation Layer
The backend defines request models for every critical operation, including:
- Login models (guard/student/admin),
- Registration and password reset models,
- Parcel add/assign/update/verify models,
- Room-change and admin action models,
- QR/delegation and push-token models.

Validation features include:
- Control-character rejection,
- Hostels/roles/status normalization,
- Regex enforcement for roll number, room number, username, OTP, contact numbers,
- Max length checks and strict schema (`extra="forbid"`).

<a id="sec-113-authorization-and-access-guards"></a>
### 11.3 Authorization and Access Guards
- `get_current_user` enforces valid bearer token and revocation checks.
- Role checks enforce endpoint ownership (GUARD/STUDENT/ADMIN).
- Hostel-scoped constraints prevent cross-hostel access.
- Parcel ownership/delegation logic protects student pickup operations.

<a id="sec-114-background-processing-and-cleanup"></a>
### 11.4 Background Processing and Cleanup
- Delivered parcel cleanup is scheduled with configurable interval and polling variables.
- Cleanup state (last run/deleted count) is exposed through admin status endpoint.
- Student notifications and left-student archive leverage TTL for retention control.

<a id="sec-115-security-middleware-and-hardening"></a>
### 11.5 Security Middleware and Hardening
Implemented middleware controls:
- Query string and request-body size checks,
- Mandatory `Content-Length` for write methods,
- Security headers (`nosniff`, frame deny, referrer policy, CSP, permissions policy, HSTS in production),
- CORS environment policy with production enforcement.

<a id="sec-12-frontend-engineering-design-expo--react-native"></a>
## 12. Frontend Engineering Design (Expo + React Native)

<a id="sec-121-route-architecture"></a>
### 12.1 Route Architecture
Frontend uses Expo Router with role-oriented route organization:
- Entry and role selection (`index.tsx`, `role-selection.tsx`, `hostel-selection.tsx`),
- Authentication screens (`guard-login.tsx`, `student-login.tsx`, `admin-login.tsx`),
- Guard dashboard routes,
- Student dashboard routes,
- Admin panel,
- Policy/legal screens.

Total route files in `frontend/app`: **19**.

<a id="sec-122-state-and-session-management"></a>
### 12.2 State and Session Management
- Zustand store (`frontend/store/authStore.ts`) tracks auth state and lifecycle.
- Session persistence via `expo-secure-store` when available.
- AsyncStorage fallback preserves functionality on unsupported environments.

<a id="sec-123-api-client-and-interceptor-design"></a>
### 12.3 API Client and Interceptor Design
`frontend/utils/api.ts` includes:
- Dynamic base URL resolution for local/dev environments,
- Request interceptor for normalized bearer token injection,
- Response interceptor that auto-clears session only for true auth token failures,
- Helper methods for QR/delegation endpoints.

<a id="sec-124-notification-integration"></a>
### 12.4 Notification Integration
`frontend/utils/notifications.ts` provides:
- Runtime permission handling,
- Push token acquisition for physical devices,
- Backend token registration via `PUT /api/auth/student/expo-token`.

<a id="sec-125-ui-components-and-ux-utilities"></a>
### 12.5 UI Components and UX Utilities
Reusable frontend pieces include:
- `AnimatedCard.tsx`, `ErrorPopup.tsx`, `ParcelTimeline.tsx`.
- Utilities for date-time formatting, error mapping, session management, and theming.

<a id="sec-13-data-model-collections-and-retention-policy"></a>
## 13. Data Model, Collections, and Retention Policy

<a id="sec-131-primary-collections"></a>
### 13.1 Primary Collections
| Collection | Purpose |
|---|---|
| `users` | Guard/student/admin records and student profile fields |
| `parcels` | Parcel records, assignment metadata, status, delivery markers, timeline |
| `otps` | OTP records for registration, reset, and parcel delivery verification |
| `token_revocations` | Revoked token markers with expiry |
| `room_change_requests` | Student room change requests and statuses |
| `room_change_request_daily_counters` | Daily request limiting support |
| `student_notifications` | In-app notification records |
| `left_students_archive` | Archived student snapshots on deactivation |

<a id="sec-132-indexing-and-ttl-strategy"></a>
### 13.2 Indexing and TTL Strategy
Configured indexes include:
- Revocation TTL index on `expires_at`.
- Room-change pending lookup compound index.
- Daily counter uniqueness index and TTL index.
- Student notifications lookup index and TTL index.
- Left-student archive lookup index and TTL index.

This design supports both query performance and controlled retention over time.

<a id="sec-133-data-retention-and-archive-lifecycle"></a>
### 13.3 Data Retention and Archive Lifecycle
- Student notifications expire through configurable TTL (`STUDENT_NOTIFICATION_TTL_SECONDS`).
- Archived student records expire based on configured retention (`LEFT_STUDENT_RETENTION_DAYS`).
- Delivered parcel cleanup job removes stale delivered data by configured interval.

<a id="sec-14-api-endpoint-inventory-37-endpoints"></a>
## 14. API Endpoint Inventory (37 Endpoints)

<a id="sec-141-endpoint-summary-by-domain"></a>
### 14.1 Endpoint Summary by Domain
| Domain | Count | Notes |
|---|---:|---|
| Base/health | 1 | Root route under `/api/` |
| Authentication | 11 | Guard/admin/student auth + OTP + profile + token update |
| Student domain | 2 | Room-change create + notifications |
| Admin domain | 9 | User management, room workflows, summary, cleanup |
| Parcel domain | 13 | Intake, assignment, update, OTP, QR, delegation, list endpoints |
| Guard student lookup | 1 | `GET /api/student/{student_id}` |
| **Total** | **37** | Decorators in `backend/server.py` |

<a id="sec-142-api-design-notes"></a>
### 14.2 API Design Notes
- APIs are namespaced under `/api`.
- Methods follow standard REST semantics (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
- Most endpoint payloads are validated through explicit Pydantic request models.
- Role and hostel scope checks are enforced server-side regardless of client behavior.

<a id="sec-15-security-architecture-and-threat-controls"></a>
## 15. Security Architecture and Threat Controls

<a id="sec-151-identity-and-token-security"></a>
### 15.1 Identity and Token Security
- JWT token generation includes `exp`, `iat`, and unique `jti`.
- JWT verification rejects expired or invalid signatures.
- Logout writes revocation markers; revocation is checked at auth guard layer.
- Secret values (OTP/QR/delegation tokens) are hashed with SHA-256-derived material and compared using constant-time digest comparison.

<a id="sec-152-input-and-payload-protections"></a>
### 15.2 Input and Payload Protections
- Control character rejection for string fields.
- Regex and structural constraints for usernames, roll numbers, room numbers, OTPs, IDs.
- Max field length and request-size boundaries to limit abuse vectors.

<a id="sec-153-rate-limiting-and-abuse-controls"></a>
### 15.3 Rate Limiting and Abuse Controls
- In-memory sliding-window rate limiter for authentication-sensitive endpoints.
- Keying strategy combines path + client IP.
- Exceeded limits return HTTP `429`.

<a id="sec-154-transport-and-header-protections"></a>
### 15.4 Transport and Header Protections
- Security headers set for all responses.
- HSTS enabled in production mode.
- CORS origins are enforced by environment setting and mandatory in production.

<a id="sec-155-environment-hardening-and-operational-safety"></a>
### 15.5 Environment Hardening and Operational Safety
Production checks enforce:
- Non-empty `JWT_SECRET_KEY` with minimum length requirements.
- Non-empty `ADMIN_PASSWORD` with minimum length requirements.
- Disallowing sensitive logging and debug OTP response behavior in production.
- Explicit CORS origin configuration.

<a id="sec-16-international-standards-and-coding-standards-alignment"></a>
## 16. International Standards and Coding Standards Alignment

<a id="sec-161-international-and-industry-standards"></a>
### 16.1 International and Industry Standards
| Standard / Framework | Alignment in Project | Evidence |
|---|---|---|
| RFC 7519 (JSON Web Token) | JWT structure and claim-based token handling | JWT encode/decode logic in `backend/server.py` |
| RFC 9110 (HTTP Semantics) | Method semantics and status code usage | API method decorators and `HTTPException` usage |
| RFC 8259 (JSON) | JSON request/response contracts | FastAPI JSON body usage across APIs |
| OWASP API Security Top 10 | Mitigations for auth, input, and access risks | Validation + rate limit + role checks + tests |
| OWASP ASVS (reference baseline) | Verification-oriented control mindset | Guardrail tests and production hardening checks |
| ISO/IEC 27001 control intent (alignment) | Secrets/configuration management practices | `.env` strategy + production safety checks |
| ISO/IEC 25010 quality model (alignment) | Security, reliability, maintainability, performance focus | CI + stress tests + modular frontend utilities |

<a id="sec-162-language-level-and-team-coding-standards"></a>
### 16.2 Language-Level and Team Coding Standards
| Area | Standard/Tooling | Evidence |
|---|---|---|
| Python style and typing | PEP 8, PEP 484 aligned coding patterns | `backend/server.py`, typed helpers/models |
| Python quality tooling | `black`, `flake8`, `isort`, `mypy`, `pyright` listed in requirements/tooling | `backend/requirements.txt`, `pyrightconfig.json` |
| TypeScript strictness | Strict mode enabled | `frontend/tsconfig.json` (`"strict": true`) |
| Frontend linting | ESLint (Expo config) | `frontend/eslint.config.js` |

<a id="sec-163-standards-compliance-statement"></a>
### 16.3 Standards Compliance Statement
This project demonstrates **standards alignment in engineering practice**. No formal third-party certification (for example, official ISO certification audit) is claimed in this report.

<a id="sec-17-testing-verification-and-quality-assurance"></a>
## 17. Testing, Verification, and Quality Assurance

<a id="sec-171-automated-backend-guardrail-tests"></a>
### 17.1 Automated Backend Guardrail Tests
- Test file: `tests/test_security_guardrails.py` (261 lines).
- Focus areas:
  - Production env guardrails,
  - Object ID parsing and validation failures,
  - Cross-hostel and cross-role authorization protections,
  - OTP validation constraints,
  - JWT claim presence,
  - Security header injection checks.

<a id="sec-172-ci-quality-gates"></a>
### 17.2 CI Quality Gates
Two workflows are present:
1. `quality.yml`
   - Secret scanning (`gitleaks`),
   - Backend tests (`pytest -q tests`),
   - Frontend lint and TypeScript checks.
2. `build-android-apk.yml`
   - On-demand Android release APK generation and artifact upload.

<a id="sec-173-stress-and-load-test-strategy"></a>
### 17.3 Stress and Load Test Strategy
Stress strategy is documented in [documentation.md](documentation.md) and `stress-tests/`.

Coverage includes:
- k6: ramp, spike, soak, breakpoint, input-growth.
- Locust: mixed user-journey in performance and rate-limit modes.

<a id="sec-18-performance-results-summary-from-documentationmd"></a>
## 18. Performance Results Summary (From documentation.md)

<a id="sec-181-k6-summary"></a>
### 18.1 k6 Summary
| Scenario | Max VUs | p95 Latency | Error Rate | Status |
|---|---:|---:|---:|---|
| Ramp | 100 | 103.88 ms | 0.00% | PASS |
| Spike | 200 | 793.61 ms | 0.00% | PASS |
| Soak | 40 | 17.64 ms | 0.00% | PASS |
| Breakpoint | 300 | 1.00 s | 0.00% | PASS |
| Input Growth (final run) | 12 VUs / 180 iterations | 28.79 ms | 0.00% | PASS |

<a id="sec-182-locust-summary"></a>
### 18.2 Locust Summary
- **Performance Mode:** 2934 requests, 3.17% failures, failures concentrated in auth throttling (`429`) during startup pressure.
- **Rate-Limit Mode:** 1655 requests, 0.00% failures, expected controlled throttle behavior with stable downstream endpoints.

<a id="sec-183-interpretation-for-production-readiness"></a>
### 18.3 Interpretation for Production Readiness
1. Workflow endpoints remain stable under tested loads.
2. Rate-limiter behavior is active and observable under stress.
3. No crash-level instability is reported in submitted artifacts.
4. Additional student/admin high-load paths should be expanded in future cycles.

<a id="sec-19-devops-deployment-and-operations"></a>
## 19. DevOps, Deployment, and Operations

<a id="sec-191-local-development-workflow"></a>
### 19.1 Local Development Workflow
- Backend startup and sample-data scripts are documented in `STARTUP.md`.
- Environment templates:
  - `backend/.env.example`
  - `frontend/.env.example`
- Stress test execution guide: `stress-tests/README.md`.

<a id="sec-192-cicd-workflows"></a>
### 19.2 CI/CD Workflows
- Quality checks on push/PR via GitHub Actions.
- Manual Android build workflow for release artifact generation.

<a id="sec-193-android-maintenance-operations"></a>
### 19.3 Android Maintenance Operations
`document/ANDROID_DEPENDENCY_MAINTENANCE_PLAN.md` defines:
- Weekly dependency health checks,
- Monthly warning audits,
- Quarterly controlled upgrade windows.

<a id="sec-194-operational-considerations"></a>
### 19.4 Operational Considerations
- Production requires strict secret/environment configuration.
- SMTP configuration drives OTP email delivery path.
- CORS and proxy trust settings should match deployment topology.

<a id="sec-20-repository-structure-and-important-files"></a>
## 20. Repository Structure and Important Files
```text
HostelDrop/
|- backend/
|  |- server.py
|  |- .env.example
|  |- requirements.txt
|  |- seed_database.py
|  |- add_sample_parcels.py
|  |- import_students*.py
|  |- clear_*.py
|- frontend/
|  |- app/                     (19 route files)
|  |- components/
|  |- store/
|  |- utils/
|  |- package.json
|  |- tsconfig.json
|  |- eslint.config.js
|- tests/
|  |- test_security_guardrails.py
|- stress-tests/
|  |- k6/
|  |- locustfile.py
|  |- reports and charts
|- document/
|  |- ANDROID_DEPENDENCY_MAINTENANCE_PLAN.md
|  |- GMAIL_SETUP.md
|  |- BACK_BUTTON_SEARCH_COMPLETE.md
|- .github/workflows/
|  |- quality.yml
|  |- build-android-apk.yml
|- documentation.md
|- PROJECT_REPORT.md
```

<a id="sec-21-current-limitations-risks-and-mitigation-plan"></a>
## 21. Current Limitations, Risks, and Mitigation Plan
| Limitation / Risk | Impact | Mitigation Proposal |
|---|---|---|
| Large monolithic backend file (`backend/server.py`) | Harder long-term modular maintenance | Split routers/services/schemas into packages |
| Python pyright currently `typeCheckingMode: off` | Reduced static typing enforcement | Move to `basic` then `strict` incrementally |
| CI frontend quality workflow uses `yarn` while repo has `package-lock.json` | Tooling inconsistency | Standardize lockfile + package manager policy |
| Stress tests concentrated on key flows, not full role matrix | Partial performance observability | Add dedicated student/admin high-load journeys |
| Mixed historical documentation around email configuration paths | Potential onboarding confusion | Consolidate email setup docs around current SMTP path |

<a id="sec-22-future-enhancement-roadmap"></a>
## 22. Future Enhancement Roadmap
1. Refactor backend into modular packages (`auth`, `parcel`, `admin`, `student`, `infra`).
2. Expand unit/integration tests beyond security guardrails to broader business rules.
3. Add observability stack (structured metrics, distributed tracing, dashboarding).
4. Introduce persistent/distributed rate limiting for scaled multi-instance deployments.
5. Build OpenAPI-driven API client generation and contract tests.
6. Add role-wise performance SLOs and automated regression thresholds.
7. Add formal migration/versioning strategy for data schema evolution.

<a id="sec-23-conclusion"></a>
## 23. Conclusion
HostelDrop delivers a practical and secure hostel parcel management platform with real implementation depth across backend validation, role-scoped authorization, notification pipelines, and measurable stress-test evidence. The codebase demonstrates strong project maturity for an academic system and provides clear pathways for enterprise-grade hardening through modularization, stronger static typing, and expanded automated coverage.

<a id="sec-24-reference-list"></a>
## 24. Reference List
1. [documentation.md](documentation.md) - Consolidated stress and performance results.
2. `backend/server.py` - Core backend architecture, API routes, security controls.
3. `tests/test_security_guardrails.py` - Security and authorization verification suite.
4. `backend/.env.example` - Backend runtime configuration template.
5. `frontend/.env.example` - Frontend runtime configuration template.
6. `frontend/utils/api.ts` - API client and interceptor behavior.
7. `frontend/store/authStore.ts` - Auth state management.
8. `frontend/utils/sessionStorage.ts` - Session persistence strategy.
9. `.github/workflows/quality.yml` - Quality automation pipeline.
10. `.github/workflows/build-android-apk.yml` - Android build pipeline.
11. `stress-tests/README.md` - Stress test execution guide.
12. `document/ANDROID_DEPENDENCY_MAINTENANCE_PLAN.md` - Android maintenance SOP.
13. `STARTUP.md` - Development startup steps.

<a id="sec-25-heading-to-artifact-traceability-matrix"></a>
## 25. Heading-to-Artifact Traceability Matrix
| Report Heading | Primary Evidence Pointer(s) |
|---|---|
| Section 3 (Executive Summary) | `backend/server.py`, `frontend/app/*`, [documentation.md](documentation.md) |
| Section 6 (Scope) | API decorators in `backend/server.py`, route files in `frontend/app` |
| Section 8 (Functional Coverage) | Endpoint decorators + frontend API calls (`frontend/app/*.tsx`) |
| Section 9 (NFRs) | `backend/server.py`, `stress-tests/`, `.github/workflows/quality.yml` |
| Section 10 (Architecture) | `backend/server.py`, `frontend/utils/api.ts`, `frontend/store/authStore.ts` |
| Section 11 (Backend Design) | `backend/server.py` |
| Section 12 (Frontend Design) | `frontend/app`, `frontend/utils`, `frontend/components`, `frontend/store` |
| Section 13 (Data Model) | Collection usage in `backend/server.py` |
| Section 14 (API Inventory) | Route decorators in `backend/server.py` |
| Section 15 (Security) | Middleware/auth/validation in `backend/server.py`, tests in `tests/test_security_guardrails.py` |
| Section 16 (Standards Alignment) | API/auth implementations + configs and tests |
| Section 17 (Testing/QA) | `tests/test_security_guardrails.py`, `.github/workflows/quality.yml`, `stress-tests/` |
| Section 18 (Performance) | [documentation.md](documentation.md), stress reports in `stress-tests/*` |
| Section 19 (DevOps/Ops) | `STARTUP.md`, workflows, Android maintenance plan |
| Section 20 (Structure) | Repository tree |
| Section 21 (Limitations) | `backend/server.py`, `pyrightconfig.json`, workflow/package manager files |
| Section 22 (Roadmap) | Engineering assessment based on current repository shape |

<a id="sec-26-appendix-a---full-endpoint-list"></a>
## 26. Appendix A - Full Endpoint List

| # | Method | Path | Primary Intended Role |
|---:|---|---|---|
| 1 | GET | `/api/` | Public/diagnostic |
| 2 | POST | `/api/auth/guard/login` | Guard |
| 3 | POST | `/api/auth/admin/login` | Admin |
| 4 | POST | `/api/auth/student/login` | Student |
| 5 | POST | `/api/auth/logout` | Authenticated user |
| 6 | POST | `/api/auth/student/register/request-otp` | Student onboarding |
| 7 | POST | `/api/auth/student/register/verify-otp` | Student onboarding |
| 8 | PUT | `/api/auth/student/expo-token` | Student |
| 9 | POST | `/api/auth/student/forgot-password/request-otp` | Student recovery |
| 10 | POST | `/api/auth/student/forgot-password/verify-otp` | Student recovery |
| 11 | PUT | `/api/auth/student/change-password` | Student |
| 12 | GET | `/api/auth/student/profile` | Student |
| 13 | POST | `/api/student/room-change-request` | Student |
| 14 | GET | `/api/student/notifications` | Student |
| 15 | GET | `/api/admin/room-change-requests` | Admin |
| 16 | PATCH | `/api/admin/room-change-request/{request_id}` | Admin |
| 17 | POST | `/api/admin/add-user` | Admin |
| 18 | PATCH | `/api/admin/student/room-transfer` | Admin |
| 19 | PATCH | `/api/admin/student/deactivate` | Admin |
| 20 | GET | `/api/admin/student/room-history` | Admin |
| 21 | GET | `/api/admin/users` | Admin |
| 22 | GET | `/api/admin/parcels/delivered/summary` | Admin |
| 23 | GET | `/api/admin/parcels/delivered/auto-delete-status` | Admin |
| 24 | DELETE | `/api/admin/parcels/delivered` | Admin |
| 25 | POST | `/api/parcel/add` | Guard |
| 26 | PUT | `/api/parcel/assign` | Guard |
| 27 | PUT | `/api/parcel/update` | Guard |
| 28 | POST | `/api/parcel/send-otp` | Guard |
| 29 | POST | `/api/parcel/verify-otp` | Guard |
| 30 | POST | `/api/parcel/generate-qr` | Guard |
| 31 | POST | `/api/parcel/delegate` | Student |
| 32 | POST | `/api/parcel/verify-qr` | Student |
| 33 | GET | `/api/parcel/hostel/{hostel_type}` | Guard/Student/Admin (scoped) |
| 34 | GET | `/api/parcel/student/my-parcels` | Student |
| 35 | GET | `/api/parcel/guard/pending` | Guard |
| 36 | GET | `/api/parcel/guard/delivered` | Guard |
| 37 | GET | `/api/student/{student_id}` | Guard |

<a id="sec-27-appendix-b---environment-variable-catalog"></a>
## 27. Appendix B - Environment Variable Catalog

### 27.1 Backend Environment Variables (`backend/.env.example`)
| Variable | Purpose | Typical Requirement |
|---|---|---|
| `APP_ENV` | Runtime mode (`development`/`production`/`test`) | Required |
| `MONGO_URL` | MongoDB connection URI | Required |
| `DB_NAME` | Primary DB name | Required |
| `JWT_SECRET_KEY` | JWT signing secret | Required |
| `ADMIN_EMAIL` | Admin identity email | Required |
| `ADMIN_PASSWORD` | Admin bootstrap password | Required |
| `CORS_ORIGINS` | Allowed web origins | Required in production |
| `ENABLE_SENSITIVE_LOGGING` | Toggle sensitive logs | Must remain false in production |
| `INCLUDE_DEBUG_OTP_IN_RESPONSE` | Debug OTP echo in API | Must remain false in production |
| `TRUST_PROXY_HEADERS` | Proxy header trust behavior | Deployment-dependent |
| `ENFORCE_STUDENT_EMAIL_DOMAIN` | Restrict student mail domain | Optional but recommended |
| `STUDENT_EMAIL_DOMAIN` | Allowed student email domain | Optional |
| `SMTP_EMAIL` | Sender email for SMTP path | Required for real email sends |
| `SMTP_APP_PASSWORD` | SMTP app password | Required for real email sends |
| `AUTO_DELETE_DELIVERED_INTERVAL_SECONDS` | Delivered cleanup interval | Optional with defaults |
| `AUTO_DELETE_DELIVERED_POLL_SECONDS` | Cleanup scheduler poll frequency | Optional with defaults |
| `MAX_REQUEST_BODY_BYTES` | Request body limit | Optional with defaults |
| `MAX_QUERY_STRING_BYTES` | Query-string limit | Optional with defaults |
| `MIN_PASSWORD_LENGTH` | Password policy lower bound | Optional with defaults |
| `MIN_JWT_SECRET_LENGTH` | JWT secret policy lower bound | Optional with defaults |

### 27.2 Frontend Public Environment Variables (`frontend/.env.example`)
| Variable | Purpose | Requirement |
|---|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | Base backend URL for frontend API client | Required in most deployment contexts |

### 27.3 Stress Test Runtime Variables (`stress-tests/README.md`)
| Variable | Purpose |
|---|---|
| `BASE_URL` | Target backend host |
| `HOSTEL_TYPE` | Test hostel context |
| `GUARD_USERNAME` | Guard credential for load scripts |
| `GUARD_PASSWORD` | Guard credential for load scripts |
| `LOCUST_TEST_MODE` | Locust mode (`performance` or `rate-limit`) |
| `SOAK_VUS`, `SOAK_DURATION`, `VUS`, `ITERATIONS`, `PAYLOAD_SIZES` | k6 scenario control parameters |

---

**End of Report**
