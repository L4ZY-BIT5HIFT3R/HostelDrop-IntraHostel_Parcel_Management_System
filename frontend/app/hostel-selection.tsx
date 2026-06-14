import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import { Colors, Fonts } from '../utils/theme';
import AnimatedCard from '../components/AnimatedCard';

const HOSTELS: {
  key: 'BOYS' | 'GIRLS';
  code: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  ink: string;
  inkBg: string;
}[] = [
  { key: 'BOYS', code: 'BLK-A', title: 'Boys Hostel', icon: 'male', ink: Colors.accentBlue, inkBg: Colors.accentBlueDim },
  { key: 'GIRLS', code: 'BLK-B', title: 'Girls Hostel', icon: 'female', ink: Colors.accent, inkBg: Colors.accentDim },
];

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
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>{'// STEP 02'}</Text>
          <Text style={styles.title}>Select Block</Text>
          <Text style={styles.description}>Which hostel are you with?</Text>
        </View>

        <View style={styles.cardContainer}>
          {HOSTELS.map((hostel, index) => (
            <AnimatedCard key={hostel.key} index={index}>
              <TouchableOpacity
                style={styles.tag}
                onPress={() => handleHostelSelect(hostel.key)}
                activeOpacity={0.85}
              >
                <View style={styles.tagTop}>
                  <View style={styles.hole} />
                  <Text style={styles.tagCode}>{hostel.code}</Text>
                </View>
                <View style={styles.tagBody}>
                  <View style={[styles.iconTile, { backgroundColor: hostel.inkBg, borderColor: hostel.ink }]}>
                    <Ionicons name={hostel.icon} size={28} color={hostel.ink} />
                  </View>
                  <Text style={styles.cardTitle}>{hostel.title}</Text>
                  <Ionicons name="arrow-forward" size={20} color={hostel.ink} />
                </View>
              </TouchableOpacity>
            </AnimatedCard>
          ))}
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
    padding: 28,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  header: {
    marginBottom: 44,
  },
  eyebrow: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  cardContainer: {
    gap: 16,
  },
  tag: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    shadowColor: '#3B3122',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  tagTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  hole: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tagCode: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    letterSpacing: 1,
    color: Colors.textMuted,
  },
  tagBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  cardTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
});
