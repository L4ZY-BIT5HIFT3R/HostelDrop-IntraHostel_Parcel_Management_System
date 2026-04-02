# QR Code Pickup: Authentication & Security Flow

Great question! The beauty of this feature is that we can leverage the **Student's existing JWT token** to guarantee that the correct person is picking up the parcel. 

Here is exactly how the authentication process works end-to-end:

### The Flow (Guard shows QR, Student scans)

1. **Guard Generates QR**:
   - The Guard opens a specific pending parcel in their app and taps "Generate Pickup QR".
   - The Backend generates a short-lived unique random token (e.g., a UUID or signed JWT) and saves it to the parcel document in MongoDB (e.g., `qr_pickup_token: "abcd-1234"`).
   - The Guard's phone displays a QR code containing a simple JSON payload: 
     `{"parcel_id": "65ab...123", "token": "abcd-1234"}`

2. **Student Scans**:
   - The Student walks up to the desk, opens their HostelDrop app (where they are already securely logged in), and taps "Scan to Pickup".
   - The Student's camera scans the Guard's phone.

3. **The API Request (The Core Authentication)**:
   - The Student's app automatically fires a request to `POST /api/parcel/verify-qr` sending the scanned `parcel_id` and [token](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/backend/server.py#234-242).
   - **Crucially**, this request includes the Student's `Authorization: Bearer <Student_JWT>` header.

4. **Backend Verification Logic**:
   - **Step 1:** Validate the API caller (via JWT). Who is making this request? *(Result: Student ID 'X')*
   - **Step 2:** Fetch the parcel (`parcel_id`). Does the parcel belong to Student 'X'? *(If no, throw 403 Forbidden - "This is not your parcel!")*
   - **Step 3:** Does the [token](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/backend/server.py#234-242) in the request match the `qr_pickup_token` stored in the database for this parcel? *(If no, throw 401 - "Invalid or expired QR code")*
   - **Step 4:** If everything matches, change the parcel status to `DELIVERED` and clear the token.

5. **Confirmation**:
   - The Student's app instantly shows a massive ✅ **"Verified!"** screen.
   - The Student shows this success screen to the Guard.
   - (Optional) The Guard's app can silently poll the backend every 2 seconds while displaying the QR code, so it automatically turns green when the student scans it successfully.

### Why is this highly secure?

* **No Impersonation:** Because the API call happens from the *Student's* phone using their own authenticated JWT, a random person cannot scan the QR code to steal the package. The backend explicitly checks `parcel.student_id == jwt.user_id`.
* **No Replay Attacks:** The `qr_pickup_token` is single-use. Once the parcel is marked delivered, the token is destroyed.
* **No Phishing/Shoulder Surfing:** Unlike a 6-digit OTP which can be overheard or guessed, the UUID token is long, cryptographically secure, and completely hidden inside the QR code.

### What do we need to build this?
* **Backend**: 
  1. Add a `/parcel/generate-qr` endpoint (Guard only).
  2. Add a `/parcel/verify-qr` endpoint (Student only).
* **Frontend (Guard)**: Install `react-native-qrcode-svg` to draw the QR code on screen.
* **Frontend (Student)**: Install `expo-camera` or `expo-barcode-scanner` to read the QR code.
