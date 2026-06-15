import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radii, Shadows } from '../utils/theme';
import PressableScale from './PressableScale';

type Props = {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Stamp-ink accent for the stripe / icon. Defaults to vermilion. */
  ink?: string;
  inkDim?: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * A manila-tag stat counter: a left rubber-stamp ink stripe, a big monospace
 * "tracking-code" number, and an icon chip. Tappable to act as a live filter —
 * the selected tag deepens its ink and lifts slightly off the desk.
 */
export default function StatCard({
  label,
  value,
  icon,
  ink = Colors.accent,
  inkDim = Colors.accentDim,
  active = false,
  onPress,
  style,
}: Props) {
  return (
    <PressableScale
      onPress={onPress}
      haptic={!!onPress}
      disabled={!onPress}
      style={[
        styles.card,
        { borderLeftColor: ink },
        active && { backgroundColor: inkDim, borderColor: ink },
        active && Shadows.card,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconChip, { backgroundColor: inkDim }]}>
          <Ionicons name={icon} size={16} color={ink} />
        </View>
        {active ? <View style={[styles.activeDot, { backgroundColor: ink }]} /> : null}
      </View>
      <Text style={[styles.value, { color: ink }]}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderLeftWidth: 4,
    borderRadius: Radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 2,
    ...Shadows.subtle,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  value: {
    fontFamily: Fonts.mono,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
});
