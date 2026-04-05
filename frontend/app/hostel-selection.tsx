import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { Colors, GlassCard } from '../utils/theme';
import AnimatedCard from '../components/AnimatedCard';

export default function HostelSelection() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string>('');

  useEffect(() => {
    loadRole();
  }, []);

  const loadRole = async () => {
    const role = await AsyncStorage.getItem('selected_role');
    setSelectedRole(role || '');
  };

  const handleHostelSelect = async (hostelType: 'BOYS' | 'GIRLS') => {
    await AsyncStorage.setItem('selected_hostel', hostelType);
    if (selectedRole === 'GUARD') {
      router.push('/guard-login');
    } else {
      router.push('/student-login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Select Hostel Type</Text>
          <Text style={styles.description}>Choose your hostel to continue</Text>
        </View>

        <View style={styles.cardContainer}>
          <AnimatedCard index={0}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleHostelSelect('BOYS')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: Colors.accentBlueDim }]}>
                <Ionicons name="male" size={40} color={Colors.accentBlue} />
              </View>
              <Text style={styles.cardTitle}>Boys Hostel</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} style={styles.chevron} />
            </TouchableOpacity>
          </AnimatedCard>

          <AnimatedCard index={1}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleHostelSelect('GIRLS')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(219,39,119,0.15)' }]}>
                <Ionicons name="female" size={40} color="#F472B6" />
              </View>
              <Text style={styles.cardTitle}>Girls Hostel</Text>
              <Ionicons name="chevron-forward" size={24} color={Colors.textMuted} style={styles.chevron} />
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  cardContainer: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    ...GlassCard,
    padding: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chevron: {
    marginLeft: 8,
  },
});
