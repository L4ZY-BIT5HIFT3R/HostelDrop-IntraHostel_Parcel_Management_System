import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { Colors, GlassCard } from '../../utils/theme';
import AnimatedCard, { STACK_CARD_SPACING, STACK_FOCUS_OFFSET } from '../../components/AnimatedCard';
import ParcelTimeline from '../../components/ParcelTimeline';

interface Parcel {
  _id: string;
  hostel_type: string;
  room_number: string;
  status: string;
  student_name?: string;
  roll_number?: string;
  description?: string;
  created_at: string;
  assigned_at?: string;
  otp_sent_at?: string;
  delivered_at?: string;
  status_history?: { event?: string; timestamp?: string }[];
}

const DELIVERED_STACK_CARD_HEIGHT = 240;

export default function MyParcels() {
  const { user } = useAuthStore();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchParcels();
  }, []);

  const fetchParcels = async () => {
    try {
      const response = await api.get('/parcel/student/my-parcels');
      setParcels(response.data.parcels);
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchParcels();
  };

  const getStackPadding = (height: number) => ({
    top: Math.max(4, (height - DELIVERED_STACK_CARD_HEIGHT) / 2 - STACK_FOCUS_OFFSET - 12),
    bottom: Math.max(120, (height - DELIVERED_STACK_CARD_HEIGHT) / 2 + STACK_FOCUS_OFFSET + 96),
  });

  const updateActiveIndex = (offsetY: number, viewportHeight?: number) => {
    const height = viewportHeight ?? listHeight;
    if (height <= 0 || parcels.length === 0) return;
    const step = DELIVERED_STACK_CARD_HEIGHT + STACK_CARD_SPACING;
    const { top } = getStackPadding(height);
    const centerY = offsetY + height / 2;
    const rawIndex = (centerY - top - DELIVERED_STACK_CARD_HEIGHT / 2) / step;
    const nextIndex = Math.max(0, Math.min(parcels.length - 1, Math.round(rawIndex)));
    if (nextIndex !== activeIndexRef.current) {
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }
  };

  const renderParcelItem = ({ item, index }: { item: Parcel; index: number }) => (
    <AnimatedCard index={index} activeIndex={activeIndex} scrollY={scrollY}>
      <View style={styles.parcelCard}>
        <View style={styles.parcelHeader}>
          <View style={styles.parcelInfo}>
            <Text style={styles.roomNumber}>Room {item.room_number}</Text>
            <View style={styles.deliveredBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.accentGreen} />
              <Text style={styles.deliveredText}>Delivered</Text>
            </View>
          </View>
        </View>

        {item.description && (
          <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
        )}

        <ParcelTimeline
          history={item.status_history}
          currentStatus={item.status}
          createdAt={item.created_at}
          assignedAt={item.assigned_at}
          otpSentAt={item.otp_sent_at}
          deliveredAt={item.delivered_at}
          compact
        />
      </View>
    </AnimatedCard>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Delivered Parcels</Text>
          <Text style={styles.headerSubtitle}>{user?.name}</Text>
        </View>
      </View>

      <Animated.FlatList
        data={parcels}
        extraData={activeIndex}
        renderItem={renderParcelItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContainer,
          listHeight > 0
            ? {
                paddingTop: getStackPadding(listHeight).top,
                paddingBottom: getStackPadding(listHeight).bottom,
              }
            : null,
        ]}
        onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        snapToInterval={DELIVERED_STACK_CARD_HEIGHT + STACK_CARD_SPACING}
        snapToAlignment="center"
        decelerationRate={0.992}
        showsVerticalScrollIndicator={false}
        onScrollEndDrag={(event) => {
          updateActiveIndex(
            event.nativeEvent.contentOffset.y,
            event.nativeEvent.layoutMeasurement?.height
          );
        }}
        onMomentumScrollEnd={(event) => {
          updateActiveIndex(
            event.nativeEvent.contentOffset.y,
            event.nativeEvent.layoutMeasurement?.height
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No delivered parcels yet</Text>
            <Text style={styles.emptySubtext}>Your delivered parcels will appear here</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  parcelCard: {
    ...GlassCard,
    height: DELIVERED_STACK_CARD_HEIGHT,
    padding: 16,
    overflow: 'hidden',
  },
  parcelHeader: {
    marginBottom: 12,
  },
  parcelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  deliveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.deliveredBg,
  },
  deliveredText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.delivered,
  },
  description: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
  },
});
