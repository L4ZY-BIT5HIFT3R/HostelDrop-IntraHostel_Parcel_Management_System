import http from 'k6/http';
import { check, sleep } from 'k6';
import { API_URL, authHeaders, guardLogin } from './common.js';

export const options = {
  scenarios: {
    soak_test: {
      executor: 'constant-vus',
      vus: Number(__ENV.SOAK_VUS || 30),
      duration: __ENV.SOAK_DURATION || '45m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1200'],
  },
};

export function setup() {
  return { token: guardLogin() };
}

export default function (data) {
  const headers = authHeaders(data.token);
  const pendingRes = http.get(`${API_URL}/parcel/guard/pending`, {
    headers,
    tags: { endpoint: 'guard_pending_soak' },
  });

  check(pendingRes, {
    'soak pending status ok': (r) => r.status === 200,
  });

  sleep(1);
}
