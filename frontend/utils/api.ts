import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { clearAuthSession, getAuthToken } from './sessionStorage';

const normalizeToken = (token?: string | null) => {
  if (!token) return '';
  return token.replace(/^Bearer\s+/i, '').trim();
};

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (envUrl && envUrl.toLowerCase() !== 'auto') {
    return envUrl;
  }

  const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8001`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8001';
  }

  return 'http://localhost:8001';
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = normalizeToken(await getAuthToken());
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const detail = error.response?.data?.detail as string | undefined;

      // Only logout on real auth failures, not business 401s like invalid OTP
      const isAuthFailure = typeof detail === 'string' && (
        detail.toLowerCase().includes('token has expired') ||
        detail.toLowerCase().includes('invalid token') ||
        detail.toLowerCase() === 'not authenticated'
      );

      if (isAuthFailure) {
        await clearAuthSession();
      }
    }
    return Promise.reject(error);
  }
);

export interface StudentMatch {
  roll_number?: string | null;
  name?: string | null;
  room_number?: string | null;
  score?: number;
  room_matches?: boolean | null;
}

export interface MatchStudentResponse {
  parsed: { name: string | null; room_number: string | null; roll_number: string | null };
  exact_match: StudentMatch | null;
  candidates: StudentMatch[];
}

export interface BulkParcelItem {
  room_number: string;
  roll_number?: string | null;
  student_name?: string | null;
  description?: string | null;
}

// Auto-match: parse a "Name | Room | Roll" label and resolve it to a student.
export const matchStudent = async (q: string) => {
  const response = await api.get('/parcel/match-student', { params: { q } });
  return response.data as MatchStudentResponse;
};

// Bulk intake: log a batch of parcels in one request.
export const bulkAddParcels = async (hostelType: string, items: BulkParcelItem[]) => {
  const response = await api.post('/parcel/bulk-add', {
    hostel_type: hostelType,
    items,
  });
  return response.data as {
    message: string;
    added: number;
    total: number;
    results: { index: number; ok: boolean; error?: string }[];
  };
};

export const generateQrCode = async (parcelId: string) => {
  const response = await api.post('/parcel/generate-qr', { parcel_id: parcelId });
  return response.data;
};

export const generateDelegationCode = async (parcelId: string) => {
  const response = await api.post('/parcel/delegate', { parcel_id: parcelId });
  return response.data;
};

export const verifyQrCode = async (parcelId: string, token: string, delegationCode?: string) => {
  const payload: any = { parcel_id: parcelId, token };
  if (delegationCode) {
    payload.delegation_code = delegationCode;
  }
  const response = await api.post('/parcel/verify-qr', payload);
  return response.data;
};

export default api;
