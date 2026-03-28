# Hostel Drop / Intra-Hostel Parcel Management System

## Project Overview
The Hostel Parcel Management System is a role-based system designed to automate and secure parcel handling inside hostels. It replaces manual processes with a structured digital workflow using authentication, OTP verification, and access control.

---

## User Roles

### Guard
- Logs incoming parcels
- Assigns parcels to students
- Sends OTP for parcel verification
- Verifies OTP at delivery
- Marks parcels as delivered

### Student
- Logs in using OTP
- Views parcel details and status

### Admin
- Manages users
- Monitors parcel data
- Views summary and reports

---

## Key Features

### Core Automation (Without AI)
- OTP-based login and verification
- Parcel lifecycle tracking:
  - UNASSIGNED
  - PENDING
  - DELIVERED
- Automatic student mapping using roll number
- Email notifications
- Hostel-based filtering and access control
- Admin dashboards and summaries
- Automatic reminders for pending parcels
- Audit logging of parcel activities
- Data cleanup and archiving

These features are implemented using standard backend logic (no AI required).

---

## AI Scope (Optional Enhancements)

AI is not required for the core system but can be added for advanced capabilities:

- OCR for parcel label reading
- Chatbot for parcel queries
- Voice input for guards
- Smart parcel-student matching
- Duplicate/anomaly detection
- Predictive analytics (parcel trends)
- Auto-generated reports

---

## AI Tools (Optional)

| Tool | Purpose | Cost |
|------|--------|------|
| Tesseract OCR | Label text extraction | Free |
| Ollama | Local chatbot | Free |
| OpenAI API | Advanced AI features | Paid |
| Gemini API | Multimodal AI | Paid |
| AWS Textract | Document extraction | Paid |
| Azure AI | Document intelligence | Paid |

Use AI only where necessary (unstructured data problems).

---

## Tech Stack

### Frontend
- Expo React Native

### Backend
- FastAPI (Python)

### Database
- MongoDB

### Authentication
- JWT + OTP-based login

### Architecture
- Role-based and hostel-based access control

---

## Parcel Lifecycle


---

## SDLC Model Used

This project follows an Iterative / Agile Model.

### Phases

1. Requirement Gathering
   - OTP login
   - Parcel tracking
   - Role-based access

2. System Analysis
   - Data flow
   - User roles
   - Security requirements

3. System Design
   - API architecture
   - Database schema
   - Authentication system

4. Implementation
   - Backend APIs
   - Frontend UI
   - Parcel workflow

5. Testing
   - OTP verification
   - Parcel lifecycle validation
   - Access control testing

6. Deployment
   - Backend server
   - Frontend app
   - MongoDB setup

7. Maintenance
   - Bug fixes
   - UI improvements
   - Optional AI integration

---
