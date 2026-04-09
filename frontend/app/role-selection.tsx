import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../utils/theme';
import AnimatedCard from '../components/AnimatedCard';

export default function RoleSelection() {
  const router = useRouter();

  const handleRoleSelect = async (role: 'GUARD' | 'STUDENT') => {
    await AsyncStorage.setItem('selected_role', role);
    router.push('/hostel-selection');
  };

  const handleAdminSelect = () => {
    router.push('/admin-login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to</Text>
          <Text style={styles.subtitle}>Hostel Parcel{'\n'}Management</Text>
        </View>

        <View style={styles.cardContainer}>
          <Text style={styles.label}>Select Your Role</Text>
          
          <AnimatedCard index={0}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleRoleSelect('GUARD')}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="shield-checkmark" size={36} color={Colors.textPrimary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Guard</Text>
                <Text style={styles.cardDescription}>Manage parcels and deliveries</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </AnimatedCard>

          <AnimatedCard index={1}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleRoleSelect('STUDENT')}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="person" size={36} color={Colors.textPrimary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Student</Text>
                <Text style={styles.cardDescription}>View your parcels</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </AnimatedCard>

          <AnimatedCard index={2}>
            <TouchableOpacity
              style={styles.card}
              onPress={handleAdminSelect}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="settings" size={36} color={Colors.textPrimary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Admin</Text>
                <Text style={styles.cardDescription}>Manage users and parcels</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </AnimatedCard>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 56,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  cardContainer: {
    gap: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 16,
    padding: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
