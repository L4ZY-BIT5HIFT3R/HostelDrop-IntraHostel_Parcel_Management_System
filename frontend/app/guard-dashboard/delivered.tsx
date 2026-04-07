import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import api from '../../utils/api';
import { Colors, GlassCard, GlassInput } from '../../utils/theme';
import AnimatedCard, { STACK_CARD_SPACING, STACK_FOCUS_OFFSET } from '../../components/AnimatedCard';
import ParcelTimeline from '../../components/ParcelTimeline';

interface Parcel {
  _id: string;
  hostel_type: string;
  room_number: string;
  status: string;
  student_id?: string;
  student_name?: string;
  roll_number?: string;
  description?: string;
  created_at: string;
  assigned_at?: string;
  otp_sent_at?: string;
  delivered_at?: string;
  status_history?: { event?: string; timestamp?: string }[];
}

interface StudentDetails {
  _id: string;
  name: string;
  email: string;
  roll_number: string;
  room_number: string;
  hostel_type: string;
  contact_number?: string;
}

const DELIVERED_STACK_CARD_HEIGHT = 240;

export default function DeliveredParcels() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<Parcel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [listHeight, setListHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  useEffect(() => {
    fetchParcels();
  }, []);

  useEffect(() => {
    if (isFocused) {
      setRefreshing(true);
      fetchParcels();
    }
  }, [isFocused]);

  const fetchParcels = async () => {
    try {
      const response = await api.get('/parcel/guard/delivered');
      setParcels(response.data.parcels);
      setFilteredParcels(response.data.parcels);
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
    if (height <= 0 || filteredParcels.length === 0) return;
    const step = DELIVERED_STACK_CARD_HEIGHT + STACK_CARD_SPACING;
    const { top } = getStackPadding(height);
    const centerY = offsetY + height / 2;
    const rawIndex = (centerY - top - DELIVERED_STACK_CARD_HEIGHT / 2) / step;
    const nextIndex = Math.max(0, Math.min(filteredParcels.length - 1, Math.round(rawIndex)));
    if (nextIndex !== activeIndexRef.current) {
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredParcels(parcels);
    } else {
      const lowercaseQuery = query.toLowerCase();
      const filtered = parcels.filter((parcel) => {
        const roomMatch = parcel.room_number.toLowerCase().includes(lowercaseQuery);
        const rollMatch = parcel.roll_number?.toLowerCase().includes(lowercaseQuery);
        const nameMatch = parcel.student_name?.toLowerCase().includes(lowercaseQuery);
        return roomMatch || rollMatch || nameMatch;
      });
      setFilteredParcels(filtered);
    }
  };

  const fetchStudentDetails = async (studentId: string) => {
    setSelectedStudent(null);
    setStudentModalVisible(true);
    setLoadingStudent(true);
    try {
      const response = await api.get(`/student/${studentId}`);
      setSelectedStudent(response.data.student);
    } catch (error: any) {
      console.error('Error fetching student details:', error?.response?.status, error?.response?.data || error?.message);
      setErrorMessage(error?.response?.data?.detail || 'Failed to fetch student details');
    } finally {
      setLoadingStudent(false);
    }
  };

  const renderParcelItem = ({ item, index }: { item: Parcel; index: number }) => (
    <AnimatedCard index={index} activeIndex={activeIndex} scrollY={scrollY}>
      <TouchableOpacity
        style={styles.parcelCard}
        onPress={() => item.student_id && fetchStudentDetails(item.student_id)}
        activeOpacity={item.student_id ? 0.7 : 1}
      >
        <View style={styles.parcelHeader}>
          <View style={styles.parcelInfo}>
            <Text style={styles.roomNumber}>Room {item.room_number}</Text>
            <View style={styles.deliveredBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.accentGreen} />
              <Text style={styles.deliveredText}>Delivered</Text>
            </View>
          </View>
          {item.student_id && (
            <Ionicons name="information-circle-outline" size={24} color={Colors.accentBlue} />
          )}
        </View>

        {item.student_name && (
          <View style={styles.studentInfo}>
            <Ionicons name="person" size={16} color={Colors.textMuted} />
            <Text style={styles.studentName}>{item.student_name}</Text>
            {item.roll_number && <Text style={styles.rollNumber}>({item.roll_number})</Text>}
          </View>
        )}

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

        {item.student_id && (
          <Text style={styles.tapHint}>Tap to view student details</Text>
        )}
      </TouchableOpacity>
    </AnimatedCard>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {errorMessage ? (
          <TouchableOpacity style={styles.inlineError} onPress={() => setErrorMessage('')} activeOpacity={0.8}>
            <Ionicons name="alert-circle" size={16} color={Colors.accentRed} />
            <Text style={styles.inlineErrorText}>{errorMessage}</Text>
            <Ionicons name="close" size={16} color={Colors.accentRed} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by room, roll number, or name..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={Colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.contentHeader}>
          <Text style={styles.sectionTitle}>Delivered Parcels</Text>
        </View>

        <Animated.FlatList
          data={filteredParcels}
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
              <Ionicons name="checkmark-done-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No parcels found' : 'No delivered parcels yet'}
              </Text>
            </View>
          }
        />
      </View>

      <Modal
        visible={studentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setStudentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Details</Text>
              <TouchableOpacity onPress={() => setStudentModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingStudent ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.accentBlue} />
              </View>
            ) : selectedStudent ? (
              <View style={styles.studentDetailsContainer}>
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="person" size={24} color={Colors.accentBlue} />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{selectedStudent.name}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="card" size={24} color={Colors.accentBlue} />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Roll Number</Text>
                    <Text style={styles.detailValue}>{selectedStudent.roll_number}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="mail" size={24} color={Colors.accentBlue} />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedStudent.email}</Text>
                  </View>
                </View>

                {selectedStudent.contact_number && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons name="call" size={24} color={Colors.accentBlue} />
                    </View>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Contact Number</Text>
                      <Text style={styles.detailValue}>{selectedStudent.contact_number}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="home" size={24} color={Colors.accentBlue} />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Room Number</Text>
                    <Text style={styles.detailValue}>{selectedStudent.room_number}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="business" size={24} color={Colors.accentBlue} />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Hostel</Text>
                    <Text style={styles.detailValue}>{selectedStudent.hostel_type}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={styles.noDataText}>No student data available</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    ...GlassInput,
    paddingHorizontal: 12,
    marginBottom: 8,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 19 : 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
    lineHeight: Platform.OS === 'android' ? 22 : 24,
    includeFontPadding: false,
    flexShrink: 1,
    marginRight: 12,
  },
  listContainer: {
    paddingBottom: 16,
  },
  parcelCard: {
    ...GlassCard,
    height: DELIVERED_STACK_CARD_HEIGHT,
    padding: 16,
    overflow: 'hidden',
  },
  parcelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  studentName: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  rollNumber: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  description: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  tapHint: {
    fontSize: 12,
    color: Colors.accentBlue,
    fontStyle: 'italic',
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
    color: Colors.textMuted,
    marginTop: 16,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accentRedDim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.accentRed,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  studentDetailsContainer: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  detailIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accentBlueDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  noDataText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 14,
    padding: 24,
  },
});
