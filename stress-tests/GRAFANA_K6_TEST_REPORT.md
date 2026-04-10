# Grafana k6 Stress Testing Report

## 1. Document Control
- Project: HostelDrop Intra-Hostel Parcel Management System
- Test Type: Grafana k6 Scenario Suite
- Date: 2026-04-10
- Environment: Local (Windows, PowerShell, k6 v1.7.1)
- Base URL: http://localhost:8001

## 2. Objective
Assess backend reliability and performance across multiple load patterns:
- Ramp load
- Spike load
- Soak duration
- Breakpoint/capacity edge
- Input payload growth

## 3. Test Scripts
- stress-tests/k6/load-ramp.js
- stress-tests/k6/spike.js
- stress-tests/k6/soak.js
- stress-tests/k6/breakpoint.js
- stress-tests/k6/input-growth.js

## 4. Environment Inputs
- BASE_URL=http://localhost:8001
- HOSTEL_TYPE=BOYS
- GUARD_USERNAME=guard
- GUARD_PASSWORD=guard123

## 5. Scenario Results

### 5.1 Ramp Load Test
- Max VUs: 100
- Duration: 6 minutes
- p95: 103.88 ms
- p99: 149.43 ms
- Error rate: 0.00%
- HTTP requests: 31,573
- Result: PASS

### 5.2 Spike Test
- Max VUs: 200
- Duration: 3.5 minutes
- p95: 793.61 ms
- Average latency: 406.17 ms
- Error rate: 0.00%
- HTTP requests: 27,905
- Result: PASS

### 5.3 Soak Test
- Constant VUs: 40
- Duration: 60 minutes
- p95: 17.64 ms
- Average latency: 10.31 ms
- Error rate: 0.00%
- HTTP requests: 142,476
- Result: PASS

### 5.4 Breakpoint Test
- Max VUs: 300
- Duration: 7 minutes
- p95: 1.00 s
- Average latency: 296.88 ms
- Error rate: 0.00%
- HTTP requests: 99,147
- Result: PASS

### 5.5 Input Growth Test
- VUs: 12
- Iterations: 180
- Payload sizes: 32,128,256,512,1024,2048,4096
- Final run p95: 28.79 ms
- Final run average latency: 11.90 ms
- Error rate: 0.00%
- HTTP requests: 181
- Result: PASS

## 6. Interpretation
- The backend remained resilient across all k6 load profiles.
- No sustained error-rate instability was observed.
- Input-size handling remained performant after expected-status classification was corrected in the test logic.

## 7. Conclusion
All executed Grafana k6 scenarios passed with acceptable latency and zero final error-rate breaches under the configured thresholds.

## 8. Reference
- Source summary: stress-tests/STRESS_TEST_REPORT.md
