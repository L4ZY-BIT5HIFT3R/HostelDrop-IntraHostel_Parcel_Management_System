import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

const PRIVACY_SECTIONS = [
  {
    title: '1. Data We Collect',
    body: 'We may collect user profile details (name, role, hostel details, roll number), authentication data, and parcel event logs including timestamps and status changes.',
  },
  {
    title: '2. Why Data Is Collected',
    body: 'Data is used for secure authentication, role-based access, parcel tracking, audit records, and operational reporting for hostel management.',
  },
  {
    title: '3. Access and Sharing',
    body: 'Data access is restricted by role. Information is shared only with authorized institutional personnel or service providers required for system operations.',
  },
  {
    title: '4. Data Retention',
    body: 'Operational and audit records are retained according to institutional policy and legal requirements, then securely archived or removed.',
  },
  {
    title: '5. Security Measures',
    body: 'The system uses access controls and secure handling practices to protect user accounts and parcel records from unauthorized use.',
  },
  {
    title: '6. Your Responsibilities',
    body: 'Users should protect their credentials, avoid unauthorized sharing, and report suspicious account activity immediately.',
  },
  {
    title: '7. Policy Changes',
    body: 'This privacy policy may be updated when required by institutional, operational, or legal changes. Updated versions apply upon publication.',
  },
  {
    title: '8. Contact for Privacy Queries',
    body: 'For corrections, access concerns, or data-related requests, contact your hostel administration office or system administrator.',
  },
];

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Text style={styles.introText}>
            This section explains what information is used in the app and how it is handled.
          </Text>
        </View>

        {PRIVACY_SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <Text style={styles.footerText}>Last updated: April 14, 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  introCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    padding: 16,
    marginBottom: 14,
  },
  introText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  footerText: {
    marginTop: 6,
    marginBottom: 10,
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 12,
  },
});
