import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
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
      const path = error.config?.url as string | undefined;

      // Only logout on real auth failures, not business 401s like invalid OTP
      const isAuthFailure = typeof detail === 'string' && (
        detail.toLowerCase().includes('token has expired') ||
        detail.toLowerCase().includes('invalid token') ||
        detail.toLowerCase() === 'not authenticated'
      );

      if (isAuthFailure) {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_data');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
