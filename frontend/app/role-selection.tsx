import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts } from '../utils/theme';
import AnimatedCard from '../components/AnimatedCard';
import FeedbackButton from '../components/FeedbackButton';

type RoleKey = 'GUARD' | 'STUDENT' | 'ADMIN';

const ROLES: {
  key: RoleKey;
  code: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  ink: string;
  inkBg: string;
}[] = [
  {
    key: 'GUARD',
    code: 'DESK-01',
    title: 'Guard',
    description: 'Log, assign & hand over parcels',
    icon: 'shield-checkmark',
    ink: Colors.accentTeal,
    inkBg: Colors.accentTealDim,
  },
  {
    key: 'STUDENT',
    code: 'RES-02',
    title: 'Student',
    description: 'Track & collect your parcels',
    icon: 'cube',
    ink: Colors.accent,
    inkBg: Colors.accentDim,
  },
  {
    key: 'ADMIN',
    code: 'ADM-03',
    title: 'Admin',
    description: 'Manage users, rooms & records',
    icon: 'briefcase',
    ink: Colors.accentBlue,
    inkBg: Colors.accentBlueDim,
  },
];

export default function RoleSelection() {
  const router = useRouter();

  const handleSelect = async (role: RoleKey) => {
    if (role === 'ADMIN') {
      router.push('/admin-login');
      return;
    }
    await AsyncStorage.setItem('selected_role', role);
    router.push('/hostel-selection');
  };

  return (
    <SafeAreaView style={styles.container}>
      <FeedbackButton style={styles.feedbackButton} />
      <View style={styles.content}>
        {/* Rubber-stamp masthead */}
        <View style={styles.header}>
          <View style={styles.stamp}>
            <Text style={styles.stampText}>RECEIVING DESK</Text>
          </View>
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmark}>HostelDrop</Text>
            <View style={styles.wordmarkDot} />
          </View>
          <Text style={styles.tagline}>INTRA-HOSTEL PARCEL HANDLING</Text>
          <View style={styles.ruleRow}>
            <View style={styles.rule} />
            <Ionicons name="cube-outline" size={13} color={Colors.textMuted} />
            <View style={styles.rule} />
          </View>
        </View>

        <Text style={styles.sectionLabel}>{'// SIGN IN AS'}</Text>

        <View style={styles.cardContainer}>
          {ROLES.map((role, index) => (
            <AnimatedCard key={role.key} index={index}>
              <TouchableOpacity
                style={styles.tag}
                onPress={() => handleSelect(role.key)}
                activeOpacity={0.85}
              >
                {/* punch-hole + index */}
                <View style={styles.tagTop}>
                  <View style={styles.hole} />
                  <Text style={styles.tagCode}>{role.code}</Text>
                </View>

                <View style={styles.tagBody}>
                  <View style={[styles.iconTile, { backgroundColor: role.inkBg, borderColor: role.ink }]}>
                    <Ionicons name={role.icon} size={24} color={role.ink} />
                  </View>
                  <View style={styles.tagContent}>
                    <Text style={styles.tagTitle}>{role.title}</Text>
                    <Text style={styles.tagDesc}>{role.description}</Text>
                  </View>
                </View>

                {/* perforation */}
                <View style={styles.perforation} />

                <View style={styles.tagFooter}>
                  <Text style={[styles.tagAction, { color: role.ink }]}>ENTER</Text>
                  <Ionicons name="arrow-forward" size={16} color={role.ink} />
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
    paddingHorizontal: 26,
    justifyContent: 'center',
  },
  feedbackButton: {
    position: 'absolute',
    top: 16,
    right: 24,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  stamp: {
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 16,
    transform: [{ rotate: '-3deg' }],
    opacity: 0.9,
  },
  stampText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.accent,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  wordmark: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    color: Colors.textPrimary,
  },
  wordmarkDot: {
    width: 9,
    height: 9,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    marginLeft: 4,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    width: '60%',
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  sectionLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginBottom: 14,
    marginLeft: 2,
  },
  cardContainer: {
    gap: 14,
  },
  tag: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
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
    marginBottom: 8,
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
    width: 50,
    height: 50,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  tagContent: {
    flex: 1,
  },
  tagTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  tagDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  perforation: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.surfaceBorder,
    marginVertical: 12,
  },
  tagFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 7,
  },
  tagAction: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
