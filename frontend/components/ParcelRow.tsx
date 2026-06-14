import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../utils/theme';
import StatusStamp from './StatusStamp';

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

/**
 * Compact manila-tag list row: tracking code, room + recipient, and a status
 * stamp. Tapping opens the full detail sheet.
 */
export default function ParcelRow({ parcel, onPress }: Props) {
  const recipient = parcel.student_name
    ? `${parcel.student_name}${parcel.roll_number ? ` · ${parcel.roll_number}` : ''}`
    : 'Unassigned';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.left}>
        <Text style={styles.code}>{parcel.display_id || 'P—————'}</Text>
        <Text style={styles.room} numberOfLines={1}>
          Room {parcel.room_number}
          <Text style={styles.recipient}>  ·  {recipient}</Text>
        </Text>
      </View>
      <StatusStamp status={parcel.status} small />
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowPressed: {
    backgroundColor: Colors.surfaceHover,
  },
  left: {
    flex: 1,
    gap: 3,
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
  chevron: {
    marginLeft: -4,
  },
});
