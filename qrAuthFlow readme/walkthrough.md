# QR Code Parcel Pickup Implementation

We have successfully implemented the highly requested QR Code Parcel Pickup feature! This modernizes the delivery workflow by replacing manual OTP typing with a simple, secure QR Code scan.

## 1. Backend Changes ([server.py](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/backend/server.py))
- We added secure QR Code token request/response models.
- **`POST /api/parcel/generate-qr`**: A Guard-only endpoint. Validates that a parcel is `PENDING`, securely generates a random UUID (`qr_pickup_token`), and saves it to the specific Parcel Document.
- **`POST /api/parcel/verify-qr`**: A Student-only endpoint. Validates that the scanned QR code corresponds directly to the authenticated Student running the app. Automatically changes the parcel status to `DELIVERED` and nullifies the token upon success.

## 2. Shared Utilities ([frontend/utils/api.ts](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/utils/api.ts))
- Added two helper functions: [generateQrCode(parcel_id)](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/utils/api.ts#72-76) and [verifyQrCode(parcel_id, token)](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/utils/api.ts#77-81) which securely process data against our new FastAPI endpoints.

## 3. Guard App ([frontend/app/guard-dashboard/index.tsx](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/app/guard-dashboard/index.tsx))
- Installed `react-native-qrcode-svg`.
- **UI Added**: A purple **"Show QR Code"** button next to every PENDING parcel card.
- **Functionality**: When clicked, it asks the backend for a token and instantly displays a massive, clean QR Code inside a modal, along with instructions to present it to a student.

## 4. Student App ([frontend/app/student-dashboard/index.tsx](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/app/student-dashboard/index.tsx))
- Installed `expo-camera`.
- **UI Added**: A floating full-width **"Scan to Pickup"** button pinned to the top of the dashboard.
- **Functionality**: When clicked, it automatically asks for camera permissions, scales to a full-screen optimized Camera scanner looking specifically for QR barcodes. Upon an accurate scan, it silently validates against the backend API and reveals a "Success!" message inside a React Native Alert—dynamically updating the parcel list.

---

## Next Steps for Validation
Since testing a physical camera functionality inside an emulator is notoriously difficult, please follow this manual testing guide on your physical device or robust emulator:

1. Go to your terminal and start **both** the backend and frontend:
   - Backend: `uvicorn server:app --reload --port 8001`
   - Frontend: `npx expo start -c`
2. Open the HostelDrop App on your physical device (e.g., via the Expo Go app).
3. **Login as a Guard**. Assign a package to a student, then tap **"Show QR"** on their order. Keep this screen visible.
4. On a separate device (or simulated on one), **Login as the assigned Student**.
5. Tap **"Scan to Pickup"** and point the camera at the Guard's QR code.
6. Boom! Verify the `DELIVERED` status updates instantly.

# Password-Based Student Authentication Migration

We have successfully migrated the students away from the legacy Email OTP login system to a more traditional and secure Roll Number + Password login system. OTPs are now strictly utilized for one-time validations during the registration process.

## 1. Backend Modifications ([server.py](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/backend/server.py))
- **Deprecated Routes:** Deleted the legacy `POST /auth/student/request-otp` and `POST /auth/student/verify-otp` which were utilized strictly for logins.
- **`POST /auth/student/login`:** Added a standard password validation endpoint that returns exactly the same JWT payload format previously expected.
- **Registration Upgrades:** Overhauled [StudentRegisterVerify](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/backend/server.py#146-155) structurally to legally require a [password](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/backend/server.py#233-235) parameter hash during OTP verification and creation.

## 2. Frontend Modifications ([frontend/app/student-login.tsx](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/app/student-login.tsx))
- Completely stripped out the complex OTP parsing UI arrays that conditionally hid behind the "Login" tab.
- Integrated a sleek and straightforward "Password" `<TextInput>` alongside real-time UI switching logic.
- **Login Mode:** Immediately requests the `Roll Number` and `Password` — invoking a 1-to-1 secure transaction to the new endpoint.
- **Register Mode:** Requests all registration fields at once, including password assignment, hiding unnecessary fields appropriately, and hitting the upgraded verification endpoints flawlessly.

## Verification
A robust E2E python script fully simulated:
1. Sending an OTP via SMTP directly to the college email inbox in [Register](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/backend/server.py#146-155) Mode.
2. Collecting and extracting data seamlessly to `verify-otp`.
3. Demonstrating that the backend flawlessly salted and hashed the custom database payload.
4. Testing that logins automatically map `Roll Number` directly against hashes rejecting bad inputs with 401 Unauthorized codes!
