import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, Fonts } from '../utils/theme';

type Props = {
  status?: string;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

const STATUS_INK: Record<string, { ink: string; bg: string }> = {
  PENDING: { ink: Colors.pending, bg: Colors.pendingBg },
  UNASSIGNED: { ink: Colors.unassigned, bg: Colors.unassignedBg },
  DELIVERED: { ink: Colors.delivered, bg: Colors.deliveredBg },
};

/**
 * A rubber-stamp status tag — outlined, uppercase, monospace, slightly canted,
 * the way a receiving clerk would stamp a parcel slip.
 */
export default function StatusStamp({ status, small, style }: Props) {
  const key = (status || '').toUpperCase();
  const cfg = STATUS_INK[key] ?? { ink: Colors.textSecondary, bg: Colors.surfaceHover };

  return (
    <View
      style={[
        styles.stamp,
        { borderColor: cfg.ink, backgroundColor: cfg.bg },
        small && styles.stampSmall,
        style,
      ]}
    >
      <Text style={[styles.text, { color: cfg.ink }, small && styles.textSmall]}>
        {key || 'UNKNOWN'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ rotate: '-2deg' }],
  },
  stampSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  textSmall: {
    fontSize: 9.5,
    letterSpacing: 1,
  },
});
