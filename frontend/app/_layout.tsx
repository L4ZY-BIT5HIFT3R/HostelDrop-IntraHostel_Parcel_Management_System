import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Text, TextInput } from 'react-native';
import { useAuthStore } from '../store/authStore';

const APP_FONT_FAMILY = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif',
  default: 'System',
});

let hasAppliedGlobalFontDefaults = false;

export default function RootLayout() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    if (APP_FONT_FAMILY && !hasAppliedGlobalFontDefaults) {
      Text.defaultProps = Text.defaultProps || {};
      Text.defaultProps.style = [Text.defaultProps.style, { fontFamily: APP_FONT_FAMILY }];

      TextInput.defaultProps = TextInput.defaultProps || {};
      TextInput.defaultProps.style = [TextInput.defaultProps.style, { fontFamily: APP_FONT_FAMILY }];

      hasAppliedGlobalFontDefaults = true;
    }

    checkAuth();
  }, [checkAuth]);

  return (
    <Stack screenOptions={{ 
      headerShown: false, 
      animation: 'fade' as const 
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="notice-board" />
      <Stack.Screen name="terms-and-conditions" />
      <Stack.Screen name="privacy-policy" />
      <Stack.Screen name="role-selection" />
      <Stack.Screen name="hostel-selection" />
      <Stack.Screen name="guard-login" />
      <Stack.Screen name="student-login" />
      <Stack.Screen name="admin-login" />
      <Stack.Screen name="guard-dashboard" />
      <Stack.Screen name="student-dashboard" />
      <Stack.Screen name="admin-panel" />
    </Stack>
  );
}
