import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import { Swipeable } from 'react-native-gesture-handler';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import api, { generateQrCode } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { Colors, Fonts, GlassCard, Radii } from '../../utils/theme';
import GlassTextInput from '../../components/GlassInput';
import SearchBar from '../../components/SearchBar';
import AppHeader from '../../components/AppHeader';
import ParcelRow from '../../components/ParcelRow';
import ParcelDetailSheet from '../../components/ParcelDetailSheet';
import StatCard from '../../components/StatCard';
import LabelAutoMatch from '../../components/LabelAutoMatch';
import { extractErrorMessage } from '../../utils/errorMessage';

type StatusFilter = 'ALL' | 'PENDING' | 'UNASSIGNED';

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

/**
 * A parcel row with a left-swipe quick action — for when the guard is sure and
 * wants to skip the detail sheet: PENDING reveals "Show QR", UNASSIGNED reveals
 * "Assign". Swiping past the threshold fires it directly.
 */
function SwipeRow({
  item,
  onOpenDetail,
  onShowQr,
  onAssign,
}: {
  item: Parcel;
  onOpenDetail: () => void;
  onShowQr: (parcel: Parcel) => void;
  onAssign: (parcel: Parcel) => void;
}) {
  const ref = useRef<Swipeable>(null);
  const isPending = item.status === 'PENDING';

  return (
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={44}
      overshootRight={false}
      renderRightActions={() => (
        <View style={[styles.swipeAction, isPending ? styles.swipeActionQr : styles.swipeActionAssign]}>
          <Ionicons name={isPending ? 'qr-code' : 'person-add'} size={20} color="#FFFFFF" />
          <Text style={styles.swipeActionText}>{isPending ? 'Show QR' : 'Assign'}</Text>
        </View>
      )}
      onSwipeableOpen={() => {
        ref.current?.close();
        if (isPending) onShowQr(item);
        else onAssign(item);
      }}
    >
      <ParcelRow parcel={item} onPress={onOpenDetail} />
    </Swipeable>
  );
}

export default function GuardDashboardIndex() {
  const router = useRouter();
  const { openAdd } = useLocalSearchParams<{ openAdd?: string }>();
  const { user, logout } = useAuthStore();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrString, setQrString] = useState('');
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [detailParcel, setDetailParcel] = useState<Parcel | null>(null);

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

  const counts = useMemo(() => {
    let pending = 0;
    let unassigned = 0;
    for (const p of parcels) {
      if (p.status === 'PENDING') pending += 1;
      else if (p.status === 'UNASSIGNED') unassigned += 1;
    }
    return { total: parcels.length, pending, unassigned };
  }, [parcels]);

  const filteredParcels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return parcels.filter((parcel) => {
      if (statusFilter !== 'ALL' && parcel.status !== statusFilter) return false;
      if (!q) return true;
      return (
        parcel.display_id?.toLowerCase().includes(q) ||
        parcel.room_number.toLowerCase().includes(q) ||
        parcel.roll_number?.toLowerCase().includes(q) ||
        parcel.student_name?.toLowerCase().includes(q)
      );
    });
  }, [parcels, searchQuery, statusFilter]);

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

  const renderParcelItem = ({ item }: { item: Parcel }) => (
    <SwipeRow
      item={item}
      onOpenDetail={() => setDetailParcel(item)}
      onShowQr={handleShowQR}
      onAssign={(p) => {
        setSelectedParcel(p);
        setAssignModalVisible(true);
      }}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Guard Desk"
        subtitle={`${user?.hostel_type ?? ''} Hostel · Receiving`}
        showBrand
        containerStyle={styles.header}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
        actions={[
          {
            icon: 'log-out-outline',
            color: Colors.accentRed,
            onPress: handleLogout,
            accessibilityLabel: 'Logout',
          },
        ]}
      />

      <View style={styles.content}>
        {/* Tappable overview — also filters the list */}
        <View style={styles.statStrip}>
          <StatCard
            label="On Desk"
            value={counts.total}
            icon="albums-outline"
            ink={Colors.accent}
            inkDim={Colors.accentDim}
            active={statusFilter === 'ALL'}
            onPress={() => setStatusFilter('ALL')}
          />
          <StatCard
            label="Pending"
            value={counts.pending}
            icon="time-outline"
            ink={Colors.pending}
            inkDim={Colors.accentAmberDim}
            active={statusFilter === 'PENDING'}
            onPress={() => setStatusFilter('PENDING')}
          />
          <StatCard
            label="Unassigned"
            value={counts.unassigned}
            icon="help-circle-outline"
            ink={Colors.unassigned}
            inkDim={Colors.unassignedBg}
            active={statusFilter === 'UNASSIGNED'}
            onPress={() => setStatusFilter('UNASSIGNED')}
          />
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by room, roll number, or name..."
          containerStyle={styles.searchContainer}
        />

        <View style={styles.contentHeader}>
          <Text style={styles.sectionKicker}>
            {statusFilter === 'ALL' ? 'All parcels' : statusFilter === 'PENDING' ? 'Awaiting pickup' : 'Needs assignment'}
          </Text>
          <Text style={styles.sectionCount}>{filteredParcels.length}</Text>
        </View>

        <FlatList
          data={filteredParcels}
          renderItem={renderParcelItem}
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
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No parcels found'
                  : statusFilter === 'PENDING'
                    ? 'No pending parcels'
                    : statusFilter === 'UNASSIGNED'
                      ? 'No unassigned parcels'
                      : 'No parcels to display'}
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
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  style={styles.bulkLink}
                  onPress={() => {
                    setAddModalVisible(false);
                    router.push('/guard-dashboard/bulk-intake' as Href);
                  }}
                >
                  <Ionicons name="layers-outline" size={16} color={Colors.accentBlue} />
                  <Text style={styles.bulkLinkText}>Bulk</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalForm}>
              <LabelAutoMatch
                containerStyle={styles.inputGroup}
                onApply={({ room_number, roll_number, student_name }) => {
                  if (room_number) setRoomNumber(room_number);
                  if (roll_number) setRollNumber(roll_number);
                  if (student_name) setStudentName(student_name);
                }}
              />

              <View style={styles.inputGroup}>
                <GlassTextInput
                  label="Room Number *"
                  inputType="numeric"
                  placeholder="e.g., 101"
                  value={roomNumber}
                  onChangeText={setRoomNumber}
                  containerStyle={styles.inputContainer}
                  labelStyle={styles.inputLabel}
                />
              </View>

              <View style={styles.inputGroup}>
                <GlassTextInput
                  label="Roll Number (Optional)"
                  inputType="text"
                  placeholder="e.g., 2021001"
                  value={rollNumber}
                  onChangeText={setRollNumber}
                  containerStyle={styles.inputContainer}
                  labelStyle={styles.inputLabel}
                />
              </View>

              <View style={styles.inputGroup}>
                <GlassTextInput
                  label="Student Name (Optional)"
                  inputType="text"
                  placeholder="Student name"
                  value={studentName}
                  onChangeText={setStudentName}
                  containerStyle={styles.inputContainer}
                  labelStyle={styles.inputLabel}
                />
              </View>

              <View style={styles.inputGroup}>
                <GlassTextInput
                  label="Description (Optional)"
                  inputType="text"
                  placeholder="Parcel description"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  containerStyle={styles.inputContainer}
                  inputContainerStyle={styles.textAreaContainer}
                  labelStyle={styles.inputLabel}
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
                <GlassTextInput
                  label="Room Number *"
                  inputType="numeric"
                  placeholder="e.g., 101"
                  value={editRoomNumber}
                  onChangeText={setEditRoomNumber}
                  containerStyle={styles.inputContainer}
                  labelStyle={styles.inputLabel}
                />
              </View>

              <View style={styles.inputGroup}>
                <GlassTextInput
                  label="Roll Number (Optional)"
                  inputType="text"
                  placeholder="Leave empty to unassign"
                  value={editRollNumber}
                  onChangeText={setEditRollNumber}
                  containerStyle={styles.inputContainer}
                  labelStyle={styles.inputLabel}
                />
              </View>

              <View style={styles.inputGroup}>
                <GlassTextInput
                  label="Student Name (Optional)"
                  inputType="text"
                  placeholder="Student name"
                  value={editStudentName}
                  onChangeText={setEditStudentName}
                  containerStyle={styles.inputContainer}
                  labelStyle={styles.inputLabel}
                />
              </View>

              <View style={styles.inputGroup}>
                <GlassTextInput
                  label="Description (Optional)"
                  inputType="text"
                  placeholder="Parcel description"
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={3}
                  containerStyle={styles.inputContainer}
                  inputContainerStyle={styles.textAreaContainer}
                  labelStyle={styles.inputLabel}
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
                <GlassTextInput
                  label="Roll Number *"
                  inputType="text"
                  placeholder="Enter roll number"
                  value={assignRollNumber}
                  onChangeText={setAssignRollNumber}
                  containerStyle={styles.inputContainer}
                  labelStyle={styles.inputLabel}
                />
              </View>

              <View style={styles.inputGroup}>
                <GlassTextInput
                  label="Room Number *"
                  inputType="numeric"
                  placeholder="Enter room number"
                  value={assignRoomNumber}
                  onChangeText={setAssignRoomNumber}
                  containerStyle={styles.inputContainer}
                  labelStyle={styles.inputLabel}
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAssignParcel}>
                <Text style={styles.submitButtonText}>Assign Parcel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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

      {/* Parcel detail sheet */}
      <ParcelDetailSheet parcel={detailParcel} onClose={() => setDetailParcel(null)}>
        <TouchableOpacity
          style={[styles.sheetBtn, styles.sheetBtnGhost]}
          onPress={() => {
            const p = detailParcel;
            setDetailParcel(null);
            if (p) openEditParcelModal(p);
          }}
        >
          <Ionicons name="create-outline" size={18} color={Colors.textPrimary} />
          <Text style={styles.sheetBtnGhostText}>Edit</Text>
        </TouchableOpacity>

        {detailParcel?.status === 'UNASSIGNED' && (
          <TouchableOpacity
            style={[styles.sheetBtn, styles.sheetBtnPrimary]}
            onPress={() => {
              const p = detailParcel;
              setDetailParcel(null);
              if (p) {
                setSelectedParcel(p);
                setAssignModalVisible(true);
              }
            }}
          >
            <Ionicons name="person-add" size={18} color="#FFFFFF" />
            <Text style={styles.sheetBtnPrimaryText}>Assign</Text>
          </TouchableOpacity>
        )}

        {detailParcel?.status === 'PENDING' && (
          <TouchableOpacity
            style={[styles.sheetBtn, styles.sheetBtnPrimary]}
            onPress={() => {
              const p = detailParcel;
              setDetailParcel(null);
              if (p) handleShowQR(p);
            }}
          >
            <Ionicons name="qr-code" size={18} color="#FFFFFF" />
            <Text style={styles.sheetBtnPrimaryText}>Show QR</Text>
          </TouchableOpacity>
        )}
      </ParcelDetailSheet>
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
  statStrip: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  searchContainer: {
    marginBottom: 12,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionKicker: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
  sectionCount: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
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
  swipeAction: {
    width: 92,
    marginLeft: 8,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeActionQr: {
    backgroundColor: Colors.accent,
  },
  swipeActionAssign: {
    backgroundColor: Colors.accentBlue,
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  parcelCard: {
    ...GlassCard,
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
  sheetBtn: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  sheetBtnGhost: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceBorder,
  },
  sheetBtnGhostText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  sheetBtnPrimary: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  sheetBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderBottomWidth: 0,
    paddingTop: 14,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bulkLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.lg,
    backgroundColor: Colors.accentBlueDim,
  },
  bulkLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accentBlue,
  },
  modalForm: {
    paddingHorizontal: 24,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  textAreaContainer: {
    minHeight: 88,
    alignItems: 'flex-start',
  },
  textInput: {
    backgroundColor: Colors.surfaceHover,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
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
