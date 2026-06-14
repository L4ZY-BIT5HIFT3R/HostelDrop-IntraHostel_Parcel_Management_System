import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Animated,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { Colors, MinimalCard } from '../../utils/theme';
import AppHeader from '../../components/AppHeader';
import AnimatedCard, { STACK_CARD_SPACING, STACK_FOCUS_OFFSET } from '../../components/AnimatedCard';
import ParcelTimeline from '../../components/ParcelTimeline';
import StatusStamp from '../../components/StatusStamp';
import { useAnimatedList } from '../../utils/useAnimatedList';

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
  collected_by_delegate?: boolean;
  delegated_receiver_info?: {
    student_id?: string;
    name?: string;
    email?: string;
    roll_number?: string;
    room_number?: string;
    hostel_type?: string;
  } | null;
}

interface DelegationReceiverInfo {
  student_id?: string;
  name?: string;
  email?: string;
  roll_number?: string;
  room_number?: string;
  hostel_type?: string;
}

const DELIVERED_STACK_CARD_HEIGHT = 240;

export default function MyParcels() {
  const { user } = useAuthStore();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [delegateModalVisible, setDelegateModalVisible] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<DelegationReceiverInfo | null>(null);

  const {
    activeIndex,
    scrollY,
    cardStep,
    contentContainerStyle,
    onLayout,
    onScroll,
    onScrollEndDrag,
    onMomentumScrollEnd,
  } = useAnimatedList({
    itemCount: parcels.length,
    cardHeight: DELIVERED_STACK_CARD_HEIGHT,
    cardSpacing: STACK_CARD_SPACING,
    focusOffset: STACK_FOCUS_OFFSET,
  });

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

  const openDelegateDetails = (parcel: Parcel) => {
    if (!parcel.collected_by_delegate) {
      return;
    }
    if (!parcel.delegated_receiver_info) {
      setSelectedDelegate({
        name: 'Unknown',
        roll_number: 'Not available',
        email: 'Not available',
        room_number: 'Not available',
        hostel_type: parcel.hostel_type,
      });
    } else {
      setSelectedDelegate(parcel.delegated_receiver_info);
    }
    setDelegateModalVisible(true);
  };

  const renderParcelItem = ({ item, index }: { item: Parcel; index: number }) => (
    <AnimatedCard index={index} activeIndex={activeIndex} scrollY={scrollY} status={item.status}>
      <View style={styles.parcelCard}>
        <View style={styles.parcelHeader}>
          <View style={styles.parcelInfo}>
            <Text style={styles.roomNumber}>Room {item.room_number}</Text>
            <StatusStamp status="DELIVERED" small />
          </View>
          {item.collected_by_delegate && (
            <TouchableOpacity
              style={styles.delegationBadge}
              onPress={() => openDelegateDetails(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="people-outline" size={18} color={Colors.textPrimary} />
            </TouchableOpacity>
          )}
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
        {item.collected_by_delegate && (
          <Text style={styles.tapHint}>Received via delegation. Tap the people icon for receiver details.</Text>
        )}
      </View>
    </AnimatedCard>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="My Delivered Parcels"
        subtitle={user?.name}
        containerStyle={styles.header}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
      />

      <Animated.FlatList
        data={parcels}
        extraData={activeIndex}
        renderItem={renderParcelItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContainer,
          contentContainerStyle ?? null,
        ]}
        onLayout={onLayout}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={cardStep}
        snapToAlignment="center"
        decelerationRate={0.992}
        showsVerticalScrollIndicator={false}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
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

      <Modal
        visible={delegateModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDelegateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delegation Receiver</Text>
              <TouchableOpacity onPress={() => setDelegateModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedDelegate ? (
              <View style={styles.detailList}>
                <Text style={styles.detailRow}><Text style={styles.detailLabel}>Name: </Text>{selectedDelegate.name || 'Not available'}</Text>
                <Text style={styles.detailRow}><Text style={styles.detailLabel}>Roll: </Text>{selectedDelegate.roll_number || 'Not available'}</Text>
                <Text style={styles.detailRow}><Text style={styles.detailLabel}>Email: </Text>{selectedDelegate.email || 'Not available'}</Text>
                <Text style={styles.detailRow}><Text style={styles.detailLabel}>Room: </Text>{selectedDelegate.room_number || 'Not available'}</Text>
                <Text style={styles.detailRow}><Text style={styles.detailLabel}>Hostel: </Text>{selectedDelegate.hostel_type || 'Not available'}</Text>
              </View>
            ) : (
              <Text style={styles.emptySubtext}>No delegation receiver details available.</Text>
            )}
          </View>
        </View>
      </Modal>
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
    ...MinimalCard,
    height: DELIVERED_STACK_CARD_HEIGHT,
    padding: 20,
    overflow: 'hidden',
  },
  parcelHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  delegationBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  tapHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    ...MinimalCard,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  detailList: {
    gap: 8,
  },
  detailRow: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  detailLabel: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
