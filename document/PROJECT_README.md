# 📦 Hostel Parcel Management System

A comprehensive mobile application for managing parcel deliveries in hostel environments, built with Expo (React Native), FastAPI, and MongoDB.

## 🌟 Features

### Entry Flow
- **Role Selection**: Guard or Student
- **Hostel Selection**: Boys Hostel or Girls Hostel
- **Secure Authentication**: Different login methods for Guards and Students

### 👮 Guard Features
**Two-Tab Interface:**
1. **Parcel Management Tab**
   - Log new parcels (with or without roll number)
   - View all PENDING and UNASSIGNED parcels
   - Assign unassigned parcels to students
   - Trigger OTP for parcel delivery
   - Verify OTP and mark parcels as DELIVERED

2. **Delivered Parcels Tab**
   - View all delivered parcels
   - Track delivery history with timestamps

### 🎓 Student Features
**Two-Tab Interface:**
1. **All Parcels Tab**
   - View all logged parcels in their hostel
   - See pending parcels

2. **My Parcels Tab**
   - View personal delivered parcels
   - Track parcel receipt history

### 🔐 Authentication

#### Guard Login
- Username + Password authentication
- Hostel-specific access control

#### Student Login
- Roll Number + College Email authentication
- OTP-based verification via email
- Email format: `name@iiitg.ac.in`

### 📦 Parcel Handling Rules

#### Case 1: Parcel WITH Roll Number
- Automatically mapped to the student
- Notification sent to student's email
- OTP sent when guard triggers delivery
- Guard verifies OTP for handover

#### Case 2: Parcel WITHOUT Roll Number
- Marked as UNASSIGNED
- Guard manually assigns roll number and room
- After assignment, OTP flow activates

## 🛠️ Tech Stack

- **Frontend**: Expo (React Native) with TypeScript
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Email**: Gmail with OAuth2
- **State Management**: Zustand
- **Navigation**: Expo Router with Tab Navigation

## 📱 Installation & Setup

### Prerequisites
- Node.js and Yarn
- Python 3.11+
- MongoDB
- Expo Go app (for mobile testing)

### Backend Setup

1. Install Python dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Configure environment variables in `backend/.env`:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
JWT_SECRET_KEY="your-secret-key-change-in-production"

# Gmail OAuth2 (add after obtaining credentials)
GMAIL_CLIENT_ID="your-client-id"
GMAIL_CLIENT_SECRET="your-client-secret"
GMAIL_REFRESH_TOKEN="your-refresh-token"
```

3. Seed the database with test users:
```bash
python seed_database.py
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
yarn install
```

2. Start the Expo development server:
```bash
yarn start
```

3. Scan QR code with Expo Go app to test on mobile

## 🔑 Gmail OAuth2 Setup

To enable email OTP functionality:

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable Gmail API

2. **Create OAuth2 Credentials**
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Select "Desktop app" as application type
   - Download credentials JSON

3. **Generate Refresh Token**
   - Use the OAuth2 Playground or a script to generate refresh token
   - Scope needed: `https://www.googleapis.com/auth/gmail.send`

4. **Add to Backend .env**
   ```env
   GMAIL_CLIENT_ID="your-client-id"
   GMAIL_CLIENT_SECRET="your-client-secret"
   GMAIL_REFRESH_TOKEN="your-refresh-token"
   ```

**Note**: Until Gmail credentials are configured, OTPs will be logged to the console for testing.

## 👥 Test User Credentials

### Guards

**Boys Hostel Guard**
- Username: `boys_guard`
- Password: `guard123`

**Girls Hostel Guard**
- Username: `girls_guard`
- Password: `guard123`

### Students

**Boys Hostel**
- Roll: `2021001`, Email: `rahul.kumar@iiitg.ac.in`
- Roll: `2021002`, Email: `amit.singh@iiitg.ac.in`
- Roll: `2021003`, Email: `raj.sharma@iiitg.ac.in`

**Girls Hostel**
- Roll: `2021004`, Email: `priya.patel@iiitg.ac.in`
- Roll: `2021005`, Email: `sneha.reddy@iiitg.ac.in`
- Roll: `2021006`, Email: `ananya.gupta@iiitg.ac.in`

## 🔄 Complete User Flow

### Guard Workflow
1. Select "Guard" → Select Hostel → Login with credentials
2. Add new parcel:
   - Enter room number (mandatory)
   - Enter roll number (optional)
   - If roll number provided and exists → Status: PENDING
   - If no roll number → Status: UNASSIGNED
3. For UNASSIGNED parcels:
   - Click "Assign"
   - Enter roll number and room number
   - Status changes to PENDING
4. For PENDING parcels:
   - Click "Send OTP"
   - OTP sent to student's email
   - Student provides OTP
   - Guard enters OTP and clicks "Verify & Deliver"
   - Status changes to DELIVERED
5. View delivered parcels in "Delivered" tab

### Student Workflow
1. Select "Student" → Select Hostel → Enter credentials
2. Click "Send OTP"
3. Check email for OTP
4. Enter OTP and login
5. View all parcels in hostel (All Parcels tab)
6. View personal delivered parcels (My Parcels tab)

## 📂 Project Structure

```
app/
├── backend/
│   ├── server.py                 # FastAPI application
│   ├── seed_database.py          # Database seeding script
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Environment variables
│
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx           # Root layout
│   │   ├── index.tsx             # Splash screen
│   │   ├── role-selection.tsx   # Role selection screen
│   │   ├── hostel-selection.tsx # Hostel selection screen
│   │   ├── guard-login.tsx       # Guard login
│   │   ├── student-login.tsx     # Student login
│   │   ├── admin-panel.tsx       # Admin interface
│   │   ├── guard-dashboard/
│   │   │   ├── _layout.tsx       # Guard tabs layout
│   │   │   ├── index.tsx         # Parcel management
│   │   │   └── delivered.tsx     # Delivered parcels
│   │   └── student-dashboard/
│   │       ├── _layout.tsx       # Student tabs layout
│   │       ├── index.tsx         # All parcels
│   │       └── my-parcels.tsx    # My delivered parcels
│   ├── store/
│   │   └── authStore.ts          # Authentication state management
│   ├── utils/
│   │   └── api.ts                # API client with interceptors
│   └── package.json
```

## 🔒 Security Features

- JWT-based authentication
- Bcrypt password hashing
- Role-based access control
- Hostel-level authorization
- OTP expiration (10 minutes)
- Single-use OTP tokens

## 🎯 Key Constraints

✅ **Included:**
- Email OTP verification
- Role-based authentication
- Hostel type separation
- Manual verification for unassigned parcels

❌ **Not Included:**
- SMS OTP
- QR codes
- AI/Face recognition
- Claim codes
- Automated parcel sorting

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  role: "GUARD" | "STUDENT" | "ADMIN",
  hostel_type: "BOYS" | "GIRLS",
  username: String (for guards),
  password: String (hashed, for guards),
  roll_number: String (for students),
  email: String (for students),
  room_number: String (for students),
  created_at: DateTime
}
```

### Parcels Collection
```javascript
{
  _id: ObjectId,
  hostel_type: "BOYS" | "GIRLS",
  room_number: String,
  status: "PENDING" | "UNASSIGNED" | "DELIVERED",
  student_id: ObjectId (nullable),
  roll_number: String (optional),
  student_name: String (optional),
  student_email: String (optional),
  description: String (optional),
  logged_by_guard: ObjectId,
  created_at: DateTime,
  delivered_at: DateTime (optional)
}
```

### OTPs Collection
```javascript
{
  _id: ObjectId,
  parcel_id: String (optional),
  email: String,
  otp_code: String (6 digits),
  expiry_time: DateTime,
  is_used: Boolean,
  created_at: DateTime
}
```

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/guard/login` - Guard login
- `POST /api/auth/student/request-otp` - Request OTP for student
- `POST /api/auth/student/verify-otp` - Verify OTP and login

### Admin
- `POST /api/admin/add-user` - Add guard or student
- `GET /api/admin/users` - Get all users

### Parcels
- `POST /api/parcel/add` - Add new parcel (guard only)
- `PUT /api/parcel/assign` - Assign unassigned parcel (guard only)
- `POST /api/parcel/send-otp` - Send OTP for delivery (guard only)
- `POST /api/parcel/verify-otp` - Verify OTP and mark delivered (guard only)
- `GET /api/parcel/hostel/{hostel_type}` - Get parcels by hostel
- `GET /api/parcel/student/my-parcels` - Get student's delivered parcels
- `GET /api/parcel/guard/pending` - Get pending/unassigned parcels
- `GET /api/parcel/guard/delivered` - Get delivered parcels

## 🧪 Testing

### Manual Testing Flow

1. **Test Guard Login**
   ```bash
   curl -X POST http://localhost:8001/api/auth/guard/login \
     -H "Content-Type: application/json" \
     -d '{"username":"boys_guard","password":"guard123","hostel_type":"BOYS"}'
   ```

2. **Test Add Parcel**
   ```bash
   curl -X POST http://localhost:8001/api/parcel/add \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"hostel_type":"BOYS","room_number":"101","roll_number":"2021001"}'
   ```

3. **Test Student OTP Request**
   ```bash
   curl -X POST http://localhost:8001/api/auth/student/request-otp \
     -H "Content-Type: application/json" \
     -d '{"roll_number":"2021001","email":"rahul.kumar@iiitg.ac.in","hostel_type":"BOYS"}'
   ```

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Native Feel**: Platform-specific components
- **Smooth Animations**: Natural transitions
- **Touch-Friendly**: 48px minimum touch targets
- **Pull-to-Refresh**: Update data easily
- **Loading States**: Clear feedback on actions
- **Error Handling**: User-friendly error messages
- **Tab Navigation**: Easy switching between views

## 📱 Mobile Compatibility

- **iOS**: Full support via Expo Go
- **Android**: Full support via Expo Go
- **Web**: Preview available (limited functionality)

## 🔧 Admin Panel

Access the admin panel to add new guards and students:
- Navigate to `/admin-panel` route
- Add guards with username/password
- Add students with roll number, email, room number
- Select hostel type for each user

## 🐛 Troubleshooting

### Email OTP not working
- Check Gmail OAuth2 credentials
- Verify refresh token is valid
- Check backend logs for OTP codes (development mode)

### Parcels not showing
- Verify user is logged into correct hostel
- Check network connection
- Pull to refresh the list

### Authentication issues
- Clear app data and login again
- Verify credentials with seed data
- Check backend is running

## 📝 License

This project is created for academic purposes as part of an Application Development course.

## 👨‍💻 Support

For issues or questions:
1. Check this README thoroughly
2. Review backend logs
3. Check frontend console logs
4. Verify database connection

---

**Built with ❤️ for IIIT Guwahati Hostel Management**
