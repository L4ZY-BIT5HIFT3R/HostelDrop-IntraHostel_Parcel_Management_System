import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
          <Text style={styles.subtitle}>Hostel Parcel Management</Text>
        </View>

        <View style={styles.cardContainer}>
          <Text style={styles.label}>Select Your Role</Text>
          
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleRoleSelect('GUARD')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="shield-checkmark" size={32} color="#2563EB" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Guard</Text>
              <Text style={styles.cardDescription}>Manage parcels and deliveries</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => handleRoleSelect('STUDENT')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="person" size={32} color="#16A34A" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Student</Text>
              <Text style={styles.cardDescription}>View your parcels</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={handleAdminSelect}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="settings" size={32} color="#DC2626" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Admin</Text>
              <Text style={styles.cardDescription}>Manage users and parcels</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    color: '#6B7280',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  cardContainer: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
});
