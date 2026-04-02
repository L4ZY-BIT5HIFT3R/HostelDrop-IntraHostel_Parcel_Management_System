# Goal Description
The user wants to deprecate Email-based OTP authentication for Student Login, relying on it only for Student Registration. Students will now set a password during registration and use a standard `Roll Number` + `Password` scheme to log in.

## Proposed Changes

### Backend Changes

---

#### [MODIFY] [server.py](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/backend/server.py)
We will introduce password-based routing for Students and restructure the endpoints:
1. **Student Registration**:
   - Update [StudentRegisterVerify](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/backend/server.py#151-159) to include `password: str`.
   - Before inserting the student into MongoDB in `/auth/student/register/verify-otp`, we will hash the [password](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/backend/server.py#232-234) and store it inside the student object.
2. **Student Login**:
   - Add a new traditional login endpoint: `POST /api/auth/student/login` which accepts [(roll_number, password, hostel_type)](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/test_qr_direct.py#21-59).
   - It will verify the password hash against the stored hash in MongoDB, then issue the JWT [access_token](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/test_qr_direct.py#15-20). 
   - Remove the old `/api/auth/student/request-otp` and `/api/auth/student/verify-otp` endpoints which were used for OTP-based logins.

### Frontend Changes

---

#### [MODIFY] [frontend/app/student-login.tsx](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/app/student-login.tsx)
We will rebuild the [StudentLogin](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/app/student-login.tsx#23-350) component to handle both flows cleanly:
1. **Login Mode**:
   - Fields: `Roll Number`, `Password`.
   - Action: "Login" button directly calls `api.post('/auth/student/login', ...)` (no OTP involved).
2. **Register Mode**:
   - Fields: `Name`, `Room Number`, `Phone`, `Roll Number`, `Email`, **and `Password`**.
   - Action: "Send Registration OTP" triggers the email. Then the student enters the OTP to complete registration (the password will be sent along with the verified OTP).

#### [MODIFY] [frontend/app/guard-dashboard/index.tsx](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/app/guard-dashboard/index.tsx)
- Automatically removing the legacy "Send OTP" parcel pickup mechanism, leaving only the successful "Show QR" mechanism for tracking parcel handoffs.

## Verification Plan
1. Completely refresh backend to drop legacy OTP routes.
2. Sign up a completely new Student with a dummy email, set a password, verify via OTP, and ensure they are added to the DB.
3. Log out. Log in instantly with the newly created password!
