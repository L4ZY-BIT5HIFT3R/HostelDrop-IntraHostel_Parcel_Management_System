# Performance Test Report

## 1. Document Control
- Project: HostelDrop Intra-Hostel Parcel Management System
- Test Type: Locust Performance Mode
- Date: 2026-04-10
- Environment: Local
- Base URL: http://localhost:8001

## 2. Objective
Evaluate authenticated workflow throughput and latency under mixed guard operations.

## 3. Configuration
- LOCUST_TEST_MODE=performance
- HOSTEL_TYPE=BOYS
- GUARD_USERNAME=guard
- GUARD_PASSWORD=guard123
- Workload source: stress-tests/locustfile.py

## 4. Artifacts
- stress-tests/performance_test/Locust_2026-04-10-15h20_locustfile.py_http___localhost_8001_requests.csv
- stress-tests/performance_test/Locust_2026-04-10-15h20_locustfile.py_http___localhost_8001_failures.csv
- stress-tests/performance_test/Locust_2026-04-10-15h20_locustfile.py_http___localhost_8001_exceptions.csv
- stress-tests/performance_test/Locust_2026-04-10-15h20_locustfile.py_http___localhost_8001.html

## 5. Summary Metrics
- Total requests: 2934
- Total failures: 93
- Overall failure rate: 3.17%
- Aggregated average response time: 107.76 ms
- Aggregated p95: 130 ms

## 6. Endpoint Results
- auth_guard_login
  - Requests: 98
  - Failures: 93
  - Error: 429 Too many requests
  - Average latency: 2081.49 ms
- guard_pending
  - Requests: 1295
  - Failures: 0
  - Average latency: 71.85 ms
- guard_delivered
  - Requests: 883
  - Failures: 0
  - Average latency: 12.94 ms
- parcel_add_small
  - Requests: 437
  - Failures: 0
  - Average latency: 11.69 ms
- parcel_add_large
  - Requests: 221
  - Failures: 0
  - Average latency: 11.75 ms

## 7. Interpretation
- Business workflow endpoints remained stable with 0 failures.
- Failures were concentrated on login due to rate limiting during startup pressure.
- Throughput and latency for authenticated flows were acceptable in this run.

## 8. Charts
### Total Requests per Second
![Performance RPS](performance_test/total_requests_per_second_1775815099.573.png)

### Response Times
![Performance Response Times](performance_test/response_times_(ms)_1775815099.592.png)

### Number of Users
![Performance Users](performance_test/number_of_users_1775815099.606.png)

## 9. Conclusion
Performance-mode workload execution is stable for authenticated parcel operations. Login path requires separate rate-limit-aware interpretation.
