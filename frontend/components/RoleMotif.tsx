import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

type Role = 'GUARD' | 'STUDENT' | 'ADMIN';

const native = Platform.OS !== 'web';
const ART = 52; // art canvas inside the tile

/**
 * A small, looping "Mailroom" animation that stands in for each role's icon on
 * the selection screen — crisp, centered, and inheriting the card's stamp-ink:
 *  - GUARD   → a parcel dropping into a taped receiving box (hand-over)
 *  - STUDENT → a QR code with a scan line sweeping across it (pickup)
 *  - ADMIN   → an approval stamp pressing onto a record (manage)
 *
 * Pure react-native-svg + Animated (already in the app) — no video, gif, or
 * extra dependency; vector-crisp at any size.
 */
export default function RoleMotif({ role, ink }: { role: Role; ink: string }) {
  return (
    <View style={styles.tile} {...(native ? { pointerEvents: 'none' } : {})}>
      {role === 'GUARD' ? <GuardTile ink={ink} /> : null}
      {role === 'STUDENT' ? <StudentTile ink={ink} /> : null}
      {role === 'ADMIN' ? <AdminTile ink={ink} /> : null}
    </View>
  );
}

function GuardTile({ ink }: { ink: string }) {
  const drop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drop, {
          toValue: 1,
          duration: 1400,
          easing: Easing.in(Easing.quad),
          useNativeDriver: native,
        }),
        Animated.delay(600),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drop]);

  const translateY = drop.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const opacity = drop.interpolate({ inputRange: [0, 0.16, 0.72, 1], outputRange: [0, 1, 1, 0] });

  return (
    <View style={styles.scene}>
      <Svg width={ART} height={ART}>
        {/* taped receiving box */}
        <Rect x={11} y={28} width={30} height={20} rx={2.5} stroke={ink} strokeWidth={2.4} fill="none" />
        <Path d="M11 36 H41" stroke={ink} strokeWidth={2.4} />
        <Path d="M26 28 V36" stroke={ink} strokeWidth={2.4} />
        {/* drop guide */}
        <Path d="M26 3 V18" stroke={ink} strokeWidth={2} strokeDasharray="2.5,3.5" strokeLinecap="round" />
      </Svg>
      <Animated.View style={[styles.guardParcel, { transform: [{ translateY }], opacity }]}>
        <Svg width={20} height={16}>
          <Rect x={1} y={1} width={18} height={14} rx={2} fill={ink} />
          <Path d="M10 1 V15" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.5} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function StudentTile({ ink }: { ink: string }) {
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scan, {
        toValue: 1,
        duration: 1900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: native,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [scan]);

  const translateY = scan.interpolate({ inputRange: [0, 1], outputRange: [2, 47] });
  const opacity = scan.interpolate({ inputRange: [0, 0.08, 0.92, 1], outputRange: [0.3, 1, 1, 0.3] });

  const finder = (x: number, y: number) => (
    <>
      <Rect x={x} y={y} width={14} height={14} rx={2.5} stroke={ink} strokeWidth={2.2} fill="none" />
      <Rect x={x + 4.5} y={y + 4.5} width={5} height={5} rx={1} fill={ink} />
    </>
  );

  return (
    <View style={styles.scene}>
      <Svg width={ART} height={ART}>
        {finder(3, 3)}
        {finder(35, 3)}
        {finder(3, 35)}
        {/* modules */}
        <Rect x={23} y={6} width={5} height={5} rx={1} fill={ink} />
        <Rect x={31} y={20} width={4} height={4} rx={1} fill={ink} />
        <Rect x={21} y={30} width={4} height={4} rx={1} fill={ink} />
        <Rect x={31} y={31} width={5} height={5} rx={1} fill={ink} />
        <Rect x={41} y={40} width={5} height={5} rx={1} fill={ink} />
        <Rect x={22} y={42} width={4} height={4} rx={1} fill={ink} />
      </Svg>
      <Animated.View
        style={[styles.scanLine, { backgroundColor: ink, transform: [{ translateY }], opacity }]}
      />
    </View>
  );
}

function AdminTile({ ink }: { ink: string }) {
  const stamp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(stamp, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: native,
        }),
        Animated.delay(1000),
        Animated.timing(stamp, {
          toValue: 0,
          duration: 340,
          useNativeDriver: native,
        }),
        Animated.delay(420),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [stamp]);

  const scale = stamp.interpolate({ inputRange: [0, 1], outputRange: [1.5, 1] });
  const opacity = stamp.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.85, 1] });

  return (
    <View style={styles.scene}>
      <Svg width={ART} height={ART}>
        {/* record / ledger lines */}
        <Path d="M8 14 H30" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M8 23 H40" stroke={ink} strokeWidth={2.4} strokeLinecap="round" opacity={0.65} />
        <Path d="M8 32 H26" stroke={ink} strokeWidth={2.4} strokeLinecap="round" opacity={0.65} />
        <Path d="M8 41 H36" stroke={ink} strokeWidth={2.4} strokeLinecap="round" opacity={0.4} />
      </Svg>
      <Animated.View style={[styles.adminStamp, { opacity, transform: [{ rotate: '-11deg' }, { scale }] }]}>
        <Svg width={30} height={30}>
          <Rect x={2} y={2} width={26} height={26} rx={4.5} stroke={ink} strokeWidth={2.6} fill="none" />
          <Path
            d="M9 15 L14 20 L21 10"
            stroke={ink}
            strokeWidth={2.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: ART,
    height: ART,
    alignItems: 'center',
    justifyContent: 'center',
    // Soften the stamp-ink so the motif reads as a calm illustration, not a
    // bold solid block, against the kraft card.
    opacity: 0.72,
  },
  scene: {
    width: ART,
    height: ART,
  },
  guardParcel: {
    position: 'absolute',
    left: 16,
    top: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 3,
    right: 3,
    height: 2.5,
    borderRadius: 2,
  },
  adminStamp: {
    position: 'absolute',
    right: 9,
    top: 13,
  },
});
