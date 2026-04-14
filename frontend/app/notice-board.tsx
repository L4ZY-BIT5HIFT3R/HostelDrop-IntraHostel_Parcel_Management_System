import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../utils/theme';
import { useAuthStore } from '../store/authStore';

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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <View style={styles.badge}>
            <Ionicons name="notifications-outline" size={18} color={Colors.textPrimary} />
            <Text style={styles.badgeText}>Notice Board</Text>
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
            <ActivityIndicator color={Colors.bg} size="small" />
          ) : (
            <>
              <Text style={styles.continueText}>Continue to App</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.bg} />
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
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  headerBlock: {
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
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
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  noticeNumber: {
    width: 24,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '700',
    paddingTop: 1,
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
    borderRadius: 14,
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueText: {
    color: Colors.bg,
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.65,
  },
});
