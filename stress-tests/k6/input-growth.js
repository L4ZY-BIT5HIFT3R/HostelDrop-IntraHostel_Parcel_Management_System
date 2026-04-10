import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  API_URL,
  authHeaders,
  guardLogin,
  hostelType,
  randomAlphaNum,
  randomRoom,
  randomRoll,
} from './common.js';

const payloadSizes = (String(__ENV.PAYLOAD_SIZES || '32,128,256,512,1024,2048')
  .split(',')
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isFinite(v) && v > 0));

export const options = {
  scenarios: {
    input_growth: {
      executor: 'shared-iterations',
      vus: Number(__ENV.VUS || 10),
      iterations: Number(__ENV.ITERATIONS || 120),
      maxDuration: '20m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.08'],
    http_req_duration: ['p(95)<2500'],
  },
};

export function setup() {
  return { token: guardLogin() };
}

function payloadForSize(size) {
  return {
    hostel_type: hostelType(),
    room_number: randomRoom(),
    roll_number: randomRoll(),
    student_name: `Stress User ${size}`,
    description: randomAlphaNum(size),
  };
}

export default function (data) {
  const headers = authHeaders(data.token);
  const idx = Math.floor(Math.random() * payloadSizes.length);
  const size = payloadSizes[idx];
  const body = JSON.stringify(payloadForSize(size));

  const res = http.post(`${API_URL}/parcel/add`, body, {
    headers,
    responseCallback: http.expectedStatuses(200, 201, 400, 413, 422),
    tags: { endpoint: 'parcel_add_input_growth', payload_size: String(size) },
  });

  check(res, {
    'input growth accepted or rejected cleanly': (r) => [200, 201, 400, 413, 422].includes(r.status),
  });

  sleep(0.5);
}
