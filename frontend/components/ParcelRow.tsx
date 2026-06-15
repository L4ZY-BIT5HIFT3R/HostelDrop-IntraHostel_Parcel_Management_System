import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radii, Shadows } from '../utils/theme';
import StatusStamp from './StatusStamp';
import PressableScale from './PressableScale';

export type ParcelRowData = {
  _id: string;
  display_id?: string;
  room_number: string;
  status: string;
  student_name?: string;
  roll_number?: string;
};

type Props = {
  parcel: ParcelRowData;
  onPress: () => void;
};

const STATUS_INK: Record<string, string> = {
  PENDING: Colors.pending,
  UNASSIGNED: Colors.unassigned,
  DELIVERED: Colors.delivered,
};

/**
 * A manila luggage-tag row: a punched eyelet on the perforated left edge, a
 * monospace tracking code with a tiny barcode, room + recipient, and a canted
 * rubber-stamp status. The whole tag gives a tactile press.
 */
export default function ParcelRow({ parcel, onPress }: Props) {
  const recipient = parcel.student_name
    ? `${parcel.student_name}${parcel.roll_number ? ` · ${parcel.roll_number}` : ''}`
    : 'Unassigned';
  const ink = STATUS_INK[(parcel.status || '').toUpperCase()] ?? Colors.accent;

  return (
    <PressableScale onPress={onPress} haptic style={styles.row}>
      {/* Perforated eyelet edge */}
      <View style={styles.eyelet}>
        <View style={[styles.punch, { borderColor: ink }]} />
      </View>

      <View style={[styles.stripe, { backgroundColor: ink }]} />

      <View style={styles.body}>
        <View style={styles.codeRow}>
          <View style={styles.bars}>
            <View style={[styles.bar, { width: 2, backgroundColor: ink }]} />
            <View style={[styles.bar, { width: 1 }]} />
            <View style={[styles.bar, { width: 2.5, backgroundColor: ink }]} />
            <View style={[styles.bar, { width: 1 }]} />
            <View style={[styles.bar, { width: 1.5, backgroundColor: ink }]} />
          </View>
          <Text style={styles.code}>{parcel.display_id || 'P—————'}</Text>
        </View>
        <Text style={styles.room} numberOfLines={1}>
          Room {parcel.room_number}
          <Text style={styles.recipient}>{'   ·   ' + recipient}</Text>
        </Text>
      </View>

      <View style={styles.right}>
        <StatusStamp status={parcel.status} small style={styles.stampAlign} />
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  eyelet: {
    width: 22,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.surfaceBorder,
    borderStyle: 'dashed',
    backgroundColor: Colors.surfaceHover,
  },
  punch: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    backgroundColor: Colors.bg,
  },
  stripe: {
    width: 3,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    gap: 4,
    paddingVertical: 13,
    paddingHorizontal: 13,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    height: 11,
  },
  bar: {
    height: '100%',
    backgroundColor: Colors.textMuted,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textPrimary,
  },
  room: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  recipient: {
    fontWeight: '400',
    color: Colors.textMuted,
  },
  right: {
    alignItems: 'flex-end',
    gap: 8,
    paddingRight: 12,
    paddingLeft: 4,
  },
  stampAlign: {
    alignSelf: 'flex-end',
  },
});
