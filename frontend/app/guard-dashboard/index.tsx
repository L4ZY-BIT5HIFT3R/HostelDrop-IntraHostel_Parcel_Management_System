import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api, { generateQrCode } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { Colors, GlassCard, GlassInput } from '../../utils/theme';
import AnimatedCard, { STACK_CARD_HEIGHT, STACK_CARD_SPACING, STACK_FOCUS_OFFSET } from '../../components/AnimatedCard';
import { extractErrorMessage } from '../../utils/errorMessage';

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
  student_email?: string;
}

export default function GuardDashboardIndex() {
  const router = useRouter();
  const { openAdd } = useLocalSearchParams<{ openAdd?: string }>();
  const { user, logout } = useAuthStore();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<Parcel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrString, setQrString] = useState('');
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [enteredOTP, setEnteredOTP] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [listHeight, setListHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Add Parcel Form
  const [roomNumber, setRoomNumber] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [description, setDescription] = useState('');

  // Assign Parcel Form
  const [assignRollNumber, setAssignRollNumber] = useState('');
  const [assignRoomNumber, setAssignRoomNumber] = useState('');
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editStudentName, setEditStudentName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    fetchParcels();
  }, []);

  useEffect(() => {
    if (openAdd === '1') {
      setAddModalVisible(true);
      router.replace('/guard-dashboard');
    }
  }, [openAdd, router]);

  const fetchParcels = async () => {
    try {
      const response = await api.get('/parcel/guard/pending');
      setParcels(response.data.parcels);
      setFilteredParcels(response.data.parcels);
    } catch {
      Alert.alert('Unable to load parcels', 'Please refresh or login again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchParcels();
  };

  const getStackPadding = (height: number) => ({
    top: Math.max(4, (height - STACK_CARD_HEIGHT) / 2 - STACK_FOCUS_OFFSET - 12),
    bottom: Math.max(120, (height - STACK_CARD_HEIGHT) / 2 + STACK_FOCUS_OFFSET + 96),
  });

  const updateActiveIndex = (offsetY: number, viewportHeight?: number) => {
    const height = viewportHeight ?? listHeight;
    if (height <= 0 || filteredParcels.length === 0) return;
    const step = STACK_CARD_HEIGHT + STACK_CARD_SPACING;
    const { top } = getStackPadding(height);
    const centerY = offsetY + height / 2;
    const rawIndex = (centerY - top - STACK_CARD_HEIGHT / 2) / step;
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
        const idMatch = parcel.display_id?.toLowerCase().includes(lowercaseQuery);
        const roomMatch = parcel.room_number.toLowerCase().includes(lowercaseQuery);
        const rollMatch = parcel.roll_number?.toLowerCase().includes(lowercaseQuery);
        const nameMatch = parcel.student_name?.toLowerCase().includes(lowercaseQuery);
        return idMatch || roomMatch || rollMatch || nameMatch;
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
      Alert.alert('Error', extractErrorMessage(error, 'Failed to add parcel'));
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

    try {
      await api.put('/parcel/assign', {
        parcel_id: selectedParcel._id,
        roll_number: assignRollNumber.trim(),
        hostel_type: user?.hostel_type,
        room_number: assignRoomNumber.trim(),
      });

      Alert.alert('Success', 'Parcel assigned successfully');
      setAssignModalVisible(false);
      setSelectedParcel(null);
      setAssignRollNumber('');
      setAssignRoomNumber('');
      fetchParcels();
    } catch (error: any) {
      const errorMsg = extractErrorMessage(error, 'Failed to assign parcel');
      Alert.alert('Error', errorMsg);
    }
  };

  const handleShowQR = async (parcel: Parcel) => {
    try {
      const response = await generateQrCode(parcel._id);
      const token = response.token;

      const payload = JSON.stringify({
        parcel_id: parcel._id,
        token: token,
      });

      setQrString(payload);
      setSelectedParcel(parcel);
      setQrModalVisible(true);
    } catch (error: any) {
      Alert.alert('Error', extractErrorMessage(error, 'Failed to generate QR code.'));
    }
  };

  const openEditParcelModal = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setEditRoomNumber(parcel.room_number || '');
    setEditRollNumber(parcel.roll_number || '');
    setEditStudentName(parcel.student_name || '');
    setEditDescription(parcel.description || '');
    setEditModalVisible(true);
  };

  const handleUpdateParcel = async () => {
    if (!selectedParcel?._id) {
      Alert.alert('Error', 'No parcel selected');
      return;
    }
    if (!editRoomNumber.trim()) {
      Alert.alert('Error', 'Room number is required');
      return;
    }

    try {
      await api.put('/parcel/update', {
        parcel_id: selectedParcel._id,
        room_number: editRoomNumber.trim(),
        roll_number: editRollNumber.trim() || null,
        student_name: editStudentName.trim() || null,
        description: editDescription.trim() || null,
      });
      Alert.alert('Success', 'Parcel updated successfully');
      setEditModalVisible(false);
      setSelectedParcel(null);
      setEditRoomNumber('');
      setEditRollNumber('');
      setEditStudentName('');
      setEditDescription('');
      fetchParcels();
    } catch (error: any) {
      Alert.alert('Error', extractErrorMessage(error, 'Failed to update parcel'));
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
      fetchParcels();
    } catch (error: any) {
      const msg = extractErrorMessage(error, 'Invalid OTP. Try again.');
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

  const renderParcelItem = ({ item, index }: { item: Parcel; index: number }) => {
    const isUnassigned = item.status === 'UNASSIGNED';
    const isPending = item.status === 'PENDING';

    return (
      <AnimatedCard index={index} activeIndex={activeIndex} scrollY={scrollY}>
        <View style={styles.parcelCard}>
          <View style={styles.parcelHeader}>
            <View style={{ flex: 1 }}>
              {item.display_id ? (
                <View style={{ backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.5 }}>{item.display_id}</Text>
                </View>
              ) : null}
              <View style={styles.parcelInfo}>
                <Text style={styles.roomNumber}>Room {item.room_number}</Text>
                <View style={[styles.statusBadge, isPending ? styles.pendingBadge : styles.unassignedBadge]}>
                  <Text style={[styles.statusText, isPending ? styles.pendingText : styles.unassignedText]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>

          {item.student_name && (
            <View style={styles.studentInfo}>
              <Ionicons name="person" size={16} color={Colors.textMuted} />
              <Text style={styles.studentName}>{item.student_name}</Text>
              {item.roll_number && <Text style={styles.rollNumber}>({item.roll_number})</Text>}
            </View>
          )}

          {item.description && (
            <Text style={styles.description}>{item.description}</Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => openEditParcelModal(item)}
            >
              <Ionicons name="create-outline" size={18} color={Colors.accent} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>

            {isUnassigned && (
              <TouchableOpacity
                style={[styles.actionButton, styles.assignButton]}
                onPress={() => {
                  setSelectedParcel(item);
                  setAssignModalVisible(true);
                }}
              >
                <Ionicons name="person-add" size={18} color={Colors.accentBlue} />
                <Text style={styles.assignButtonText}>Assign</Text>
              </TouchableOpacity>
            )}

            {isPending && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.qrButton]}
                  onPress={() => handleShowQR(item)}
                >
                  <Ionicons name="qr-code" size={18} color={Colors.accent} />
                  <Text style={styles.qrButtonText}>Show QR</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </AnimatedCard>
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
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Guard Dashboard</Text>
          <Text style={styles.headerSubtitle}>{user?.hostel_type} Hostel</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.accentRed} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
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
          <Text style={styles.sectionTitle}>Pending & Unassigned Parcels</Text>
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
            { useNativeDriver: Platform.OS !== 'web' }
          )}
          scrollEventThrottle={16}
          snapToInterval={STACK_CARD_HEIGHT + STACK_CARD_SPACING}
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
                <Ionicons name="close" size={24} color={Colors.textMuted} />
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
                  placeholderTextColor={Colors.textMuted}
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

      {/* Edit Parcel Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Parcel</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Room Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 101"
                  value={editRoomNumber}
                  onChangeText={setEditRoomNumber}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Roll Number (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Leave empty to unassign"
                  value={editRollNumber}
                  onChangeText={setEditRollNumber}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Student Name (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Student name"
                  value={editStudentName}
                  onChangeText={setEditStudentName}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Parcel description"
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleUpdateParcel}>
                <Text style={styles.submitButtonText}>Save Changes</Text>
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
                <Ionicons name="close" size={24} color={Colors.textMuted} />
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
                <Ionicons name="close" size={24} color={Colors.textMuted} />
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
                  <Ionicons name="alert-circle" size={16} color={Colors.accentRed} />
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

      {/* QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan to Claim Parcel</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalForm, { alignItems: 'center', paddingBottom: 20 }]}>
              {qrString ? (
                <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12 }}>
                  <QRCode 
                    value={qrString} 
                    size={250} 
                    backgroundColor="#ffffff"
                    color="#111827"
                  />
                </View>
              ) : (
                <Text style={{ color: Colors.textSecondary }}>Generating QR Code...</Text>
              )}
              <Text style={{ marginTop: 24, textAlign: 'center', color: Colors.textSecondary }}>
                Ask the student to scan this QR code using their HostelDrop app to verify pickup.
              </Text>
              <TouchableOpacity 
                style={[styles.submitButton, { width: '100%', marginTop: 32 }]} 
                onPress={() => {
                  setQrModalVisible(false);
                  fetchParcels(); // Refresh in case student scanned it
                }}
              >
                <Text style={styles.submitButtonText}>Done</Text>
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
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
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
    color: Colors.textPrimary,
    letterSpacing: 0.2,
    lineHeight: Platform.OS === 'android' ? 24 : 26,
    includeFontPadding: false,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    ...GlassInput,
    paddingHorizontal: 12,
    marginBottom: 12,
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
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 19 : 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
    lineHeight: Platform.OS === 'android' ? 22 : 24,
    includeFontPadding: false,
    flexShrink: 1,
  },
  listContainer: {
    paddingBottom: 16,
  },
  parcelCard: {
    ...GlassCard,
    height: STACK_CARD_HEIGHT,
    padding: 16,
    overflow: 'hidden',
  },
  parcelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unassignedBadge: {
    backgroundColor: Colors.accentAmberDim,
  },
  pendingBadge: {
    backgroundColor: Colors.pendingBg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unassignedText: {
    color: Colors.accentAmber,
  },
  pendingText: {
    color: Colors.pending,
  },
  date: {
    fontSize: 12,
    color: Colors.textMuted,
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
    borderColor: 'rgba(96,165,250,0.3)',
    backgroundColor: Colors.accentBlueDim,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accentBlue,
  },
  editButton: {
    borderColor: 'rgba(129,140,248,0.3)',
    backgroundColor: Colors.accentDim,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  otpButton: {
    borderColor: 'rgba(52,211,153,0.3)',
    backgroundColor: Colors.accentGreenDim,
  },
  otpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accentGreen,
  },
  qrButton: {
    borderColor: 'rgba(129,140,248,0.3)',
    backgroundColor: Colors.accentDim,
  },
  qrButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderBottomWidth: 0,
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
    color: '#FFFFFF',
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
    color: '#D1D5DB',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.accentBlue,
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
    backgroundColor: Colors.accentRedDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  inlineErrorText: {
    color: Colors.accentRed,
    fontSize: 12,
    flex: 1,
  },
  otpInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
});
