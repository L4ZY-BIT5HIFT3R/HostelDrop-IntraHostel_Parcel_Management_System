# Stress Testing Pack

This folder contains ready-to-run stress and performance test scripts for the backend API.

## Test Types Included

- Ramp load test (gradually increasing users)
- Spike test (sudden traffic jump)
- Soak test (long-duration stability)
- Breakpoint test (capacity discovery)
- Input growth test (increasing payload sizes)
- Mixed user journey test with Locust

## Prerequisites

1. Start backend API from project root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload
```

2. Install k6 (once):

```powershell
winget install k6.k6
```

3. Install Locust in your venv (once):

```powershell
.\.venv\Scripts\python.exe -m pip install -r stress-tests\requirements-stress.txt
```

## Required Environment Variables

Set these in the same terminal before running tests.

```powershell
$env:BASE_URL="http://localhost:8001"
$env:HOSTEL_TYPE="BOYS"
$env:GUARD_USERNAME="<your_guard_username>"
$env:GUARD_PASSWORD="<your_guard_password>"
```

## k6 Scenarios

Run commands from project root.

1. Ramp load:

```powershell
k6 run stress-tests\k6\load-ramp.js
```

2. Spike:

```powershell
k6 run stress-tests\k6\spike.js
```

3. Soak (customizable):

```powershell
$env:SOAK_VUS="40"
$env:SOAK_DURATION="60m"
k6 run stress-tests\k6\soak.js
```

4. Breakpoint (find failure point):

```powershell
k6 run stress-tests\k6\breakpoint.js
```

5. Input growth (payload size increase):

```powershell
$env:VUS="12"
$env:ITERATIONS="180"
$env:PAYLOAD_SIZES="32,128,256,512,1024,2048,4096"
k6 run stress-tests\k6\input-growth.js
```

## Locust Scenario

Start Locust web UI:

```powershell
.\.venv\Scripts\python.exe -m locust -f stress-tests\locustfile.py --host http://localhost:8001
```

Then open http://localhost:8089 and configure:

- Number of users: start at 20, then 50, 100, 200
- Spawn rate: 5 to 20 users/second
- Run time: 10 to 30 minutes for load tests, 60+ minutes for soak

### Locust Modes

The Locust script supports two modes via `LOCUST_TEST_MODE`.

1. Performance mode (default)

- Use this to measure normal API throughput and latency.
- Any login failure (including 429) stops that virtual user.
- This prevents unauthenticated 403 noise from polluting results.

```powershell
$env:LOCUST_TEST_MODE="performance"
.\.venv\Scripts\python.exe -m locust -f stress-tests\locustfile.py --host http://localhost:8001
```

2. Rate-limit validation mode

- Use this to validate that auth rate limiting is enforced.
- Login 429 is treated as expected and the virtual user stops immediately.
- This keeps reports focused on auth guardrail behavior.

```powershell
$env:LOCUST_TEST_MODE="rate-limit"
.\.venv\Scripts\python.exe -m locust -f stress-tests\locustfile.py --host http://localhost:8001
```

## Suggested Execution Order

1. Ramp load (`load-ramp.js`)
2. Spike (`spike.js`)
3. Soak (`soak.js`)
4. Input growth (`input-growth.js`)
5. Breakpoint (`breakpoint.js`)
6. Locust mixed flow

## Metrics To Watch

- `http_req_duration` p95 and p99
- `http_req_failed` rate
- Throughput (requests/sec)
- Backend CPU and RAM usage
- MongoDB resource usage and connection count

## Notes

- Run tests against a non-production environment.
- Keep uvicorn workers and DB settings fixed while comparing runs.
- Save command output to files for run-to-run comparison.
