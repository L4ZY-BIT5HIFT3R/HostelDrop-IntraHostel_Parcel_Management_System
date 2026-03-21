# International Code Standards Alignment

## Purpose
This document explains how the Hostel Delivery Management project aligns with commonly accepted international software engineering and security standards.

Important: this is an implementation alignment document, not a formal certification report.

---

## Standards Referenced
- ISO/IEC 27001 (information security management principles)
- OWASP ASVS and OWASP secure coding practices
- RFC 7519 (JWT)
- General clean code and maintainability practices used in modern software teams

---

## Architecture and Maintainability Alignment

### 1. Typed Frontend Contracts (Type Safety)
- Frontend is built with TypeScript strict mode enabled.
- This reduces runtime defects from invalid types and unsafe assumptions.
- Evidence: `frontend/tsconfig.json` uses `"strict": true`.

### 2. Linting and Consistent Style
- ESLint is configured and integrated in frontend scripts.
- This enforces consistent coding conventions and reduces common mistakes.
- Evidence: `frontend/eslint.config.js`, `frontend/package.json` (`lint` script).

### 3. Dependency Pinning for Reproducibility
- Python dependencies are pinned to exact versions.
- This supports deterministic builds and reduces environment drift.
- Evidence: `backend/requirements.txt`.

### 4. API Modeling and Validation
- FastAPI + Pydantic models provide explicit request/response contracts.
- Input validation aligns with defensive programming best practices.
- Evidence: request/response models in `backend/server.py`.

---

## Security Standards Alignment

### 1. Secret Management via Environment Variables
- Sensitive values are sourced from environment variables (`.env`) instead of hardcoding in source.
- Production mode enforces required critical values.
- Evidence: `backend/server.py`, `backend/.env.example`, `backend/.env`.
- Keys enforced in production:
  - `JWT_SECRET_KEY`
  - `ADMIN_PASSWORD`
  - `CORS_ORIGINS`

### 2. Authentication and Password Security
- Passwords are hashed with bcrypt via Passlib.
- Authentication uses bearer tokens (JWT) with expiry.
- Evidence: `hash_password`, `verify_password`, `create_access_token` in `backend/server.py`.

### 3. JWT Expiration and Verification
- JWT includes expiration (`exp`) and explicit token verification handling.
- Helps reduce impact of token theft and stale sessions.
- Evidence: `create_access_token`, `verify_token` in `backend/server.py`.

### 4. CORS Hardening by Environment
- CORS is now environment-driven through `CORS_ORIGINS`.
- Production requires explicit allowlist configuration.
- Evidence: CORS configuration logic in `backend/server.py`.

### 5. Sensitive Logging Controls
- OTP and email operations use safer logging with masked email support.
- Plain OTP logging is controlled by toggle (`ENABLE_SENSITIVE_LOGGING`).
- Evidence: email/OTP logging logic in `backend/server.py`.

### 6. OTP Security Controls
- OTP codes are time-bound and single-use.
- Previous unused OTPs are invalidated before issuing new OTPs.
- Evidence: OTP generation, storage, invalidation, and verification flow in `backend/server.py`.

### 7. Role-Based Access Control
- Endpoints enforce role checks for guard/student/admin actions.
- Aligns with least privilege principles.
- Evidence: `require_admin` and route-level role checks in `backend/server.py`.

---

## Quality Assurance and Verification Alignment

### 1. Automated Test Baseline
- Baseline security guardrail tests added to validate critical configuration enforcement behavior.
- Evidence: `tests/test_security_guardrails.py`.

### 2. CI Quality Gates
- CI workflow runs backend tests plus frontend lint and type checks.
- Helps detect regressions before merge/deploy.
- Evidence: `.github/workflows/quality.yml`.

---

## Operational Configuration Alignment

### 1. Environment Template for Safe Onboarding
- `.env.example` documents required runtime variables without exposing secrets.
- Teams can copy template and fill local secrets safely.
- Evidence: `backend/.env.example`.

### 2. Development Compatibility
- `INCLUDE_DEBUG_OTP_IN_RESPONSE` supports controlled debug behavior in development.
- Can be disabled for production-safe behavior.
- Evidence: `backend/server.py`, `backend/.env`.

---

## Current Compliance Position

The project demonstrates strong alignment with practical secure coding and quality controls expected in modern software development, including:
- secure config management
- input validation
- token-based auth with expiry
- password hashing
- role-based access checks
- CI quality gates
- baseline automated tests

This should be treated as "standards-aligned implementation", not "formally certified compliance".

---

## Recommended Next Steps for Stronger Alignment
- Add endpoint-level integration tests for login, OTP, and parcel lifecycle.
- Add dependency vulnerability scanning in CI.
- Add structured security headers and rate limiting on auth/OTP endpoints.
- Add formal threat model and incident response notes.
- Add data retention policy for OTP and logs.

---

## Summary
The project follows key international coding and secure engineering practices and now has a documented, test-backed baseline aligned with recognized standards. It is suitable for academic demonstration and practical deployment hardening, with clear paths to reach higher compliance maturity.
