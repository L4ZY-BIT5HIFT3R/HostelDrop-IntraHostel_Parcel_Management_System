import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_URL, authHeaders, guardLogin } from './common.js';

export const options = {
  scenarios: {
    breakpoint_test: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 150 },
        { duration: '1m', target: 200 },
        { duration: '1m', target: 300 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.2'],
    http_req_duration: ['p(95)<5000'],
  },
};

export function setup() {
  return { token: guardLogin() };
}

export default function (data) {
  const headers = authHeaders(data.token);
  const res = http.get(`${API_URL}/parcel/guard/pending`, {
    headers,
    tags: { endpoint: 'guard_pending_breakpoint' },
  });

  check(res, {
    'breakpoint request completed': (r) => r.status >= 200 && r.status < 500,
  });

  sleep(0.2);
}
