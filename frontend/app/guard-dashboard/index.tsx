import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

interface Parcel {
  _id: string;
  hostel_type: string;
  room_number: string;
  status: string;
  student_name?: string;
  roll_number?: string;
  description?: string;
  created_at: string;
  student_email?: string;
}

export default function GuardDashboardIndex() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<Parcel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [enteredOTP, setEnteredOTP] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Add Parcel Form
  const [roomNumber, setRoomNumber] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [description, setDescription] = useState('');

  // Assign Parcel Form
  const [assignRollNumber, setAssignRollNumber] = useState('');
  const [assignRoomNumber, setAssignRoomNumber] = useState('');

  useEffect(() => {
    fetchParcels();
  }, []);

  const fetchParcels = async () => {
    try {
      const response = await api.get('/parcel/guard/pending');
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

  const handleAddParcel = async () => {
    if (!roomNumber.trim()) {
      Alert.alert('Error', 'Room number is required');
      return;
    }

    try {
      await api.post('/parcel/add', {
        hostel_type: user?.hostel_type,
        room_number: roomNumber.trim(),
        roll_number: rollNumber.trim() || null,
        student_name: studentName.trim() || null,
        description: description.trim() || null,
      });

      Alert.alert('Success', 'Parcel added successfully');
      setAddModalVisible(false);
      resetAddForm();
      fetchParcels();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add parcel');
    }
  };

  const resetAddForm = () => {
    setRoomNumber('');
    setRollNumber('');
    setStudentName('');
    setDescription('');
  };

  const handleAssignParcel = async () => {
    if (!assignRollNumber.trim() || !assignRoomNumber.trim()) {
      Alert.alert('Error', 'Roll number and room number are required');
      return;
    }

    if (!selectedParcel?._id) {
      Alert.alert('Error', 'No parcel selected');
      return;
    }

    setLoading(true);
    try {
      console.log('Assigning parcel:', {
        parcel_id: selectedParcel._id,
        roll_number: assignRollNumber.trim(),
        hostel_type: user?.hostel_type,
        room_number: assignRoomNumber.trim(),
      });

      const response = await api.put('/parcel/assign', {
        parcel_id: selectedParcel._id,
        roll_number: assignRollNumber.trim(),
        hostel_type: user?.hostel_type,
        room_number: assignRoomNumber.trim(),
      });

      console.log('Assign response:', response.data);
      Alert.alert('Success', 'Parcel assigned successfully');
      setAssignModalVisible(false);
      setSelectedParcel(null);
      setAssignRollNumber('');
      setAssignRoomNumber('');
      fetchParcels();
    } catch (error: any) {
      console.error('Assign error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to assign parcel';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (parcel: Parcel) => {
    try {
      const response = await api.post('/parcel/send-otp', {
        parcel_id: parcel._id,
      });

      setGeneratedOTP(response.data.otp); // For development
      setSelectedParcel(parcel);
      setEnteredOTP('');
      setErrorMessage('');
      setOtpModalVisible(true);
      Alert.alert('OTP Sent', `OTP sent to ${response.data.email}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    if (errorMessage) {
      setErrorMessage('');
    }
    if (!enteredOTP.trim()) {
      setErrorMessage('Please enter OTP');
      return;
    }

    try {
      await api.post('/parcel/verify-otp', {
        parcel_id: selectedParcel?._id,
        otp_code: enteredOTP.trim(),
      });

      Alert.alert('Success', 'Parcel delivered successfully');
      setOtpModalVisible(false);
      setSelectedParcel(null);
      setEnteredOTP('');
      setGeneratedOTP('');
      fetchParcels();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Invalid OTP. Try again.';
      setErrorMessage(msg);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/role-selection');
        },
      },
    ]);
  };

  const renderParcelItem = ({ item }: { item: Parcel }) => {
    const isUnassigned = item.status === 'UNASSIGNED';
    const isPending = item.status === 'PENDING';

    return (
      <View style={styles.parcelCard}>
        <View style={styles.parcelHeader}>
          <View style={styles.parcelInfo}>
            <Text style={styles.roomNumber}>Room {item.room_number}</Text>
            <View style={[styles.statusBadge, isUnassigned ? styles.unassignedBadge : styles.pendingBadge]}>
              <Text style={[styles.statusText, isUnassigned ? styles.unassignedText : styles.pendingText]}>
                {item.status}
              </Text>
            </View>
          </View>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
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

        <View style={styles.actions}>
          {isUnassigned && (
            <TouchableOpacity
              style={[styles.actionButton, styles.assignButton]}
              onPress={() => {
                setSelectedParcel(item);
                setAssignModalVisible(true);
              }}
            >
              <Ionicons name="person-add" size={18} color="#2563EB" />
              <Text style={styles.assignButtonText}>Assign</Text>
            </TouchableOpacity>
          )}

          {isPending && (
            <TouchableOpacity
              style={[styles.actionButton, styles.otpButton]}
              onPress={() => handleSendOTP(item)}
            >
              <Ionicons name="key" size={18} color="#16A34A" />
              <Text style={styles.otpButtonText}>Send OTP</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={async () => {
            await logout();
            router.replace('/role-selection');
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Guard Dashboard</Text>
          <Text style={styles.headerSubtitle}>{user?.hostel_type} Hostel</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#DC2626" />
        </TouchableOpacity>
      </View>

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
          <Text style={styles.sectionTitle}>Pending & Unassigned Parcels</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setAddModalVisible(true)}
          >
            <Ionicons name="add-circle" size={24} color="#2563EB" />
            <Text style={styles.addButtonText}>Add Parcel</Text>
          </TouchableOpacity>
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
              <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No parcels found' : 'No parcels to display'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Add Parcel Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Parcel</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Room Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 101"
                  value={roomNumber}
                  onChangeText={setRoomNumber}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Roll Number (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 2021001"
                  value={rollNumber}
                  onChangeText={setRollNumber}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Student Name (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Student name"
                  value={studentName}
                  onChangeText={setStudentName}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Parcel description"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAddParcel}>
                <Text style={styles.submitButtonText}>Add Parcel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Assign Parcel Modal */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Parcel</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Roll Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter roll number"
                  value={assignRollNumber}
                  onChangeText={setAssignRollNumber}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Room Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter room number"
                  value={assignRoomNumber}
                  onChangeText={setAssignRoomNumber}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAssignParcel}>
                <Text style={styles.submitButtonText}>Assign Parcel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* OTP Verification Modal */}
      <Modal
        visible={otpModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setOtpModalVisible(false);
          setEnteredOTP('');
          setErrorMessage('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify OTP</Text>
              <TouchableOpacity
                onPress={() => {
                  setOtpModalVisible(false);
                  setEnteredOTP('');
                  setErrorMessage('');
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.otpInfo}>
                OTP has been sent to student&apos;s email. Ask student to provide the OTP.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Enter OTP</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="6-digit OTP"
                  value={enteredOTP}
                  onChangeText={setEnteredOTP}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {errorMessage ? (
                <View style={styles.inlineError}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.inlineErrorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity style={styles.submitButton} onPress={handleVerifyOTP}>
                <Text style={styles.submitButtonText}>Verify & Deliver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: Platform.OS === 'android' ? 20 : 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.2,
    lineHeight: Platform.OS === 'android' ? 24 : 26,
    includeFontPadding: false,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
    lineHeight: 18,
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unassignedBadge: {
    backgroundColor: '#FEF3C7',
  },
  pendingBadge: {
    backgroundColor: '#DBEAFE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unassignedText: {
    color: '#D97706',
  },
  pendingText: {
    color: '#2563EB',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
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
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  assignButton: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  otpButton: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  otpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A',
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalForm: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  inlineErrorText: {
    color: '#B91C1C',
    fontSize: 12,
    flex: 1,
  },
  otpInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
});
