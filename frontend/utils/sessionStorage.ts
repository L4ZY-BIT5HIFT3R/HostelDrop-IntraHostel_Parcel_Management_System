import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

let secureStorePromise: Promise<SecureStoreModule | null> | null = null;

async function getSecureStore(): Promise<SecureStoreModule | null> {
  if (Platform.OS === 'web') return null;
  if (!secureStorePromise) {
    secureStorePromise = import('expo-secure-store')
      .then((mod) => mod as unknown as SecureStoreModule)
      .catch(() => null);
  }
  return secureStorePromise;
}

async function getItem(key: string): Promise<string | null> {
  const secureStore = await getSecureStore();
  if (secureStore) {
    try {
      return await secureStore.getItemAsync(key);
    } catch {
      // Fall back to AsyncStorage if SecureStore fails.
    }
  }
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  const secureStore = await getSecureStore();
  if (secureStore) {
    try {
      await secureStore.setItemAsync(key, value);
      return;
    } catch {
      // Fall back to AsyncStorage if SecureStore fails.
    }
  }
  await AsyncStorage.setItem(key, value);
}

async function removeItem(key: string): Promise<void> {
  const secureStore = await getSecureStore();
  if (secureStore) {
    try {
      await secureStore.deleteItemAsync(key);
      return;
    } catch {
      // Fall back to AsyncStorage if SecureStore fails.
    }
  }
  await AsyncStorage.removeItem(key);
}

export async function getAuthToken(): Promise<string | null> {
  return getItem(AUTH_TOKEN_KEY);
}

export async function setAuthSession(token: string, user: object): Promise<void> {
  await setItem(AUTH_TOKEN_KEY, token);
  await setItem(USER_DATA_KEY, JSON.stringify(user));
}

export async function getUserData(): Promise<string | null> {
  return getItem(USER_DATA_KEY);
}

export async function clearAuthSession(): Promise<void> {
  await removeItem(AUTH_TOKEN_KEY);
  await removeItem(USER_DATA_KEY);
}
