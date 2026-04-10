import http from 'k6/http';
import { check, fail } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8001';
export const API_URL = `${BASE_URL}/api`;

const DEFAULT_HOSTEL = __ENV.HOSTEL_TYPE || 'BOYS';

function requiredEnv(name) {
  const value = __ENV[name];
  if (!value) {
    fail(`Missing required env var: ${name}`);
  }
  return value;
}

export function guardLogin() {
  const username = requiredEnv('GUARD_USERNAME');
  const password = requiredEnv('GUARD_PASSWORD');

  const payload = JSON.stringify({
    username,
    password,
    hostel_type: DEFAULT_HOSTEL,
  });

  const res = http.post(`${API_URL}/auth/guard/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'auth_guard_login' },
  });

  check(res, {
    'guard login status is 200': (r) => r.status === 200,
    'guard login has token': (r) => {
      try {
        return Boolean(r.json('access_token'));
      } catch (e) {
        return false;
      }
    },
  });

  if (res.status !== 200) {
    fail(`Guard login failed: status=${res.status} body=${res.body}`);
  }

  return res.json('access_token');
}

export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function randomAlphaNum(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

export function randomRoom() {
  return `A-${Math.floor(Math.random() * 800 + 1)}`;
}

export function randomRoll() {
  return `2023CS${Math.floor(Math.random() * 999 + 1).toString().padStart(3, '0')}`;
}

export function hostelType() {
  return DEFAULT_HOSTEL;
}
