# Stress Testing Report

Project: HostelDrop Intra-Hostel Parcel Management System  
Date: 2026-04-10  
Environment: Local (Windows, PowerShell, k6 v1.7.1)

## 1. Objective

The objective of this test cycle was to evaluate backend API behavior under:

- Gradually increasing load (ramp)
- Sudden traffic surges (spike)
- Long-duration sustained traffic (soak)
- Capacity edge load (breakpoint)
- Increasing input payload sizes (input growth)

Primary success criteria:

- Threshold checks pass for latency and error rate
- No unexpected 5xx or network failures
- Stable behavior under sustained and high-concurrency load

## 2. Test Setup

### Backend

- Base URL: `http://localhost:8001`
- Authentication used in tests: Guard login
- Guard credentials used:
  - Username: `guard`
  - Password: `guard123`
  - Hostel type: `BOYS`

### k6 scripts executed

- `stress-tests/k6/load-ramp.js`
- `stress-tests/k6/spike.js`
- `stress-tests/k6/soak.js`
- `stress-tests/k6/breakpoint.js`
- `stress-tests/k6/input-growth.js`

## 3. Scenario-Wise Results

### 3.1 Ramp Load Test (`load-ramp.js`)

Scenario profile:

- Max VUs: 100
- Duration: 6 minutes (+ graceful stop)

Thresholds:

- `http_req_duration`: p95 < 1200 ms, p99 < 2500 ms
- `http_req_failed`: rate < 3%

Observed:

- p95: 103.88 ms
- p99: 149.43 ms
- Error rate: 0.00%
- HTTP requests: 31,573
- Result: PASS

Interpretation:

- System handles progressive traffic increase with low latency and zero failures.

---

### 3.2 Spike Test (`spike.js`)

Scenario profile:

- Max VUs: 200
- Duration: 3.5 minutes (+ graceful stop)

Thresholds:

- `http_req_duration`: p95 < 2000 ms
- `http_req_failed`: rate < 5%

Observed:

- p95: 793.61 ms
- Avg latency: 406.17 ms
- Error rate: 0.00%
- HTTP requests: 27,905
- Result: PASS

Interpretation:

- During sudden high load, latency increased but stayed within threshold.
- No request failures, indicating good spike tolerance.

---

### 3.3 Soak Test (`soak.js`)

Scenario profile:

- Constant VUs: 40
- Duration: 60 minutes

Thresholds:

- `http_req_duration`: p95 < 1200 ms
- `http_req_failed`: rate < 2%

Observed:

- p95: 17.64 ms
- Avg latency: 10.31 ms
- Error rate: 0.00%
- HTTP requests: 142,476
- Result: PASS

Interpretation:

- Excellent long-run stability.
- No evidence of performance degradation over one hour.

---

### 3.4 Breakpoint Test (`breakpoint.js`)

Scenario profile:

- Max VUs: 300
- Duration: 7 minutes (+ graceful stop)

Thresholds:

- `http_req_duration`: p95 < 5000 ms
- `http_req_failed`: rate < 20%

Observed:

- p95: 1.00 s
- Avg latency: 296.88 ms
- Error rate: 0.00%
- HTTP requests: 99,147
- Result: PASS

Interpretation:

- Backend remained stable up to 300 VUs in this scenario.
- No failure-driven saturation observed within tested range.

---

### 3.5 Input Growth Test (`input-growth.js`)

Scenario profile:

- VUs: 12
- Shared iterations: 180
- Payload sizes tested via `PAYLOAD_SIZES`: `32,128,256,512,1024,2048,4096`

Thresholds:

- `http_req_duration`: p95 < 2500 ms
- `http_req_failed`: rate < 8%

Important note on two runs:

- First run showed threshold failure on `http_req_failed` because expected 4xx validation responses were counted as failures by default k6 behavior.
- Script was updated to mark expected statuses as valid for this test type.

Final run after fix:

- p95: 28.79 ms
- Avg latency: 11.9 ms
- Error rate: 0.00%
- HTTP requests: 181
- Result: PASS

Interpretation:

- Input growth handling is performant.
- Validation rejections are expected behavior for oversized/invalid payload cases and are now correctly classified.

## 4. Overall Outcome

Overall status: PASS

All core scenarios passed after the input-growth expected-status handling adjustment.

Key conclusions:

- Backend is stable under normal and high concurrent read-heavy guard flows.
- System is resilient under spike and sustained traffic.
- Input-size growth behavior is acceptable and validation behavior is controlled.

## 5. Risks and Gaps

- Tests primarily covered guard login and parcel list/add flows.
- Student flow, admin flow, and parcel assign/update/delivery OTP workflow were not heavily load-tested in this run.
- Tests were executed in local environment; production-like network and infrastructure effects are not represented.

## 6. Recommended Next Test Cycle

1. Add mixed workflow load tests for:
   - `PUT /api/parcel/assign`
   - `PUT /api/parcel/update`
   - student login and student parcel listing
2. Capture k6 outputs to files using:
   - `--summary-export`
   - `--out json=...`
3. Run a production-like environment test (staging) with realistic DB size and concurrent users.
4. Add SLO-aligned thresholds (for example: p95 < 300 ms for key endpoints) if required by project goals.

## 7. Command Set Used

```powershell
.\.venv\Scripts\Activate.ps1
$env:BASE_URL="http://localhost:8001"
$env:HOSTEL_TYPE="BOYS"
$env:GUARD_USERNAME="guard"
$env:GUARD_PASSWORD="guard123"

k6 run .\stress-tests\k6\load-ramp.js
k6 run .\stress-tests\k6\spike.js

$env:SOAK_VUS="40"
$env:SOAK_DURATION="60m"
k6 run .\stress-tests\k6\soak.js

k6 run .\stress-tests\k6\breakpoint.js

$env:VUS="12"
$env:ITERATIONS="180"
$env:PAYLOAD_SIZES="32,128,256,512,1024,2048,4096"
k6 run .\stress-tests\k6\input-growth.js
```
