import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api, { verifyQrCode, generateDelegationCode } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

interface Parcel {
  _id: string;
  display_id?: string;
  hostel_type: string;
  room_number: string;
  status: string;
  student_name?: string;
  roll_number?: string;
  description?: string;
  student_id?: string;
  created_at: string;
}

export default function StudentDashboardIndex() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<Parcel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [scanning, setScanning] = useState(false);
  const [processingScan, setProcessingScan] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  
  const [showDelegateInput, setShowDelegateInput] = useState(false);
  const [delegatePin, setDelegatePin] = useState('');

  useEffect(() => {
    fetchParcels();
  }, []);

  const fetchParcels = async () => {
    try {
      const response = await api.get(`/parcel/hostel/${user?.hostel_type}`);
      // Filter only PENDING parcels for students
      const pendingParcels = response.data.parcels.filter(
        (p: Parcel) => ['PENDING', 'UNASSIGNED'].includes(p.status)
      );
      setParcels(pendingParcels);
      setFilteredParcels(pendingParcels);
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
        const idMatch = parcel.display_id?.toLowerCase().includes(lowercaseQuery);
        const roomMatch = parcel.room_number.toLowerCase().includes(lowercaseQuery);
        const rollMatch = parcel.roll_number?.toLowerCase().includes(lowercaseQuery);
        const nameMatch = parcel.student_name?.toLowerCase().includes(lowercaseQuery);
        return idMatch || roomMatch || rollMatch || nameMatch;
      });
      setFilteredParcels(filtered);
    }
  };

  const handleStartScan = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to scan QR codes.');
        return;
      }
    }
    setScanning(true);
  };

  const handleDelegatePickup = async (parcelId: string) => {
    try {
      const data = await generateDelegationCode(parcelId);
      Alert.alert(
        'Delegation Code Generated',
        `Give this 6-character PIN to your friend so they can pick up your parcel:\n\n${data.delegation_code}\n\nValid for 10 minutes.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to generate code.');
    }
  };

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (processingScan) return;
    setProcessingScan(true);
    setScanning(false);
    try {
      const payload = JSON.parse(data);
      if (!payload.parcel_id || !payload.token) {
        Alert.alert('Invalid QR Code', 'This QR code is not valid for HostelDrop.');
        setProcessingScan(false);
        return;
      }
      
      await verifyQrCode(payload.parcel_id, payload.token, showDelegateInput && delegatePin ? delegatePin : undefined);
      Alert.alert('🎉 Success!', 'Parcel claimed successfully! You may now take your package.');
      setDelegatePin('');
      setShowDelegateInput(false);
      fetchParcels();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to verify QR code.');
    } finally {
      setProcessingScan(false);
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
    <View style={styles.parcelCard}>
      <View style={styles.parcelHeader}>
        <View style={{ flex: 1 }}>
          {item.display_id ? (
            <View style={{ backgroundColor: '#F3F4F6', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#4B5563', letterSpacing: 0.5 }}>{item.display_id}</Text>
            </View>
          ) : null}
          <View style={styles.parcelInfo}>
            <Text style={styles.roomNumber}>Room {item.room_number}</Text>
            <View style={[styles.pendingBadge, item.status === 'UNASSIGNED' && { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.pendingText, item.status === 'UNASSIGNED' && { color: '#DC2626' }]}>
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
          <Ionicons name="person" size={16} color="#6B7280" />
          <Text style={styles.studentName}>{item.student_name}</Text>
          {item.roll_number && <Text style={styles.rollNumber}>({item.roll_number})</Text>}
        </View>
      )}

      {item.description && (
        <Text style={styles.description}>{item.description}</Text>
      )}

      {item.student_id === user?._id && item.status === 'PENDING' && (
        <TouchableOpacity
          style={styles.delegateButton}
          onPress={() => handleDelegatePickup(item._id)}
        >
          <Ionicons name="people-outline" size={16} color="#FFF" />
          <Text style={styles.delegateButtonText}>Delegate Pickup to Friend</Text>
        </TouchableOpacity>
      )}
    </View>
  );

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
          <Text style={styles.headerTitle}>All Parcels</Text>
          <Text style={styles.headerSubtitle}>{user?.hostel_type} Hostel</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
        <TouchableOpacity style={styles.scanButton} onPress={() => { setShowDelegateInput(false); handleStartScan(); }}>
          <Ionicons name="qr-code-outline" size={24} color="#FFF" />
          <Text style={styles.scanButtonText}>Scan to Pickup My Parcel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.scanButton, { marginTop: 12, backgroundColor: '#4F46E5' }]} onPress={() => { setShowDelegateInput(true); handleStartScan(); }}>
          <Ionicons name="people-outline" size={24} color="#FFF" />
          <Text style={styles.scanButtonText}>Pickup for a Friend</Text>
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
                {searchQuery ? 'No parcels found' : 'No parcels available'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Full Screen Camera Modal */}
      {scanning && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity 
                  style={styles.closeCameraButton} 
                  onPress={() => { setScanning(false); setShowDelegateInput(false); setDelegatePin(''); }}
                >
                  <Ionicons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.cameraOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanInstruction}>
                  Point at the Guard's QR code
                </Text>
                {showDelegateInput && (
                  <View style={styles.delegatePinContainer}>
                    <Text style={styles.delegatePinLabel}>Enter 6-Digit PIN from your friend:</Text>
                    <TextInput
                      style={styles.delegatePinInput}
                      value={delegatePin}
                      onChangeText={setDelegatePin}
                      placeholder="e.g. A4B92X"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      maxLength={6}
                    />
                  </View>
                )}
              </View>
            </SafeAreaView>
          </CameraView>
        </View>
      )}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
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
    color: '#111827',
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#DBEAFE',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
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
  scanButton: {
    backgroundColor: '#9333EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 24,
    paddingTop: 48,
  },
  closeCameraButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 24,
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FFF',
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  scanInstruction: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  delegateButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  delegateButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  delegatePinContainer: {
    marginTop: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: 250,
  },
  delegatePinLabel: {
    color: '#FFF',
    marginBottom: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  delegatePinInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  }
});
