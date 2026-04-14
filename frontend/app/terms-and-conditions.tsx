import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

const TERMS_SECTIONS = [
  {
    title: '1. Purpose of the App',
    body: 'This application is intended for hostel parcel intake, tracking, and handover records managed by authorized hostel staff and registered students.',
  },
  {
    title: '2. User Accounts and Roles',
    body: 'Access is role-based (Student, Guard, Admin). Users must use their own assigned credentials and are responsible for actions performed through their accounts.',
  },
  {
    title: '3. Acceptable Use',
    body: 'Users must not create fake parcel records, manipulate delivery logs, or access data outside their permitted role. Any misuse can lead to immediate access suspension.',
  },
  {
    title: '4. Parcel Handover Rules',
    body: 'Handover should occur only after identity verification. App records are part of the hostel audit trail and should be kept accurate and timely.',
  },
  {
    title: '5. Service Availability',
    body: 'The app may undergo maintenance or updates. While reasonable uptime is targeted, uninterrupted availability cannot be guaranteed at all times.',
  },
  {
    title: '6. Limitation of Liability',
    body: 'The system supports logging and operations. It is not liable for courier delays, parcel damage before hostel receipt, or losses outside operational control.',
  },
  {
    title: '7. Policy Updates',
    body: 'These terms may be updated to meet institutional and legal requirements. Continued use after updates indicates acceptance of revised terms.',
  },
  {
    title: '8. Contact',
    body: 'For account or policy-related concerns, contact your hostel administration office or the designated system administrator.',
  },
];

export default function TermsAndConditions() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms and Conditions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Text style={styles.introText}>
            Please read these terms carefully before using the hostel parcel management system.
          </Text>
        </View>

        {TERMS_SECTIONS.map((section) => (
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
