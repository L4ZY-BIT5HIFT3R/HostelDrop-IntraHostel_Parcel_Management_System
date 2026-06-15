import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { Colors, MinimalCard } from '../../utils/theme';
import AppHeader from '../../components/AppHeader';
import ParcelRow from '../../components/ParcelRow';
import ParcelDetailSheet from '../../components/ParcelDetailSheet';

interface Parcel {
  _id: string;
  display_id?: string;
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

export default function MyParcels() {
  const { user } = useAuthStore();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [detailParcel, setDetailParcel] = useState<Parcel | null>(null);
  const [delegateModalVisible, setDelegateModalVisible] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<DelegationReceiverInfo | null>(null);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="My Delivered Parcels"
        subtitle={user?.name}
        containerStyle={styles.header}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
      />

      <View style={styles.content}>
        <FlatList
          data={parcels}
          renderItem={({ item }) => <ParcelRow parcel={item} onPress={() => setDetailParcel(item)} />}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
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
      </View>

      {/* Compact row → expanded detail sheet */}
      <ParcelDetailSheet parcel={detailParcel} onClose={() => setDetailParcel(null)}>
        {detailParcel?.collected_by_delegate && (
          <TouchableOpacity
            style={styles.sheetBtn}
            onPress={() => {
              const p = detailParcel;
              setDetailParcel(null);
              if (p) openDelegateDetails(p);
            }}
          >
            <Ionicons name="people-outline" size={18} color="#FFFFFF" />
            <Text style={styles.sheetBtnText}>View Delegation Receiver</Text>
          </TouchableOpacity>
        )}
      </ParcelDetailSheet>

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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listContainer: {
    paddingBottom: 16,
  },
  sheetBtn: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: Colors.accent,
  },
  sheetBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
