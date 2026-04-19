import React from 'react';
import { Animated, Platform, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

export const STACK_CARD_HEIGHT = 220;
export const STACK_CARD_SPACING = 4;
export const STACK_FOCUS_OFFSET = 56;

const CARD_STEP = STACK_CARD_HEIGHT + STACK_CARD_SPACING;
const PULSE_DURATION_MS = 1700;
const DRIFT_DURATION_MS = 2200;
const SETTLE_DURATION_MS = 520;

type Props = {
  children: React.ReactNode;
  index?: number;
  activeIndex?: number;
  scrollY?: Animated.Value;
  status?: string;
  style?: StyleProp<ViewStyle>;
};

export default function AnimatedCard({ children, index = 0, activeIndex, scrollY, status, style }: Props) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  const driftAnim = React.useRef(new Animated.Value(0)).current;
  const settleAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (status !== 'PENDING') {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: PULSE_DURATION_MS,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: PULSE_DURATION_MS,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulseAnim, status]);

  React.useEffect(() => {
    if (status !== 'UNASSIGNED') {
      driftAnim.stopAnimation();
      driftAnim.setValue(0);
      return;
    }

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(driftAnim, {
          toValue: 1,
          duration: DRIFT_DURATION_MS,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(driftAnim, {
          toValue: 0,
          duration: DRIFT_DURATION_MS,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    driftLoop.start();

    return () => {
      driftLoop.stop();
    };
  }, [driftAnim, status]);

  React.useEffect(() => {
    if (status !== 'DELIVERED') {
      settleAnim.stopAnimation();
      settleAnim.setValue(1);
      return;
    }

    settleAnim.setValue(0);
    Animated.timing(settleAnim, {
      toValue: 1,
      duration: SETTLE_DURATION_MS,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [settleAnim, status]);

  React.useEffect(() => {
    if (scrollY) {
      return;
    }

    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400 + index * 100,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fadeAnim, index, scrollY]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.009],
  });
  const driftTranslateY = driftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1],
  });
  const settleScale = settleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.996, 1],
  });

  const shouldPulse = status === 'PENDING' && (activeIndex === undefined || activeIndex === index);
  const shouldDrift = status === 'UNASSIGNED' && (activeIndex === undefined || activeIndex === index);

  if (!scrollY) {
    const entryScale = status === 'DELIVERED' ? settleScale : 1;
    const idleScale = shouldPulse ? pulseScale : 1;
    const combinedScale = Animated.multiply(idleScale, entryScale);

    return (
      <Animated.View 
        style={[
          {
            opacity: fadeAnim,
            transform: [
              { translateY: shouldDrift ? driftTranslateY : 0 },
              { scale: combinedScale },
            ],
          },
          style
        ]}
      >
        {children}
      </Animated.View>
    );
  }

  const focusPoint = index * CARD_STEP;
  const inputRange = [
    focusPoint - CARD_STEP,
    focusPoint - CARD_STEP * 0.22,
    focusPoint,
    focusPoint + CARD_STEP * 0.22,
    focusPoint + CARD_STEP,
  ];

  const scale = scrollY.interpolate({
    inputRange,
    outputRange: [0.95, 0.985, 1, 0.985, 0.95],
    extrapolate: 'clamp',
  });

  const blurOpacity = scrollY.interpolate({
    inputRange,
    outputRange: [0.44, 0.1, 0, 0.1, 0.44],
    extrapolate: 'clamp',
  });

  const stackTranslateY = scrollY.interpolate({
    inputRange,
    outputRange: [12, 4, 0, -4, -12],
    extrapolate: 'clamp',
  });

  const cardOpacity = scrollY.interpolate({
    inputRange,
    outputRange: [0.68, 0.9, 1, 0.9, 0.68],
    extrapolate: 'clamp',
  });

  const distanceFromActive = activeIndex === undefined ? 0 : Math.abs(activeIndex - index);
  const stackLayer = 1000 - distanceFromActive;
  const statusScale = shouldPulse ? pulseScale : 1;
  const deliveredScale = status === 'DELIVERED' ? settleScale : 1;
  const computedScale = Animated.multiply(Animated.multiply(scale, statusScale), deliveredScale);
  const computedTranslateY = shouldDrift
    ? Animated.add(stackTranslateY, driftTranslateY)
    : stackTranslateY;

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateY: computedTranslateY }, { scale: computedScale }],
          opacity: activeIndex === index ? 1 : cardOpacity,
          marginBottom: STACK_CARD_SPACING,
          overflow: 'visible',
          zIndex: stackLayer,
          elevation: Math.max(0, stackLayer),
        },
        style,
      ]}
    >
      {children}
      <Animated.View
        {...(Platform.OS !== 'web' ? { pointerEvents: 'none' } : {})}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 16,
            overflow: 'hidden',
            opacity: activeIndex === index ? 0 : blurOpacity,
          },
          Platform.OS === 'web' ? ({ pointerEvents: 'none' } as const) : null,
        ]}
      >
        {Platform.OS === 'android' ? (
          <Animated.View
            style={{
              flex: 1,
            backgroundColor: 'rgba(247, 247, 248, 0.8)',
            }}
          />
        ) : (
          <BlurView
            intensity={60}
            tint="light"
            style={{ flex: 1 }}
          />
        )}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: Platform.OS === 'android'
              ? 'rgba(26, 26, 26, 0.04)'
              : 'rgba(26, 26, 26, 0.06)',
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}
