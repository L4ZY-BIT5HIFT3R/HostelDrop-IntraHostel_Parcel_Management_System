import React from 'react';
import { Animated, Platform, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

export const STACK_CARD_HEIGHT = 220;
export const STACK_CARD_SPACING = 4;
export const STACK_FOCUS_OFFSET = 56;

const CARD_STEP = STACK_CARD_HEIGHT + STACK_CARD_SPACING;

type Props = {
  children: React.ReactNode;
  index?: number;
  activeIndex?: number;
  scrollY?: Animated.Value;
  style?: StyleProp<ViewStyle>;
};

export default function AnimatedCard({ children, index = 0, activeIndex, scrollY, style }: Props) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (scrollY) {
      return;
    }

    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400 + index * 100,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index, scrollY]);

  if (!scrollY) {
    return (
      <Animated.View 
        style={[
          { opacity: fadeAnim },
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

  return (
    <Animated.View
      style={[
        {
          transform: [{ translateY: stackTranslateY }, { scale }],
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
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 16,
          overflow: 'hidden',
          opacity: activeIndex === index ? 0 : blurOpacity,
        }}
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
