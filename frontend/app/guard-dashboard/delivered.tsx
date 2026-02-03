import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import api from '../../utils/api';
import ErrorPopup from '../../components/ErrorPopup';

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
  delivered_at?: string;
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

export default function DeliveredParcels() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<Parcel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isFocused = useIsFocused();

  useEffect(() => {
    fetchParcels();
  }, []);

  // Re-fetch when tab gains focus so newly delivered items appear
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
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchParcels();
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
      setErrorVisible(true);
    } finally {
      setLoadingStudent(false);
    }
  };

  const renderParcelItem = ({ item }: { item: Parcel }) => (
    <TouchableOpacity
      style={styles.parcelCard}
      onPress={() => item.student_id && fetchStudentDetails(item.student_id)}
      activeOpacity={item.student_id ? 0.7 : 1}
    >
      <View style={styles.parcelHeader}>
        <View style={styles.parcelInfo}>
          <Text style={styles.roomNumber}>Room {item.room_number}</Text>
          <View style={styles.deliveredBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text style={styles.deliveredText}>Delivered</Text>
          </View>
        </View>
        {item.student_id && (
          <Ionicons name="information-circle-outline" size={24} color="#2563EB" />
        )}
      </View>

      {item.student_name && (
        <View style={styles.studentInfo}>
          <Ionicons name="person" size={16} color="#6B7280" />
          <Text style={styles.studentName}>{item.student_name}</Text>
          {item.roll_number && <Text style={styles.rollNumber}>({item.roll_number})</Text>}
        </View>
      )}

      {item.description && (
        <Text style={styles.description}>{item.description}</Text>
      )}

      <View style={styles.dateInfo}>
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Logged:</Text>
          <Text style={styles.dateValue}>
            {new Date(item.created_at).toLocaleDateString()} at{' '}
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {item.delivered_at && (
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Delivered:</Text>
            <Text style={styles.dateValue}>
              {new Date(item.delivered_at).toLocaleDateString()} at{' '}
              {new Date(item.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>

      {item.student_id && (
        <Text style={styles.tapHint}>Tap to view student details</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by room, roll number, or name..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.contentHeader}>
          <Text style={styles.sectionTitle}>Delivered Parcels</Text>
        </View>

        <FlatList
          data={filteredParcels}
          renderItem={renderParcelItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No parcels found' : 'No delivered parcels yet'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Student Details Modal */}
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
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {loadingStudent ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
              </View>
            ) : selectedStudent ? (
              <View style={styles.studentDetailsContainer}>
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="person" size={24} color="#2563EB" />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{selectedStudent.name}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="card" size={24} color="#2563EB" />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Roll Number</Text>
                    <Text style={styles.detailValue}>{selectedStudent.roll_number}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="mail" size={24} color="#2563EB" />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedStudent.email}</Text>
                  </View>
                </View>

                {selectedStudent.contact_number && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons name="call" size={24} color="#2563EB" />
                    </View>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Contact Number</Text>
                      <Text style={styles.detailValue}>{selectedStudent.contact_number}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="home" size={24} color="#2563EB" />
                  </View>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Room Number</Text>
                    <Text style={styles.detailValue}>{selectedStudent.room_number}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="business" size={24} color="#2563EB" />
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

      {/* Error Popup */}
      <ErrorPopup
        visible={errorVisible}
        message={errorMessage}
        onClose={() => setErrorVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 19 : 20,
    fontWeight: '700',
    color: '#111827',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    color: '#111827',
  },
  deliveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F0FDF4',
  },
  deliveredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  studentName: {
    fontSize: 14,
    color: '#374151',
  },
  rollNumber: {
    fontSize: 12,
    color: '#6B7280',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  dateInfo: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    gap: 6,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  dateValue: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  tapHint: {
    fontSize: 12,
    color: '#2563EB',
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
    color: '#9CA3AF',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
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
    color: '#111827',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  detailIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
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
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
  },
  noDataText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    padding: 24,
  },
});
