import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_URL, authHeaders, guardLogin } from './common.js';

export const options = {
  scenarios: {
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '30s', target: 200 },
        { duration: '1m', target: 200 },
        { duration: '30s', target: 20 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export function setup() {
  return { token: guardLogin() };
}

export default function (data) {
  const headers = authHeaders(data.token);
  const res = http.get(`${API_URL}/parcel/guard/pending`, {
    headers,
    tags: { endpoint: 'guard_pending_spike' },
  });

  check(res, {
    'spike request status ok': (r) => r.status === 200,
  });

  sleep(0.3);
}
