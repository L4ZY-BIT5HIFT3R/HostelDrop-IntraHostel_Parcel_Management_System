import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts } from '../utils/theme';
import AnimatedCard from '../components/AnimatedCard';
import FeedbackButton from '../components/FeedbackButton';
import RoleMotif from '../components/RoleMotif';

type RoleKey = 'GUARD' | 'STUDENT' | 'ADMIN';

const ROLES: {
  key: RoleKey;
  code: string;
  title: string;
  description: string;
  ink: string;
  inkBg: string;
}[] = [
  {
    key: 'GUARD',
    code: 'DESK-01',
    title: 'Guard',
    description: 'Log & hand over parcels',
    ink: Colors.accentBlue,
    inkBg: Colors.accentBlueDim,
  },
  {
    key: 'STUDENT',
    code: 'RES-02',
    title: 'Student',
    description: 'Track & collect parcels',
    ink: Colors.accent,
    inkBg: Colors.accentDim,
  },
  {
    key: 'ADMIN',
    code: 'ADM-03',
    title: 'Admin',
    description: 'Manage users & records',
    ink: Colors.accentRed,
    inkBg: Colors.accentRedDim,
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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.main}>
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
                  <View style={styles.iconTile}>
                    <RoleMotif role={role.key} ink={role.ink} />
                  </View>
                  <View style={styles.tagContent}>
                    <Text style={styles.tagTitle}>{role.title}</Text>
                    <Text style={styles.tagDesc} numberOfLines={1}>
                      {role.description}
                    </Text>
                  </View>
                  <View style={styles.enter}>
                    <Ionicons name="arrow-forward" size={18} color={role.ink} />
                  </View>
                </View>
              </TouchableOpacity>
            </AnimatedCard>
          ))}
        </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerRule} />
          <Text style={styles.footerNote}>SIGNED · SEALED · DELIVERED</Text>
          <Text style={styles.footerSub}>your hostel&apos;s parcel desk, digitized</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 26,
    paddingBottom: 16,
  },
  main: {
    flex: 1,
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
    marginBottom: 14,
  },
  footer: {
    paddingTop: 18,
    alignItems: 'center',
    gap: 3,
  },
  footerRule: {
    width: 44,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.accent,
    marginBottom: 6,
  },
  footerNote: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  footerSub: {
    fontSize: 12,
    letterSpacing: 0.3,
    color: Colors.textMuted,
  },
  stamp: {
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
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
    fontSize: 30,
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
    marginTop: 6,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
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
    marginBottom: 10,
    marginLeft: 2,
  },
  cardContainer: {
    gap: 11,
  },
  tag: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 11,
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
    marginBottom: 4,
  },
  hole: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tagContent: {
    flex: 1,
  },
  tagTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Colors.textPrimary,
    marginBottom: 1,
  },
  tagDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  enter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
