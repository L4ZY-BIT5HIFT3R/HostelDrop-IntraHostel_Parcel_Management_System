# Goal Description
The user wants to implement "Delegate Pickup (Collect on Behalf)". This allows students to authorize a friend to collect their parcel securely by sharing a one-time delegation code.

## Proposed Changes

### Backend Changes

---

#### [MODIFY] [server.py](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/backend/server.py)
We will introduce delegation mechanisms to parcels:
1. **Delegation Code Generation Endpoint** (`POST /api/parcel/{id}/delegate`):
   - A student can securely request a one-time, random 6-character alphanumerical string.
   - Saves `delegation_code` and `delegation_expiry` (10m) to the specific `Pending` Parcel in MongoDB.
2. **Scanner Verification Endpoint Updates** (`POST /api/parcel/verify-qr`):
   - Add optional `delegation_code` in the [VerifyQRRequest](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/backend/server.py#209-213).
   - Update verification logic: Validate against student owner `student_id` OR check if a `delegation_code` was passed that correctly matches the DB (while unexpired).
   - Clear the `delegation_code` securely on success.

### Frontend Changes

---

#### [MODIFY] [frontend/utils/api.ts](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/utils/api.ts)
- Bind the new generation endpoint: `generateDelegationCode(parcelId)`.
- Support the `delegationCode` payload parameter in [verifyQrCode(parcelId, token, delegationCode)](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/utils/api.ts#77-81).

#### [MODIFY] [frontend/app/student-dashboard/index.tsx](file:///d:/CS300/HostelDrop-IntraHostel_Parcel_Management_System/frontend/app/student-dashboard/index.tsx)
1. **Delegate Action**:
   - For `PENDING` parcels, add a "Delegate Pickup" button.
   - Pops open a React Native `Alert` or modal sharing the 6 PIN to give to their friend.
2. **Collection Action**:
   - For friends arriving at the desk, provide a "Pickup for Friend" button or inject a Text Input box directly inside the Camera scanning mechanism.
   - It will attach the dynamically typed `delegation_code` during QR ingestion.

## Verification Plan
1. Start local `uvicorn` and `expo`.
2. Generate a parcel directly via the Guard account.
3. Authenticate as the Student owner, click "Delegate Pickup", and note the PIN.
4. Log out. Log in as a completely different student (roommate). 
5. Attempt scanning the Guard's QR code. Ensure it fails normally.
6. Click "Pickup for Friend", enter the PIN, scan again, and confirm successful delivery!
