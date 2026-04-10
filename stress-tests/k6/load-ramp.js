import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_URL, authHeaders, guardLogin } from './common.js';

export const options = {
  scenarios: {
    ramp_load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.03'],
    http_req_duration: ['p(95)<1200', 'p(99)<2500'],
  },
};

export function setup() {
  return { token: guardLogin() };
}

export default function (data) {
  const headers = authHeaders(data.token);
  const pendingRes = http.get(`${API_URL}/parcel/guard/pending`, {
    headers,
    tags: { endpoint: 'guard_pending' },
  });

  check(pendingRes, {
    'pending status ok': (r) => r.status === 200,
  });

  const deliveredRes = http.get(`${API_URL}/parcel/guard/delivered`, {
    headers,
    tags: { endpoint: 'guard_delivered' },
  });

  check(deliveredRes, {
    'delivered status ok': (r) => r.status === 200,
  });

  sleep(1);
}
