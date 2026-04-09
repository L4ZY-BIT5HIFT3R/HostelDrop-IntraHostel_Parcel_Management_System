import { create } from 'zustand';
import { clearAuthSession, getAuthToken, getUserData, setAuthSession } from '../utils/sessionStorage';

interface User {
  _id: string;
  name: string;
  role: 'GUARD' | 'STUDENT' | 'ADMIN';
  hostel_type: 'BOYS' | 'GIRLS';
  username?: string;
  roll_number?: string;
  email?: string;
  room_number?: string;
  contact_number?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const normalizeToken = (token?: string | null) => {
  if (!token) return '';
  return token.replace(/^Bearer\s+/i, '').trim();
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  
  setUser: (user) => set({ user }),
  
  setToken: (token) => set({ token }),
  
  login: async (user, token) => {
    const normalizedToken = normalizeToken(token);
    await setAuthSession(normalizedToken, user);
    set({ user, token: normalizedToken, isAuthenticated: true });
  },
  
  logout: async () => {
    await clearAuthSession();
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  checkAuth: async () => {
    try {
      const token = await getAuthToken();
      const userData = await getUserData();
      
      if (token && userData) {
        const user = JSON.parse(userData);
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      set({ isLoading: false });
    }
  },
}));
