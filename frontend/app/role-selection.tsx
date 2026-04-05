import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, GlassCard } from '../utils/theme';
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
              <View style={[styles.iconContainer, { backgroundColor: Colors.accentBlueDim }]}>
                <Ionicons name="shield-checkmark" size={32} color={Colors.accentBlue} />
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
              <View style={[styles.iconContainer, { backgroundColor: Colors.accentGreenDim }]}>
                <Ionicons name="person" size={32} color={Colors.accentGreen} />
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
              <View style={[styles.iconContainer, { backgroundColor: Colors.accentRedDim }]}>
                <Ionicons name="settings" size={32} color={Colors.accentRed} />
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
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
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
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    ...GlassCard,
    padding: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
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
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
