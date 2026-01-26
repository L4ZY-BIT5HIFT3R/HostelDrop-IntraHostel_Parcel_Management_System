#!/bin/bash

echo "======================================"
echo "Testing Hostel Parcel Management API"
echo "======================================"
echo ""

# Test 1: Guard Login
echo "Test 1: Guard Login"
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/guard/login \
  -H "Content-Type: application/json" \
  -d '{"username":"boys_guard","password":"guard123","hostel_type":"BOYS"}' | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✓ Guard login successful"
  echo "Token: ${TOKEN:0:50}..."
else
  echo "✗ Guard login failed"
  exit 1
fi
echo ""

# Test 2: Add Parcel with Roll Number
echo "Test 2: Add Parcel with Roll Number"
PARCEL1=$(curl -s -X POST http://localhost:8001/api/parcel/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"hostel_type":"BOYS","room_number":"101","roll_number":"2021001","description":"Amazon Package"}')

echo "$PARCEL1" | grep -q "Parcel added successfully" && echo "✓ Parcel with roll number added" || echo "✗ Failed to add parcel"
PARCEL1_ID=$(echo "$PARCEL1" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
echo "Parcel ID: $PARCEL1_ID"
echo ""

# Test 3: Add Parcel without Roll Number
echo "Test 3: Add Parcel without Roll Number"
PARCEL2=$(curl -s -X POST http://localhost:8001/api/parcel/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"hostel_type":"BOYS","room_number":"105","student_name":"Unknown Student","description":"Flipkart Package"}')

echo "$PARCEL2" | grep -q "Parcel added successfully" && echo "✓ Parcel without roll number added (UNASSIGNED)" || echo "✗ Failed to add parcel"
PARCEL2_ID=$(echo "$PARCEL2" | grep -o '"_id":"[^"]*' | cut -d'"' -f4)
echo "Parcel ID: $PARCEL2_ID"
echo ""

# Test 4: Get Pending Parcels
echo "Test 4: Get Pending Parcels"
PENDING=$(curl -s -X GET http://localhost:8001/api/parcel/guard/pending \
  -H "Authorization: Bearer $TOKEN")

echo "$PENDING" | grep -q "parcels" && echo "✓ Fetched pending parcels" || echo "✗ Failed to fetch parcels"
echo ""

# Test 5: Assign Unassigned Parcel
echo "Test 5: Assign Unassigned Parcel"
ASSIGN=$(curl -s -X PUT http://localhost:8001/api/parcel/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"parcel_id\":\"$PARCEL2_ID\",\"roll_number\":\"2021002\",\"hostel_type\":\"BOYS\",\"room_number\":\"105\"}")

echo "$ASSIGN" | grep -q "assigned successfully" && echo "✓ Parcel assigned successfully" || echo "✗ Failed to assign parcel"
echo ""

# Test 6: Send OTP for Parcel
echo "Test 6: Send OTP for Parcel"
OTP_RESPONSE=$(curl -s -X POST http://localhost:8001/api/parcel/send-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"parcel_id\":\"$PARCEL1_ID\"}")

echo "$OTP_RESPONSE" | grep -q "OTP sent" && echo "✓ OTP sent successfully" || echo "✗ Failed to send OTP"
OTP_CODE=$(echo "$OTP_RESPONSE" | grep -o '"otp":"[^"]*' | cut -d'"' -f4)
echo "OTP Code (for testing): $OTP_CODE"
echo ""

# Test 7: Verify OTP and Deliver Parcel
echo "Test 7: Verify OTP and Deliver Parcel"
VERIFY=$(curl -s -X POST http://localhost:8001/api/parcel/verify-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"parcel_id\":\"$PARCEL1_ID\",\"otp_code\":\"$OTP_CODE\"}")

echo "$VERIFY" | grep -q "delivered successfully" && echo "✓ Parcel delivered successfully" || echo "✗ Failed to deliver parcel"
echo ""

# Test 8: Get Delivered Parcels
echo "Test 8: Get Delivered Parcels"
DELIVERED=$(curl -s -X GET http://localhost:8001/api/parcel/guard/delivered \
  -H "Authorization: Bearer $TOKEN")

echo "$DELIVERED" | grep -q "parcels" && echo "✓ Fetched delivered parcels" || echo "✗ Failed to fetch delivered parcels"
echo ""

# Test 9: Student OTP Request
echo "Test 9: Student OTP Request"
STUDENT_OTP=$(curl -s -X POST http://localhost:8001/api/auth/student/request-otp \
  -H "Content-Type: application/json" \
  -d '{"roll_number":"2021001","email":"rahul.kumar@iiitg.ac.in","hostel_type":"BOYS"}')

echo "$STUDENT_OTP" | grep -q "OTP sent" && echo "✓ Student OTP request successful" || echo "✗ Student OTP request failed"
echo ""

echo "======================================"
echo "All Backend Tests Completed!"
echo "======================================"
