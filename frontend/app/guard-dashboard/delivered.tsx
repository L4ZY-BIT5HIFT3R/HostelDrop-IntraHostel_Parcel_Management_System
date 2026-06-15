import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import api from '../../utils/api';
import { Colors, Fonts, Radii } from '../../utils/theme';
import SearchBar from '../../components/SearchBar';
import ParcelRow from '../../components/ParcelRow';
import ParcelDetailSheet from '../../components/ParcelDetailSheet';
import { extractErrorMessage } from '../../utils/errorMessage';

function Field({
  icon,
  label,
  value,
  half,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  half?: boolean;
}) {
  return (
    <View style={[styles.field, half && styles.fieldHalf]}>
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={15} color={Colors.accent} />
      </View>
      <View style={styles.fieldText}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue} numberOfLines={1}>{value || '—'}</Text>
      </View>
    </View>
  );
}

interface Parcel {
  _id: string;
  display_id?: string;
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
  collected_by_delegate?: boolean;
  delegated_receiver_student_id?: string | null;
  delegated_receiver_info?: {
    student_id?: string;
    name?: string;
    email?: string;
    roll_number?: string;
    room_number?: string;
    hostel_type?: string;
  } | null;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [detailParcel, setDetailParcel] = useState<Parcel | null>(null);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [studentModalTitle, setStudentModalTitle] = useState('Student Details');
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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

  const filteredParcels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return parcels;
    return parcels.filter((parcel) =>
      parcel.display_id?.toLowerCase().includes(q) ||
      parcel.room_number.toLowerCase().includes(q) ||
      parcel.roll_number?.toLowerCase().includes(q) ||
      parcel.student_name?.toLowerCase().includes(q)
    );
  }, [parcels, searchQuery]);

  const fetchStudentDetails = async (studentId: string) => {
    setSelectedStudent(null);
    setStudentModalTitle('Student Details');
    setStudentModalVisible(true);
    setLoadingStudent(true);
    try {
      const response = await api.get(`/student/${studentId}`);
      setSelectedStudent(response.data.student);
    } catch (error: any) {
      console.error('Error fetching student details:', error?.response?.status, error?.response?.data || error?.message);
      setStudentModalVisible(false);
      setErrorMessage(extractErrorMessage(error, 'Failed to fetch student details'));
    } finally {
      setLoadingStudent(false);
    }
  };

  const openDelegationReceiverDetails = (parcel: Parcel) => {
    const receiver = parcel.delegated_receiver_info;
    if (!parcel.collected_by_delegate) {
      return;
    }
    if (!receiver) {
      setErrorMessage('Delegation receiver details are unavailable for this parcel.');
      return;
    }

    setSelectedStudent({
      _id: receiver.student_id || parcel.delegated_receiver_student_id || '',
      name: receiver.name || 'Unknown',
      email: receiver.email || 'Not available',
      roll_number: receiver.roll_number || 'Not available',
      room_number: receiver.room_number || 'Not available',
      hostel_type: receiver.hostel_type || parcel.hostel_type,
      contact_number: undefined,
    });
    setStudentModalTitle('Delegation Receiver');
    setStudentModalVisible(true);
    setLoadingStudent(false);
  };

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

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by room, roll number, or name..."
          containerStyle={styles.searchContainer}
        />

        <View style={styles.contentHeader}>
          <Text style={styles.sectionKicker}>Collected & handed over</Text>
          <Text style={styles.sectionCount}>{filteredParcels.length}</Text>
        </View>

        <FlatList
          data={filteredParcels}
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
              <Ionicons name="checkmark-done-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No parcels found' : 'No delivered parcels yet'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Compact row → expanded detail sheet (same pattern as pending parcels) */}
      <ParcelDetailSheet parcel={detailParcel} onClose={() => setDetailParcel(null)}>
        {detailParcel?.collected_by_delegate && (
          <TouchableOpacity
            style={[styles.sheetBtn, styles.sheetBtnGhost]}
            onPress={() => {
              const p = detailParcel;
              setDetailParcel(null);
              if (p) openDelegationReceiverDetails(p);
            }}
          >
            <Ionicons name="people-outline" size={18} color={Colors.accentGreen} />
            <Text style={styles.sheetBtnGhostText}>Delegation Receiver</Text>
          </TouchableOpacity>
        )}

        {detailParcel?.student_id && (
          <TouchableOpacity
            style={[styles.sheetBtn, styles.sheetBtnPrimary]}
            onPress={() => {
              const id = detailParcel?.student_id;
              setDetailParcel(null);
              if (id) fetchStudentDetails(id);
            }}
          >
            <Ionicons name="person-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.sheetBtnPrimaryText}>Student Details</Text>
          </TouchableOpacity>
        )}
      </ParcelDetailSheet>

      {/* Student / delegation receiver dossier */}
      <Modal
        visible={studentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setStudentModalVisible(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setStudentModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.grabber} />

            {loadingStudent ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={styles.loadingText}>Loading details…</Text>
              </View>
            ) : selectedStudent ? (
              <>
                <View style={styles.identityRow}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={26} color={Colors.accent} />
                  </View>
                  <View style={styles.identityText}>
                    <Text style={styles.identityName} numberOfLines={1}>{selectedStudent.name}</Text>
                    <Text style={styles.identityRoll}>{selectedStudent.roll_number}</Text>
                  </View>
                  <Pressable onPress={() => setStudentModalVisible(false)} hitSlop={10}>
                    <Ionicons name="close" size={22} color={Colors.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.recordStamp}>
                  <Ionicons
                    name={studentModalTitle === 'Delegation Receiver' ? 'people-outline' : 'id-card-outline'}
                    size={12}
                    color={Colors.accent}
                  />
                  <Text style={styles.recordStampText}>{studentModalTitle.toUpperCase()}</Text>
                </View>

                <View style={styles.fieldList}>
                  <Field icon="mail-outline" label="Email" value={selectedStudent.email} />
                  {selectedStudent.contact_number ? (
                    <Field icon="call-outline" label="Contact" value={selectedStudent.contact_number} />
                  ) : null}
                  <View style={styles.fieldRowSplit}>
                    <Field icon="home-outline" label="Room" value={selectedStudent.room_number} half />
                    <Field icon="business-outline" label="Hostel" value={selectedStudent.hostel_type} half />
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.noDataText}>No details available</Text>
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
    paddingTop: 8,
    paddingBottom: 16,
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
  listContainer: {
    paddingBottom: 16,
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
    backgroundColor: Colors.accentBlue,
    borderColor: Colors.accentBlue,
  },
  sheetBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceBorder,
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 44,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
  },
  identityName: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  identityRoll: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.accent,
    marginTop: 3,
  },
  recordStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1.2,
    borderColor: Colors.accent,
    borderRadius: 3,
    transform: [{ rotate: '-2deg' }],
    opacity: 0.92,
  },
  recordStampText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: Colors.accent,
  },
  fieldList: {
    marginTop: 18,
    gap: 10,
  },
  fieldRowSplit: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radii.lg,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldText: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: Fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  noDataText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 14,
    paddingVertical: 32,
  },
});
