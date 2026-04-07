# Rate Limiting Implementation TODO

- [x] Add in-memory rate limiter class with automatic cleanup in `backend/server.py`
- [x] Add reusable FastAPI dependency for rate-limit checks using `Request`
- [x] Apply rate-limit dependency to:
  - [x] `POST /api/auth/guard/login`
  - [x] `POST /api/auth/admin/login`
  - [x] `POST /api/auth/student/login`
  - [x] `POST /api/auth/student/forgot-password/request-otp`
  - [x] `POST /api/auth/student/forgot-password/verify-otp`
  - [x] `PUT /api/auth/student/change-password`
- [ ] Run syntax validation: `python -m py_compile backend/server.py`
- [ ] Mark all TODO items complete
