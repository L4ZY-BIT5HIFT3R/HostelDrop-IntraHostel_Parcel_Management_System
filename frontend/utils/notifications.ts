import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

export async function registerForPushNotificationsAsync() {
  let token;

  // Prevent crashes and logs when running inside Expo Go
  if (Constants.appOwnership === 'expo') {
    return token;
  }

  // Dynamically import Native Modules so Expo Go never evaluates them
  const Device = await import('expo-device');
  const Notifications = await import('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return;
    }
    
    try {
      // Find project ID automatically for Expo tokens
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? 
        Constants?.easConfig?.projectId ?? 
        ""; // Fallback if none found
      
      const options = {};
      if (projectId) {
        // @ts-ignore
        options.projectId = projectId;
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync(options);
      token = tokenResponse.data;

      // Send to backend
      await api.put('/auth/student/expo-token', { expo_push_token: token });

    } catch {
      // Ignore errors silently
    }
  } else {
    // Only physical devices can register Expo push tokens
  }

  return token;
}
