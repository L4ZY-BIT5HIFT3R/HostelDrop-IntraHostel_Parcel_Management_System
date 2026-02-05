import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

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
    
    // Navigate based on role
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
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Select Hostel Type</Text>
          <Text style={styles.description}>Choose your hostel to continue</Text>
        </View>

        <View style={styles.cardContainer}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleHostelSelect('BOYS')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="male" size={40} color="#2563EB" />
            </View>
            <Text style={styles.cardTitle}>Boys Hostel</Text>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => handleHostelSelect('GIRLS')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="female" size={40} color="#DB2777" />
            </View>
            <Text style={styles.cardTitle}>Girls Hostel</Text>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" style={styles.chevron} />
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
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
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
  },
  cardContainer: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  chevron: {
    marginLeft: 8,
  },
});
