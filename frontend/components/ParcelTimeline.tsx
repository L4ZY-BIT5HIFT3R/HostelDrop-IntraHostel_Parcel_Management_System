import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '../utils/theme';
import { formatDateTimeInIST } from '../utils/dateTime';

type TimelineEvent = {
  event?: string;
  timestamp?: string;
};

type TimelineProps = {
  history?: TimelineEvent[];
  currentStatus?: string;
  createdAt?: string;
  assignedAt?: string;
  otpSentAt?: string;
  deliveredAt?: string;
  compact?: boolean;
};

const TIMELINE_STEPS = [
  { key: 'LOGGED', label: 'Logged' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const STEP_ORDER: Record<string, number> = {
  LOGGED: 0,
  ASSIGNED: 1,
  DELIVERED: 2,
};

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const formatTimestamp = (value?: string) => {
  return formatDateTimeInIST(value);
};

export default function ParcelTimeline({
  history,
  currentStatus,
  createdAt,
  assignedAt,
  otpSentAt,
  deliveredAt,
  compact = false,
}: TimelineProps) {
  const stepTimeMap = useMemo(() => {
    const map: Record<string, string | undefined> = {};

    if (Array.isArray(history) && history.length) {
      const sorted = [...history].sort((a, b) => {
        const aTime = parseDate(a.timestamp)?.getTime() ?? 0;
        const bTime = parseDate(b.timestamp)?.getTime() ?? 0;
        if (aTime === bTime) {
          return (STEP_ORDER[a.event || ''] ?? 99) - (STEP_ORDER[b.event || ''] ?? 99);
        }
        return aTime - bTime;
      });

      for (const item of sorted) {
        if (!item.event || !item.timestamp) continue;
        if (!map[item.event]) {
          map[item.event] = item.timestamp;
        }
      }
    }

    if (!map.LOGGED && createdAt) map.LOGGED = createdAt;

    if (!map.ASSIGNED) {
      if (assignedAt) {
        map.ASSIGNED = assignedAt;
      } else if (currentStatus === 'PENDING' || currentStatus === 'DELIVERED') {
        map.ASSIGNED = createdAt;
      }
    }

    if (!map.DELIVERED && deliveredAt) map.DELIVERED = deliveredAt;

    return map;
  }, [history, currentStatus, createdAt, assignedAt, deliveredAt]);

  const completedIndexes = TIMELINE_STEPS
    .map((step, index) => (stepTimeMap[step.key] ? index : -1))
    .filter((index) => index >= 0);
  const latestCompletedIndex = completedIndexes.length ? Math.max(...completedIndexes) : -1;
  const currentIndex =
    latestCompletedIndex < TIMELINE_STEPS.length - 1 ? latestCompletedIndex + 1 : latestCompletedIndex;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {TIMELINE_STEPS.map((step, index) => {
        const isCompleted = Boolean(stepTimeMap[step.key]);
        const isCurrent = !isCompleted && index === currentIndex;
        const isLast = index === TIMELINE_STEPS.length - 1;

        return (
          <View key={step.key} style={[styles.row, compact && styles.rowCompact]}>
            <View style={styles.indicatorColumn}>
              {!isLast && (
                <View
                  style={[
                    styles.connector,
                    isCompleted ? styles.connectorDone : styles.connectorPending,
                  ]}
                />
              )}
              <View
                style={[
                  styles.dot,
                  isCompleted ? styles.dotDone : styles.dotPending,
                  isCurrent ? styles.dotCurrent : null,
                ]}
              />
            </View>

            <View style={styles.textBlock}>
              <Text style={[styles.stepLabel, isCompleted && styles.stepLabelDone]}>
                {step.label}
              </Text>
              <Text style={[styles.timeText, compact && styles.timeTextCompact]}>
                {formatTimestamp(stepTimeMap[step.key])}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    marginTop: 12,
    paddingTop: 10,
    gap: 8,
  },
  containerCompact: {
    marginTop: 8,
    paddingTop: 8,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
  },
  rowCompact: {
    minHeight: 20,
  },
  indicatorColumn: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    top: 12,
    bottom: -12,
    width: 1.5,
  },
  connectorDone: {
    backgroundColor: Colors.textPrimary,
  },
  connectorPending: {
    backgroundColor: Colors.surfaceBorder,
    borderStyle: 'dashed' as const,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  dotDone: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  dotPending: {
    backgroundColor: Colors.bg,
    borderColor: Colors.surfaceBorder,
  },
  dotCurrent: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  textBlock: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 8,
  },
  stepLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  stepLabelDone: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  timeText: {
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    color: Colors.textMuted,
  },
  timeTextCompact: {
    fontSize: 10,
  },
});
