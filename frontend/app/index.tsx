import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../utils/theme';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        if (user.role === 'GUARD') {
          router.replace('/guard-dashboard');
        } else if (user.role === 'STUDENT') {
          router.replace('/student-dashboard');
        } else if (user.role === 'ADMIN') {
          router.replace('/admin-panel');
        }
      } else {
        router.replace('/role-selection');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.accent} />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
