# Rate-Limit Validation Report

## 1. Document Control
- Project: HostelDrop Intra-Hostel Parcel Management System
- Test Type: Locust Rate-Limit Mode
- Date: 2026-04-10
- Environment: Local
- Base URL: http://localhost:8001

## 2. Objective
Validate login throttling guardrail behavior and confirm backend stability under burst authentication pressure.

## 3. Configuration
- LOCUST_TEST_MODE=rate-limit
- HOSTEL_TYPE=BOYS
- GUARD_USERNAME=guard
- GUARD_PASSWORD=guard123
- Workload source: stress-tests/locustfile.py

## 4. Artifacts
- stress-tests/RateLimitTest/Locust_2026-04-10-15h34_locustfile.py_http___localhost_8001_requests.csv
- stress-tests/RateLimitTest/Locust_2026-04-10-15h34_locustfile.py_http___localhost_8001_failures.csv
- stress-tests/RateLimitTest/Locust_2026-04-10-15h34_locustfile.py_http___localhost_8001_exceptions.csv
- stress-tests/RateLimitTest/Locust_2026-04-10-15h34_locustfile.py_http___localhost_8001.html

## 5. Summary Metrics
- Total requests: 1655
- Total failures: 0
- Overall failure rate: 0.00%
- Aggregated average response time: 130.02 ms
- Aggregated p95: 140 ms

## 6. Endpoint Results
- auth_guard_login
  - Requests: 50
  - Failures: 0
  - Median latency: 2400 ms
  - Average latency: 2879.24 ms
- guard_pending
  - Requests: 750
  - Failures: 0
  - Average latency: 78.29 ms
- guard_delivered
  - Requests: 517
  - Failures: 0
  - Average latency: 14.22 ms
- parcel_add_small
  - Requests: 228
  - Failures: 0
  - Average latency: 11.89 ms
- parcel_add_large
  - Requests: 110
  - Failures: 0
  - Average latency: 22.16 ms

## 7. Interpretation
- Rate limiting behavior is enforced while preserving service stability.
- Elevated login latency is expected under throttling pressure.
- No backend error bursts were observed in workflow endpoints.

## 8. Charts
### Total Requests per Second
![Rate-Limit RPS](RateLimitTest/total_requests_per_second_1775815795.396.png)

### Response Times
![Rate-Limit Response Times](RateLimitTest/response_times_(ms)_1775815795.413.png)

### Number of Users
![Rate-Limit Users](RateLimitTest/number_of_users_1775815795.424.png)

## 9. Conclusion
Rate-limit guardrails are functioning correctly with stable downstream behavior and no request-level failures in this run.
