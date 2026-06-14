import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, Fonts } from '../utils/theme';

type Props = {
  code?: string | null;
  style?: StyleProp<ViewStyle>;
};

/**
 * A parcel tracking code (e.g. PF1024) rendered like a label sticker —
 * monospace, with a leading ▦ "barcode" glyph block.
 */
export default function TrackingTag({ code, style }: Props) {
  if (!code) return null;
  return (
    <View style={[styles.tag, style]}>
      <View style={styles.bars}>
        <View style={[styles.bar, { width: 2 }]} />
        <View style={[styles.bar, { width: 1 }]} />
        <View style={[styles.bar, { width: 2.5 }]} />
        <View style={[styles.bar, { width: 1 }]} />
      </View>
      <Text style={styles.code}>{code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    height: 12,
  },
  bar: {
    height: '100%',
    backgroundColor: Colors.textPrimary,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textPrimary,
  },
});
