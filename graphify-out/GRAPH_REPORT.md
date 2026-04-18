# Graph Report - D:\CS300\HostelDrop-IntraHostel_Parcel_Management_System  (2026-04-18)

## Corpus Check
- 51 files · ~497,781 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 390 nodes · 622 edges · 41 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]

## God Nodes (most connected - your core abstractions)
1. `SanitizedRequestModel` - 24 edges
2. `load_server_module()` - 19 edges
3. `validate_hostel_type()` - 18 edges
4. `extractErrorMessage()` - 18 edges
5. `parse_object_id()` - 12 edges
6. `require_admin()` - 11 edges
7. `hash_secret_value()` - 10 edges
8. `serialize_parcel()` - 9 edges
9. `send_parcel_otp()` - 9 edges
10. `build_status_event()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `handleTransferStudentRoom()` --calls--> `extractErrorMessage()`  [INFERRED]
  D:\CS300\HostelDrop-IntraHostel_Parcel_Management_System\frontend\app\admin-panel.tsx → D:\CS300\HostelDrop-IntraHostel_Parcel_Management_System\frontend\utils\errorMessage.ts
- `handleResolveRoomChangeRequest()` --calls--> `extractErrorMessage()`  [INFERRED]
  D:\CS300\HostelDrop-IntraHostel_Parcel_Management_System\frontend\app\admin-panel.tsx → D:\CS300\HostelDrop-IntraHostel_Parcel_Management_System\frontend\utils\errorMessage.ts
- `handleLogin()` --calls--> `extractErrorMessage()`  [INFERRED]
  D:\CS300\HostelDrop-IntraHostel_Parcel_Management_System\frontend\app\guard-login.tsx → D:\CS300\HostelDrop-IntraHostel_Parcel_Management_System\frontend\utils\errorMessage.ts
- `fetchStudentDetails()` --calls--> `extractErrorMessage()`  [INFERRED]
  D:\CS300\HostelDrop-IntraHostel_Parcel_Management_System\frontend\app\guard-dashboard\delivered.tsx → D:\CS300\HostelDrop-IntraHostel_Parcel_Management_System\frontend\utils\errorMessage.ts
- `test_guard_login_rejects_malformed_username()` --calls--> `GuardLoginRequest`  [INFERRED]
  D:\CS300\HostelDrop-IntraHostel_Parcel_Management_System\tests\test_security_guardrails.py → D:\CS300\HostelDrop-IntraHostel_Parcel_Management_System\backend\server.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (73): BaseModel, AddParcelRequest, AddUserRequest, AdminLoginRequest, AssignParcelRequest, ChangePasswordRequest, create_room_change_request(), CreateRoomChangeRequest (+65 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (31): handleLogin(), generateDelegationCode(), generateQrCode(), verifyQrCode(), extractErrorMessage(), flattenMessage(), isRecord(), normalizeMessage() (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (42): add_parcel(), assign_parcel(), build_delegated_receiver_info(), build_status_event(), generate_delegation(), generate_display_id(), generate_otp(), generate_parcel_qr() (+34 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (26): add_user(), admin_login(), app_lifespan(), auto_link_parcels_for_student(), build_room_assignment_doc(), create_access_token(), delete_delivered_parcels(), delete_delivered_parcels_by_query() (+18 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (24): get_hostel_parcels(), get_student_details(), _normalize_status(), Get parcels for a specific hostel, Get student details by ID, validate_parcel_status(), load_server_module(), temporary_env() (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (22): close_active_room_assignment(), compute_ist_retention_expiry_utc(), create_student_notification(), deactivate_student(), get_all_users(), get_delivered_auto_delete_status(), get_delivered_summary(), get_student_room_history() (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (12): setup(), guardLogin(), hostelType(), randomAlphaNum(), randomRoll(), randomRoom(), requiredEnv(), payloadForSize() (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (12): handleLogin(), loadHostelType(), handleRoleSelect(), clearAuthSession(), getAuthToken(), getItem(), getSecureStore(), getUserData() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (13): ensure_status_history(), get_delivered_parcels(), get_my_parcels(), get_pending_parcels(), get_student_notifications(), list_room_change_requests(), normalize_datetime_values(), Student fetches in-app notifications. (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.23
Nodes (8): confirmAction(), handleAddUser(), handleDeactivateStudent(), handleDeleteDeliveredParcels(), handleLogout(), handleResolveRoomChangeRequest(), handleTransferStudentRoom(), resetForm()

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (7): HttpUser, add_parcel_large_description(), add_parcel_small(), GuardWorkflowUser, _is_rate_limit_mode(), _random_description(), _random_room()

### Community 11 - "Community 11"
Cohesion: 0.32
Nodes (5): fetchParcels(), fetchStudentDetails(), getStackPadding(), handleRefresh(), updateActiveIndex()

### Community 12 - "Community 12"
Cohesion: 0.38
Nodes (4): formatDateInIST(), formatDateTimeInIST(), parseDate(), formatTimestamp()

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (3): enforce_auth_rate_limit(), InMemoryRateLimiter, Simple in-memory sliding-window rate limiter with periodic cleanup.

### Community 14 - "Community 14"
Cohesion: 0.7
Nodes (4): main(), make_iiitg_email(), map_hostel_type(), to_contact_number()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (4): main(), make_email(), Import students from TSV file into MongoDB. - Clears ALL existing STUDENT record, Generate iiitg email: firstname.lastname@iiitg.ac.in

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (3): add_sample_parcels(), get_guard_token(), Add sample parcels for testing

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (2): generate_display_id(), main()

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (1): Database Seed Script Run this to add initial users for testing  Users to add: 1.

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **57 isolated node(s):** `Add sample parcels for testing`, `Import students from TSV file into MongoDB. - Clears ALL existing STUDENT record`, `Generate iiitg email: firstname.lastname@iiitg.ac.in`, `Database Seed Script Run this to add initial users for testing  Users to add: 1.`, `UserRole` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 19`** (2 nodes): `main()`, `clear_delivered_parcels.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `main()`, `clear_students.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `hostel-selection.tsx`, `HostelSelection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `index.tsx`, `Index()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `notice-board.tsx`, `handleContinue()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `privacy-policy.tsx`, `PrivacyPolicy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `AddParcelShortcut()`, `add-parcel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `profile.tsx`, `Profile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `AnimatedCard()`, `AnimatedCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `reset-project.js`, `moveDirectories()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `normalizeToken()`, `authStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `notifications.ts`, `registerForPushNotificationsAsync()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `expo-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `metro.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `terms-and-conditions.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `_layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `_layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `_layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `expo-secure-store.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `theme.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `extractErrorMessage()` connect `Community 1` to `Community 9`, `Community 11`, `Community 7`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `InMemoryRateLimiter` connect `Community 13` to `Community 0`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `extractErrorMessage()` (e.g. with `handleLogin()` and `handleAddUser()`) actually correct?**
  _`extractErrorMessage()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Add sample parcels for testing`, `Import students from TSV file into MongoDB. - Clears ALL existing STUDENT record`, `Generate iiitg email: firstname.lastname@iiitg.ac.in` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._