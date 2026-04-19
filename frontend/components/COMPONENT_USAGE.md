# Reusable UI Component Reference

This document describes the expected props, defaults, and integration patterns for shared UI components in the `frontend/components` folder.

## AnimatedCard

Source: `frontend/components/AnimatedCard.tsx`

### Purpose
- Wraps each parcel card row with stacked-list motion and status-specific micro-animations.
- Works in two modes:
- Scroll-driven stack mode (when `scrollY` is provided).
- Entry animation mode (when `scrollY` is omitted).

### Exports
- `STACK_CARD_HEIGHT` = `220`
- `STACK_CARD_SPACING` = `4`
- `STACK_FOCUS_OFFSET` = `56`

Use these constants with list layout hooks (`useAnimatedList`) and card container sizing so animation math stays aligned.

### Props
- `children: React.ReactNode` (required)
- `index?: number` (default: `0`)
- `activeIndex?: number`
- `scrollY?: Animated.Value`
- `status?: string`
- `style?: StyleProp<ViewStyle>`

### Status behavior
- `PENDING`: subtle pulse animation on focused/active card.
- `UNASSIGNED`: subtle vertical drift on focused/active card.
- `DELIVERED`: short settle animation when rendered/updated.
- Any other status: standard stacked animation only.

### Expected usage
```tsx
<AnimatedCard
  index={index}
  activeIndex={activeIndex}
  scrollY={scrollY}
  status={item.status}
>
  <View style={styles.parcelCard}>{/* card content */}</View>
</AnimatedCard>
```

### Integration notes
- For `Animated.FlatList`, pass the same `scrollY` and `activeIndex` state that drives snapping.
- Keep your card height synchronized with `STACK_CARD_HEIGHT` (or pass matching config into `useAnimatedList`).
- `style` should be used for wrapper-level overrides (spacing, transforms, z-order tweaks).

---

## ErrorPopup

Source: `frontend/components/ErrorPopup.tsx`

### Purpose
- Consistent modal error feedback with optional retry action.
- Normalizes unknown error payloads into display-safe strings.

### Props
- `visible: boolean` (required)
- `message: unknown` (required)
- `code?: unknown`
- `onClose: () => void` (required)
- `onRetry?: () => void | Promise<void>`
- `retryLabel?: string` (default: `Retry`)
- `dismissLabel?: string` (default: `Dismiss`)

### Behavior details
- If `onRetry` is omitted, only the dismiss button is shown.
- If `onRetry` is provided, `onClose` runs first, then retry callback is invoked.
- Tapping the overlay or close icon calls `onClose`.

### Expected usage
```tsx
<ErrorPopup
  visible={errorVisible}
  message={errorMessage}
  code={errorCode}
  onClose={() => setErrorVisible(false)}
  onRetry={fetchData}
  retryLabel="Try again"
  dismissLabel="Dismiss"
/>
```

### Integration notes
- Keep `message` and `code` as raw backend/client values; component will normalize safely.
- Use this for actionable failures (network, validation, submission failures) instead of `Alert.alert` when you need consistent UX.

---

## ParcelTimeline

Source: `frontend/components/ParcelTimeline.tsx`

### Purpose
- Renders parcel lifecycle progression (`LOGGED` -> `ASSIGNED` -> `DELIVERED`) with timestamps.
- Uses provided `history` first, then falls back to direct timestamp fields.

### Props
- `history?: { event?: string; timestamp?: string }[]`
- `currentStatus?: string`
- `createdAt?: string`
- `assignedAt?: string`
- `otpSentAt?: string`
- `deliveredAt?: string`
- `compact?: boolean` (default: `false`)

### Data resolution order
1. Build a sorted map from `history` events.
2. Fill missing `LOGGED` from `createdAt`.
3. Fill missing `ASSIGNED` from `assignedAt`, or from `createdAt` when status implies assignment (`PENDING`/`DELIVERED`).
4. Fill missing `DELIVERED` from `deliveredAt`.

### Expected usage
```tsx
<ParcelTimeline
  history={item.status_history}
  currentStatus={item.status}
  createdAt={item.created_at}
  assignedAt={item.assigned_at}
  otpSentAt={item.otp_sent_at}
  deliveredAt={item.delivered_at}
  compact
/>
```

### Integration notes
- Pass API date strings directly; formatting to IST is handled internally.
- `otpSentAt` is accepted for compatibility, even though the current visual timeline has three steps.
- Use `compact` for card lists and default mode for detail screens.
