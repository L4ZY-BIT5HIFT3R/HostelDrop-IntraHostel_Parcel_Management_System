# 🚀 Quick Start Guide - Hostel Parcel Management System

## ✅ System Status: READY TO USE!

All components are successfully deployed and running:
- ✅ Backend API (FastAPI) - Running on port 8001
- ✅ Frontend (Expo) - Running on port 3000  
- ✅ Database (MongoDB) - Connected and seeded
- ✅ Test users created and verified

## 📱 Access Your App

### Mobile App (Recommended)
1. **Download Expo Go app** on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Check Expo logs** for the QR code and URL

3. **Scan QR code** with Expo Go app to launch the mobile app

### Web Preview
- Frontend URL: Check Expo logs for web URL
- Backend API: http://localhost:8001/api

## 🔐 Login Credentials

### Guards (Username + Password)

**Boys Hostel Guard**
- Username: `boys_guard`
- Password: `guard123`
- Hostel: Boys

**Girls Hostel Guard**
- Username: `girls_guard`
- Password: `guard123`
- Hostel: Girls

### Students (Roll Number + Email + OTP)

**Boys Hostel Students:**
1. Rahul Kumar
   - Roll: `2021001`
   - Email: `rahul.kumar@iiitg.ac.in`
   - Room: 101

2. Amit Singh
   - Roll: `2021002`
   - Email: `amit.singh@iiitg.ac.in`
   - Room: 102

3. Raj Sharma
   - Roll: `2021003`
   - Email: `raj.sharma@iiitg.ac.in`
   - Room: 103

**Girls Hostel Students:**
1. Priya Patel
   - Roll: `2021004`
   - Email: `priya.patel@iiitg.ac.in`
   - Room: 201

2. Sneha Reddy
   - Roll: `2021005`
   - Email: `sneha.reddy@iiitg.ac.in`
   - Room: 202

3. Ananya Gupta
   - Roll: `2021006`
   - Email: `ananya.gupta@iiitg.ac.in`
   - Room: 203

## 📋 Testing Workflow

### Test 1: Guard Login & Add Parcel
1. Open app → Select "Guard" → Select "Boys Hostel"
2. Login with: `boys_guard` / `guard123`
3. Click "Add Parcel" button
4. Enter:
   - Room Number: `101`
   - Roll Number: `2021001` (optional)
   - Description: `Amazon Package`
5. Click "Add Parcel"
6. Parcel should appear in the list as "PENDING"

### Test 2: Send OTP & Deliver Parcel
1. In Guard Dashboard, find the parcel you just added
2. Click "Send OTP" button
3. **Check backend logs** for OTP (since Gmail not configured yet):
   ```bash
   tail -f /var/log/supervisor/backend.out.log
   # Look for: Gmail not configured. OTP for email: 123456
   ```
4. Enter the OTP and click "Verify & Deliver"
5. Parcel status changes to "DELIVERED"
6. Check "Delivered" tab to see the delivered parcel

### Test 3: Student Login & View Parcels
1. Logout from guard (tap logout icon)
2. Select "Student" → Select "Boys Hostel"
3. Enter:
   - Roll Number: `2021001`
   - Email: `rahul.kumar@iiitg.ac.in`
4. Click "Send OTP"
5. **Check backend logs** for OTP
6. Enter OTP and click "Verify & Login"
7. View all parcels in "All Parcels" tab
8. View your delivered parcels in "My Parcels" tab

### Test 4: Assign Unassigned Parcel
1. Login as guard
2. Add a parcel **without roll number**:
   - Room: `105`
   - Student Name: `Unknown Student`
   - (Leave roll number empty)
3. Parcel appears as "UNASSIGNED"
4. Click "Assign" button
5. Enter:
   - Roll Number: `2021002`
   - Room Number: `105`
6. Parcel status changes to "PENDING"
7. Now you can send OTP and deliver

## 🔧 Admin Panel Access

To add more users manually:

1. The app doesn't have a direct route to admin panel yet
2. You can add users programmatically or via API
3. Or modify the seed script to add more users

### Via API (using curl):
```bash
# Add a new guard
curl -X POST http://localhost:8001/api/admin/add-user \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Guard",
    "role": "GUARD",
    "hostel_type": "BOYS",
    "username": "new_guard",
    "password": "password123"
  }'

# Add a new student
curl -X POST http://localhost:8001/api/admin/add-user \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Student",
    "role": "STUDENT",
    "hostel_type": "BOYS",
    "roll_number": "2021007",
    "email": "new.student@iiitg.ac.in",
    "room_number": "104"
  }'
```

## 📧 Email OTP Setup (Optional)

Currently, OTPs are printed to backend logs for testing. To enable actual email sending:

1. **See detailed guide**: `GMAIL_SETUP.md`
2. **Quick steps**:
   - Create Google Cloud project
   - Enable Gmail API
   - Create OAuth2 credentials
   - Generate refresh token
   - Add to `backend/.env`
3. **Restart backend**: `sudo supervisorctl restart backend`

Until configured, OTPs will appear in logs at:
```bash
tail -f /var/log/supervisor/backend.out.log
```

## 🐛 Troubleshooting

### Can't scan QR code
- Check Expo logs for the tunnel URL
- Try refreshing Metro bundler
- Ensure Expo Go app is installed

### OTP not showing
- Check backend logs: `tail -f /var/log/supervisor/backend.out.log`
- Look for: "Gmail not configured. OTP for [email]: [code]"

### Login failed
- Verify credentials match exactly
- Check network connection
- Ensure backend is running

### Parcels not showing
- Pull down to refresh the list
- Check you're logged into correct hostel
- Verify parcel was added successfully

### App crashes
- Check Expo error logs
- Restart expo: `sudo supervisorctl restart expo`
- Check for Metro bundler errors

## 📊 Database Management

### View all users:
```bash
curl http://localhost:8001/api/admin/users
```

### Reset and reseed database:
```bash
cd /app/backend
python seed_database.py
```

### Check MongoDB data:
```bash
mongosh
use test_database
db.users.find().pretty()
db.parcels.find().pretty()
db.otps.find().pretty()
```

## 🎯 Key Features Checklist

✅ **Entry Flow**
- [x] Role selection (Guard/Student)
- [x] Hostel selection (Boys/Girls)
- [x] Secure authentication

✅ **Guard Features**
- [x] Login with username/password
- [x] Add parcels (with/without roll number)
- [x] View pending & unassigned parcels
- [x] Assign unassigned parcels
- [x] Send OTP for delivery
- [x] Verify OTP and mark delivered
- [x] View delivered parcels history

✅ **Student Features**
- [x] Login with OTP verification
- [x] View all hostel parcels
- [x] View personal delivered parcels

✅ **Backend APIs**
- [x] Authentication (Guard & Student)
- [x] Parcel management
- [x] OTP generation and verification
- [x] Admin user management

✅ **Security**
- [x] JWT authentication
- [x] Password hashing (bcrypt)
- [x] Role-based access control
- [x] Hostel-level authorization
- [x] OTP expiration (10 minutes)

## 📱 Mobile App Features

- **Native UI**: Beautiful, professional design
- **Tab Navigation**: Easy switching between views
- **Pull-to-Refresh**: Update data anytime
- **Loading States**: Clear feedback on actions
- **Error Handling**: User-friendly messages
- **Keyboard Handling**: Smooth input experience
- **Safe Areas**: Proper spacing on all devices

## 🎓 For Your Project Submission

### What's Working:
1. ✅ Complete authentication system (Guard & Student)
2. ✅ Parcel lifecycle management (Add → Assign → OTP → Deliver)
3. ✅ Email OTP integration (ready, needs Gmail config)
4. ✅ Role-based access control
5. ✅ Hostel-specific data isolation
6. ✅ Mobile-first responsive design
7. ✅ Real-time data updates
8. ✅ Complete API backend with FastAPI
9. ✅ MongoDB database integration
10. ✅ Professional UI/UX

### Documentation:
- ✅ `PROJECT_README.md` - Complete project documentation
- ✅ `GMAIL_SETUP.md` - Gmail OAuth2 setup guide
- ✅ `QUICK_START.md` - This file
- ✅ API documentation in README
- ✅ Database schema documented

### Demo Ready:
- Use test credentials provided above
- Backend logs show OTPs for testing
- All features fully functional
- Professional mobile app interface

## 🚀 Next Steps

1. **Test the app thoroughly** using the workflow above
2. **Add Gmail OAuth2** for production email sending (optional)
3. **Customize as needed** for your specific requirements
4. **Deploy** if needed (documentation in main README)
5. **Demo to professors** - everything is ready!

## 💡 Tips for Demonstration

1. **Start with Entry Flow**
   - Show role selection
   - Show hostel selection
   - Demonstrate both guard and student login

2. **Show Complete Parcel Lifecycle**
   - Guard logs parcel
   - Guard sends OTP (show console log)
   - Guard verifies OTP
   - Student sees delivered parcel

3. **Highlight Key Constraints**
   - Explain room number requirement
   - Show unassigned parcel flow
   - Demonstrate manual verification

4. **Emphasize Security**
   - Role-based access
   - OTP verification
   - JWT authentication

## 📞 Need Help?

Refer to:
- `PROJECT_README.md` for complete documentation
- `GMAIL_SETUP.md` for email configuration
- Backend logs: `tail -f /var/log/supervisor/backend.out.log`
- Expo logs: Check terminal where Expo is running

---

**Your Hostel Parcel Management System is ready! Start testing and enjoy! 🎉**
