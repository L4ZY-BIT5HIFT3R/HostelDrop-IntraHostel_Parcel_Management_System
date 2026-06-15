import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Fonts, Radii, Shadows } from '../utils/theme';
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <FeedbackButton style={styles.feedbackButton} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Masthead */}
        <View style={styles.masthead}>
          <View style={styles.stamp}>
            <Ionicons name="reader-outline" size={14} color={Colors.accent} />
            <Text style={styles.stampText}>BULLETIN</Text>
          </View>
          <Text style={styles.title}>Important Guidelines</Text>
          <Text style={styles.subtitle}>Please read before continuing to the app.</Text>
          <View style={styles.rule} />
        </View>

        {/* Notice sheet */}
        <View style={styles.sheet}>
          {NOTICE_POINTS.map((point, index) => (
            <View
              key={point}
              style={[styles.noticeRow, index === NOTICE_POINTS.length - 1 && styles.noticeRowLast]}
            >
              <View style={styles.numChip}>
                <Text style={styles.numText}>{String(index + 1).padStart(2, '0')}</Text>
              </View>
              <Text style={styles.noticeText}>{point}</Text>
            </View>
          ))}
        </View>

        {/* Agreement */}
        <View style={styles.agreementCard}>
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
              size={24}
              color={hasAcknowledged ? Colors.accent : Colors.textMuted}
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 56,
    paddingBottom: 28,
  },
  feedbackButton: {
    position: 'absolute',
    top: 16,
    right: 22,
    zIndex: 10,
  },
  masthead: {
    marginBottom: 18,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    marginBottom: 14,
    transform: [{ rotate: '-2deg' }],
  },
  stampText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  rule: {
    height: 2,
    width: 40,
    borderRadius: 1,
    backgroundColor: Colors.accent,
    marginTop: 12,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radii.lg,
    padding: 16,
    marginBottom: 14,
    ...Shadows.subtle,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginBottom: 14,
  },
  noticeRowLast: {
    marginBottom: 0,
  },
  numChip: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 5,
    borderRadius: Radii.sm,
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(210, 63, 28, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  numText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '800',
    color: Colors.accent,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  agreementCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    borderRadius: Radii.lg,
    padding: 16,
    marginBottom: 16,
    ...Shadows.subtle,
  },
  finalLine: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  linkText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  continueButton: {
    height: 54,
    borderRadius: Radii.lg,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.button,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
