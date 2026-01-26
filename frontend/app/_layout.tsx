import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="role-selection" />
      <Stack.Screen name="hostel-selection" />
      <Stack.Screen name="guard-login" />
      <Stack.Screen name="student-login" />
      <Stack.Screen name="guard-dashboard" />
      <Stack.Screen name="student-dashboard" />
      <Stack.Screen name="admin-panel" />
    </Stack>
  );
}
