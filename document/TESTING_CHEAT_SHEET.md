# 🎯 TESTING CHEAT SHEET - Quick Reference

## ✅ SAMPLE DATA LOADED!

**8 Users Created:**
- 2 Guards (Boys & Girls Hostel)
- 6 Students (3 Boys, 3 Girls)

**9 Sample Parcels Added:**
- Boys Hostel: 5 parcels (3 PENDING, 2 UNASSIGNED)
- Girls Hostel: 4 parcels (3 PENDING, 1 UNASSIGNED)

---

## 🔐 LOGIN CREDENTIALS

### 👮 GUARDS (Username + Password)

#### Boys Hostel Guard
```
Username: boys_guard
Password: <SEED_GUARD_PASSWORD>
Hostel: Boys
```

#### Girls Hostel Guard
```
Username: girls_guard
Password: <SEED_GUARD_PASSWORD>
Hostel: Girls
```

---

### 🎓 STUDENTS (Roll Number + Email + OTP)

#### Boys Hostel Students

**Student 1: Rahul Kumar**
```
Roll Number: 2021001
Email: rahul.kumar@iiitg.ac.in
Room: 101
```

**Student 2: Amit Singh**
```
Roll Number: 2021002
Email: amit.singh@iiitg.ac.in
Room: 102
```

**Student 3: Raj Sharma**
```
Roll Number: 2021003
Email: raj.sharma@iiitg.ac.in
Room: 103
```

#### Girls Hostel Students

**Student 4: Priya Patel**
```
Roll Number: 2021004
Email: priya.patel@iiitg.ac.in
Room: 201
```

**Student 5: Sneha Reddy**
```
Roll Number: 2021005
Email: sneha.reddy@iiitg.ac.in
Room: 202
```

**Student 6: Ananya Gupta**
```
Roll Number: 2021006
Email: ananya.gupta@iiitg.ac.in
Room: 203
```

---

## 📦 SAMPLE PARCELS IN DATABASE

### Boys Hostel Parcels

| Room | Roll Number | Student Name | Description | Status |
|------|-------------|--------------|-------------|--------|
| 101  | 2021001     | Rahul Kumar  | Amazon Package - Books | PENDING |
| 102  | 2021002     | Amit Singh   | Flipkart - Electronics | PENDING |
| 103  | 2021003     | Raj Sharma   | Myntra - Clothing | PENDING |
| 104  | -           | Unknown Student | Speed Post - Documents | UNASSIGNED |
| 105  | -           | Unknown      | Courier - Package | UNASSIGNED |

### Girls Hostel Parcels

| Room | Roll Number | Student Name | Description | Status |
|------|-------------|--------------|-------------|--------|
| 201  | 2021004     | Priya Patel  | Amazon - Cosmetics | PENDING |
| 202  | 2021005     | Sneha Reddy  | Nykaa - Beauty Products | PENDING |
| 203  | 2021006     | Ananya Gupta | Flipkart - Books | PENDING |
| 204  | -           | Unknown Student | Blue Dart - Package | UNASSIGNED |

---

## 🧪 TESTING SCENARIOS

### ✅ Test 1: Guard Login & View Parcels
1. Open app → Select **"Guard"** → Select **"Boys Hostel"**
2. Login:
   - Username: `boys_guard`
   - Password: `<SEED_GUARD_PASSWORD>`
3. ✅ You should see **5 parcels** (3 PENDING + 2 UNASSIGNED)

### ✅ Test 2: Send OTP & Deliver Parcel
1. Login as Boys Hostel Guard (see Test 1)
2. Find parcel for **Room 101** (Rahul Kumar)
3. Click **"Send OTP"** button
4. Get OTP from backend logs:
   ```bash
   tail -f /var/log/supervisor/backend.out.log
   # Look for: Gmail not configured. OTP for rahul.kumar@iiitg.ac.in: 123456
   ```
5. Enter OTP (e.g., `123456`)
6. Click **"Verify & Deliver"**
7. ✅ Parcel moves to **"Delivered"** tab

### ✅ Test 3: Assign Unassigned Parcel
1. Login as Boys Hostel Guard
2. Find **UNASSIGNED** parcel (Room 104 or 105)
3. Click **"Assign"** button
4. Enter:
   - Roll Number: `2021002` (Amit Singh)
   - Room Number: `104`
5. Click **"Assign Parcel"**
6. ✅ Status changes from UNASSIGNED to PENDING
7. Now you can send OTP for this parcel

### ✅ Test 4: Student Login with OTP
1. Open app → Select **"Student"** → Select **"Boys Hostel"**
2. Enter credentials:
   - Roll Number: `2021001`
   - Email: `rahul.kumar@iiitg.ac.in`
3. Click **"Send OTP"**
4. Get OTP from backend logs:
   ```bash
   tail -f /var/log/supervisor/backend.out.log
   ```
5. Enter OTP
6. Click **"Verify & Login"**
7. ✅ You should see student dashboard with 2 tabs

### ✅ Test 5: Student View All Parcels
1. Login as student (see Test 4)
2. Go to **"All Parcels"** tab
3. ✅ You should see all PENDING parcels in Boys Hostel

### ✅ Test 6: Student View My Delivered Parcels
1. Login as student Rahul Kumar (2021001)
2. Go to **"My Parcels"** tab
3. ✅ You should see parcels that were delivered to you
4. (If empty, first deliver a parcel to this student as guard)

### ✅ Test 7: Add New Parcel
1. Login as Boys Hostel Guard
2. Click **"Add Parcel"** button
3. Fill form:
   - Room Number: `106`
   - Roll Number: `2021003` (optional)
   - Student Name: `Raj Sharma` (optional)
   - Description: `Test Package`
4. Click **"Add Parcel"**
5. ✅ New parcel appears in list

### ✅ Test 8: Cross-Hostel Verification
1. Login as Boys Hostel Guard
2. ✅ Should see only Boys Hostel parcels (5 parcels)
3. Logout
4. Login as Girls Hostel Guard
5. ✅ Should see only Girls Hostel parcels (4 parcels)
6. This verifies hostel-level data isolation

---

## 🔍 HOW TO GET OTP FROM LOGS

**Option 1: Real-time monitoring**
```bash
tail -f /var/log/supervisor/backend.out.log
```

**Option 2: Search recent logs**
```bash
tail -100 /var/log/supervisor/backend.out.log | grep "OTP for"
```

**Example log output:**
```
Gmail not configured. OTP for rahul.kumar@iiitg.ac.in: 234567
```

The OTP is: `234567`

---

## 🎮 QUICK TEST COMMANDS

### Check if backend is running:
```bash
curl http://localhost:8001/api/
```

### View all users:
```bash
curl http://localhost:8001/api/admin/users
```

### Test guard login:
```bash
curl -X POST http://localhost:8001/api/auth/guard/login \
  -H "Content-Type: application/json" \
  -d '{"username":"boys_guard","password":"<SEED_GUARD_PASSWORD>","hostel_type":"BOYS"}'
```

### Reseed database (if needed):
```bash
cd /app/backend
python seed_database.py
python add_sample_parcels.py
```

---

## 📱 APP URLS

**Check Expo logs for:**
- QR Code (scan with Expo Go app)
- Tunnel URL (e.g., https://hosteldrop.preview.emergentagent.com)
- Local URL (if testing on same network)

**View logs:**
```bash
tail -f /var/log/supervisor/expo.out.log
```

---

## 🐛 TROUBLESHOOTING

### Can't see parcels?
- Pull down to refresh
- Verify you're logged into correct hostel
- Check backend logs for errors

### OTP not working?
- Check backend logs for generated OTP
- OTP expires in 10 minutes
- Each OTP can only be used once

### Login failed?
- Verify credentials exactly (case-sensitive)
- Check backend is running: `curl http://localhost:8001/api/`
- Restart backend: `sudo supervisorctl restart backend`

### App not loading?
- Check Expo is running: `sudo supervisorctl status expo`
- Restart Expo: `sudo supervisorctl restart expo`
- Check for Metro bundler errors in logs

---

## 💡 DEMO TIPS

**For Professors:**
1. Start with Entry Flow (role → hostel → login)
2. Show Guard workflow (add → assign → OTP → deliver)
3. Show Student workflow (login with OTP → view parcels)
4. Highlight security (role-based access, OTP verification)
5. Explain constraints (room number mandatory, manual verification)

**Key Points to Emphasize:**
- ✅ Mobile-first design
- ✅ Role-based authentication
- ✅ OTP email verification
- ✅ Hostel-level data isolation
- ✅ Complete parcel lifecycle tracking
- ✅ Simple, explainable, defensible

---

## 📊 DATABASE QUICK CHECKS

```bash
# Count users
curl -s http://localhost:8001/api/admin/users | grep -o '"_id"' | wc -l

# Should output: 8

# View all users (formatted)
curl -s http://localhost:8001/api/admin/users | python3 -m json.tool
```

---

## ✨ EVERYTHING IS READY!

✅ Backend running and tested
✅ Frontend app deployed
✅ Sample data loaded (8 users + 9 parcels)
✅ All features working
✅ Documentation complete

**Start testing now! 🚀**

