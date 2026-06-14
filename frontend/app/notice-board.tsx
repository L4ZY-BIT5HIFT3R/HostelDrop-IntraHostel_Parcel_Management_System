import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts } from '../utils/theme';
import { useAuthStore } from '../store/authStore';
import FeedbackButton from '../components/FeedbackButton';

const NOTICE_POINTS = [
  'This app is for hostel parcel management only and must be used for official campus operations.',
  'Students, guards, and admins must use accurate details while signing in and handling parcel updates.',
  'Parcels should be handed over only after proper identity verification by authorized staff.',
  'Do not share account credentials, OTPs, or access with other users.',
  'Parcel timelines and status updates should be reviewed regularly to avoid missed handovers.',
  'Any misuse, fake entries, or unauthorized access attempts may result in suspension and disciplinary action.',
];

export default function NoticeBoard() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  const continuePath = useMemo(() => {
    if (!isAuthenticated || !user) return '/role-selection';
    if (user.role === 'GUARD') return '/guard-dashboard';
    if (user.role === 'STUDENT') return '/student-dashboard';
    return '/admin-panel';
  }, [isAuthenticated, user]);

  const handleContinue = () => {
    if (!isLoading && hasAcknowledged) {
      router.replace(continuePath as never);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FeedbackButton style={styles.feedbackButton} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <View style={styles.badge}>
            <Ionicons name="reader-outline" size={15} color={Colors.accent} />
            <Text style={styles.badgeText}>BULLETIN</Text>
          </View>
          <Text style={styles.title}>Important Guidelines</Text>
          <Text style={styles.subtitle}>Please read before continuing to the app.</Text>
        </View>

        <View style={styles.card}>
          {NOTICE_POINTS.map((point, index) => (
            <View key={point} style={styles.noticeRow}>
              <Text style={styles.noticeNumber}>{index + 1}.</Text>
              <Text style={styles.noticeText}>{point}</Text>
            </View>
          ))}

          <Text style={styles.finalLine}>
            By continuing, you agree to our{' '}
            <Text style={styles.linkText} onPress={() => router.push('/terms-and-conditions')}>
              Terms and Conditions
            </Text>{' '}
            and{' '}
            <Text style={styles.linkText} onPress={() => router.push('/privacy-policy')}>
              Privacy Policy
            </Text>
            .
          </Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            activeOpacity={0.8}
            onPress={() => setHasAcknowledged((prev) => !prev)}
          >
            <Ionicons
              name={hasAcknowledged ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={hasAcknowledged ? Colors.textPrimary : Colors.textMuted}
            />
            <Text style={styles.checkboxText}>I have read and understood the notice and policies.</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, (isLoading || !hasAcknowledged) && styles.disabledButton]}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={isLoading || !hasAcknowledged}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.continueText}>Continue to App</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 68,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  feedbackButton: {
    position: 'absolute',
    top: 16,
    right: 24,
    zIndex: 10,
  },
  headerBlock: {
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    marginBottom: 16,
    transform: [{ rotate: '-2deg' }],
  },
  badgeText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    padding: 20,
    marginBottom: 18,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  noticeNumber: {
    width: 26,
    fontFamily: Fonts.mono,
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '700',
    paddingTop: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  finalLine: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  linkText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  continueButton: {
    height: 54,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabledButton: {
    opacity: 0.65,
  },
});
