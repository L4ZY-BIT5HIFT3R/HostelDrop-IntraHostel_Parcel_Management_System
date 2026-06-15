import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassTextInput from './GlassInput';
import { matchStudent, MatchStudentResponse, StudentMatch } from '../utils/api';
import { Colors, Fonts, Radii } from '../utils/theme';

export interface AppliedMatch {
  room_number?: string;
  roll_number?: string;
  student_name?: string;
}

interface Props {
  onApply: (applied: AppliedMatch) => void;
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

/**
 * Smart-fill input for parcel intake. The guard pastes/types the recipient
 * label ("Name | Room | Roll") off the box; we parse it and resolve it to a
 * student via the backend, then offer a one-tap fill. No OCR/AI — just the
 * label convention plus exact roll + fuzzy name matching server-side.
 */
export default function LabelAutoMatch({ onApply, label = 'Smart fill · Name | Room | Roll', containerStyle, labelStyle }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchStudentResponse | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const query = text.trim();
    if (query.length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        const data = await matchStudent(query);
        setResult(data);
      } catch {
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [text]);

  const applyMatch = (match: StudentMatch) => {
    onApply({
      roll_number: match.roll_number ?? undefined,
      student_name: match.name ?? undefined,
      // Prefer the student's room of record; fall back to what was on the label.
      room_number: match.room_number ?? result?.parsed.room_number ?? undefined,
    });
    setText('');
    setResult(null);
  };

  const exact = result?.exact_match ?? null;
  const candidates = result?.candidates ?? [];

  return (
    <View style={containerStyle}>
      <GlassTextInput
        label={label}
        inputType="text"
        placeholder="e.g. Bittu Kumar | 214 | 21CS001"
        value={text}
        onChangeText={setText}
        autoCapitalize="none"
        labelStyle={labelStyle}
        leftIconName="sparkles-outline"
      />

      {loading ? (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={Colors.textMuted} />
          <Text style={styles.statusText}>Matching…</Text>
        </View>
      ) : null}

      {!loading && exact ? (
        <TouchableOpacity style={styles.exactCard} onPress={() => applyMatch(exact)} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.accentGreen} />
          <View style={styles.exactBody}>
            <Text style={styles.exactName}>{exact.name}</Text>
            <Text style={styles.exactMeta}>
              {exact.roll_number}
              {exact.room_number ? ` · Room ${exact.room_number}` : ''}
            </Text>
            {exact.room_matches === false ? (
              <View style={styles.warnRow}>
                <Ionicons name="warning-outline" size={12} color={Colors.pending} />
                <Text style={styles.warnText}>Label room differs from student&apos;s room of record</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.tapHint}>Tap to fill</Text>
        </TouchableOpacity>
      ) : null}

      {!loading && !exact && candidates.length > 0 ? (
        <View style={styles.candidates}>
          <Text style={styles.candidatesLabel}>Did you mean…</Text>
          {candidates.map((c) => (
            <TouchableOpacity key={c.roll_number ?? c.name ?? Math.random().toString()} style={styles.candidateChip} onPress={() => applyMatch(c)} activeOpacity={0.85}>
              <Ionicons name="person-outline" size={15} color={Colors.accentBlue} />
              <Text style={styles.candidateText} numberOfLines={1}>
                {c.name}
                {c.roll_number ? `  ·  ${c.roll_number}` : ''}
                {c.room_number ? `  ·  ${c.room_number}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {!loading && result && !exact && candidates.length === 0 && text.trim().length >= 2 ? (
        <Text style={styles.noMatch}>No student matched — fill the fields below manually.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  exactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    padding: 12,
    borderRadius: Radii.lg,
    backgroundColor: Colors.accentGreenDim,
    borderWidth: 1,
    borderColor: 'rgba(46, 107, 62, 0.3)',
  },
  exactBody: {
    flex: 1,
  },
  exactName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  exactMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  warnText: {
    fontSize: 11,
    color: Colors.pending,
    flex: 1,
  },
  tapHint: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.accentGreen,
  },
  candidates: {
    marginTop: 10,
    gap: 8,
  },
  candidatesLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
  candidateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  candidateText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  noMatch: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 10,
  },
});
