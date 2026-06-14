import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { StatusBar as RNStatusBar, StyleSheet, Text } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/authStore';

// Apply Archivo to every <Text> while mapping fontWeight to the matching face.
// Text that sets its own fontFamily (e.g. the Space Mono tracking codes) is
// left untouched. This is the reliable way to set a global font in RN, since
// defaultProps only fills style-less elements.
const TextAny = Text as unknown as {
  render?: (...args: unknown[]) => React.ReactElement<{ style?: unknown }>;
  __archivoPatched?: boolean;
};
function archivoFamily(weight: unknown): string {
  switch (String(weight ?? '400')) {
    case '800':
    case '900':
      return 'Archivo_800ExtraBold';
    case '700':
    case 'bold':
      return 'Archivo_700Bold';
    case '600':
      return 'Archivo_600SemiBold';
    case '500':
      return 'Archivo_500Medium';
    default:
      return 'Archivo_400Regular';
  }
}
if (TextAny.render && !TextAny.__archivoPatched) {
  const origRender = TextAny.render;
  TextAny.render = function patchedRender(...args: unknown[]) {
    const el = origRender.apply(this, args);
    const flat = (StyleSheet.flatten(el.props.style) || {}) as { fontFamily?: string; fontWeight?: unknown };
    if (flat.fontFamily) return el;
    return React.cloneElement(el, {
      style: [el.props.style, { fontFamily: archivoFamily(flat.fontWeight) }],
    });
  };
  TextAny.__archivoPatched = true;
}

export default function RootLayout() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
  });

  useEffect(() => {
    RNStatusBar.setHidden(true, 'fade');
    checkAuth();
  }, [checkAuth]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" hidden />
      <Stack screenOptions={{
        headerShown: false,
        animation: 'fade' as const,
        contentStyle: { backgroundColor: '#ECE5D6' },
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
    </SafeAreaProvider>
  );
}
