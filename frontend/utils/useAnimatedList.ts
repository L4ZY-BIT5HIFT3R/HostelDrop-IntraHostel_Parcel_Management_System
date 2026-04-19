import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
} from 'react-native';
import {
  STACK_CARD_HEIGHT,
  STACK_CARD_SPACING,
  STACK_FOCUS_OFFSET,
} from '../components/AnimatedCard';

type UseAnimatedListOptions = {
  itemCount: number;
  cardHeight?: number;
  cardSpacing?: number;
  focusOffset?: number;
};

export function useAnimatedList({
  itemCount,
  cardHeight = STACK_CARD_HEIGHT,
  cardSpacing = STACK_CARD_SPACING,
  focusOffset = STACK_FOCUS_OFFSET,
}: UseAnimatedListOptions) {
  const [listHeight, setListHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const cardStep = cardHeight + cardSpacing;

  useEffect(() => {
    const nextIndex = itemCount > 0 ? Math.min(activeIndexRef.current, itemCount - 1) : 0;
    if (nextIndex !== activeIndexRef.current) {
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }
  }, [itemCount]);

  const getStackPadding = useCallback(
    (height: number) => ({
      top: Math.max(4, (height - cardHeight) / 2 - focusOffset - 12),
      bottom: Math.max(120, (height - cardHeight) / 2 + focusOffset + 96),
    }),
    [cardHeight, focusOffset]
  );

  const updateActiveIndex = useCallback(
    (offsetY: number, viewportHeight?: number) => {
      const height = viewportHeight ?? listHeight;

      if (height <= 0 || itemCount === 0) return;

      const { top } = getStackPadding(height);
      const centerY = offsetY + height / 2;
      const rawIndex = (centerY - top - cardHeight / 2) / cardStep;
      const nextIndex = Math.max(0, Math.min(itemCount - 1, Math.round(rawIndex)));

      if (nextIndex !== activeIndexRef.current) {
        activeIndexRef.current = nextIndex;
        setActiveIndex(nextIndex);
      }
    },
    [cardHeight, cardStep, getStackPadding, itemCount, listHeight]
  );

  const contentContainerStyle = useMemo(
    () =>
      listHeight > 0
        ? {
            paddingTop: getStackPadding(listHeight).top,
            paddingBottom: getStackPadding(listHeight).bottom,
          }
        : undefined,
    [getStackPadding, listHeight]
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setListHeight(event.nativeEvent.layout.height);
  }, []);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: Platform.OS !== 'web',
      }),
    [scrollY]
  );

  const onScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateActiveIndex(
        event.nativeEvent.contentOffset.y,
        event.nativeEvent.layoutMeasurement?.height
      );
    },
    [updateActiveIndex]
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateActiveIndex(
        event.nativeEvent.contentOffset.y,
        event.nativeEvent.layoutMeasurement?.height
      );
    },
    [updateActiveIndex]
  );

  return {
    activeIndex,
    scrollY,
    cardStep,
    contentContainerStyle,
    onLayout,
    onScroll,
    onScrollEndDrag,
    onMomentumScrollEnd,
  };
}
