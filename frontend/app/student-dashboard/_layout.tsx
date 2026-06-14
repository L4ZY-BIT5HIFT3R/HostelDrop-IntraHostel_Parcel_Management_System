import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registerForPushNotificationsAsync } from '../../utils/notifications';
import { Colors } from '../../utils/theme';

export default function StudentDashboardLayout() {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: Colors.tabBarBorder,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 10,
        },
        headerStyle: {
          backgroundColor: Colors.bg,
          borderBottomWidth: 1,
          borderBottomColor: Colors.surfaceBorder,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'All Parcel',
            headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-parcels"
        options={{
          title: 'My Parcels',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
