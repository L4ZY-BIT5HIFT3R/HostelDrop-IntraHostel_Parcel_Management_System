import React, { useRef } from 'react';
import { Animated, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far down to scale on press. */
  scaleTo?: number;
  /** Fire a light haptic tick on press-in (native only). */
  haptic?: boolean;
};

/**
 * A Pressable that gives tactile spring feedback — the small physical "give"
 * that makes a paper-desk UI feel alive instead of static. The scale + style
 * live on the Pressable itself, so layout props (flex, width) behave exactly
 * like a normal styled View. Optional light haptic tick on touch.
 */
export default function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  haptic = false,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: Platform.OS !== 'web',
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <AnimatedPressable
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e) => {
        animateTo(scaleTo);
        if (haptic && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
