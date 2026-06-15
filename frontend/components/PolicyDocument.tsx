import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radii, Shadows } from '../utils/theme';

export type PolicySection = { title: string; body: string };

type Props = {
  /** Rubber-stamp kicker, e.g. "TERMS" / "PRIVACY". */
  stamp: string;
  title: string;
  intro: string;
  sections: PolicySection[];
  lastUpdated: string;
};

/**
 * A "Mailroom" legal document layout: a kraft masthead with a rubber-stamp
 * kicker, a memo-style intro on a manila note, and numbered clause cards with
 * monospace clause markers. Shared by the Terms and Privacy screens.
 */
export default function PolicyDocument({ stamp, title, intro, sections, lastUpdated }: Props) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Masthead */}
      <View style={styles.masthead}>
        <View style={styles.mastheadTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.stamp}>
            <Ionicons name="document-text-outline" size={13} color={Colors.accent} />
            <Text style={styles.stampText}>{stamp}</Text>
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.rule} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro memo */}
        <View style={styles.memo}>
          <Text style={styles.memoLabel}>OVERVIEW</Text>
          <Text style={styles.memoText}>{intro}</Text>
        </View>

        {/* Clauses */}
        {sections.map((section, index) => (
          <View key={section.title} style={styles.clause}>
            <View style={styles.clauseHead}>
              <View style={styles.numChip}>
                <Text style={styles.numText}>{String(index + 1).padStart(2, '0')}</Text>
              </View>
              <Text style={styles.clauseTitle}>{section.title.replace(/^\d+\.\s*/, '')}</Text>
            </View>
            <Text style={styles.clauseBody}>{section.body}</Text>
          </View>
        ))}

        {/* Footer stamp */}
        <View style={styles.footer}>
          <View style={styles.footerRule} />
          <Text style={styles.footerText}>LAST UPDATED · {lastUpdated.toUpperCase()}</Text>
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
  masthead: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  mastheadTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    transform: [{ rotate: '-2deg' }],
    opacity: 0.92,
  },
  stampText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: Colors.accent,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  rule: {
    height: 2,
    width: 40,
    borderRadius: 1,
    backgroundColor: Colors.accent,
    marginTop: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  memo: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    borderRadius: Radii.lg,
    padding: 16,
    marginBottom: 18,
    ...Shadows.subtle,
  },
  memoLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  memoText: {
    fontSize: 14.5,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  clause: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radii.lg,
    padding: 16,
    marginBottom: 12,
    ...Shadows.subtle,
  },
  clauseHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  numChip: {
    minWidth: 30,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: Radii.sm,
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(210, 63, 28, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontFamily: Fonts.mono,
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Colors.accent,
  },
  clauseTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
  clauseBody: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  footerRule: {
    width: 36,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  footerText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.textMuted,
  },
});
