import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api, { verifyQrCode, generateDelegationCode } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { Colors, GlassCard, GlassInput } from '../../utils/theme';
import AnimatedCard, { STACK_CARD_HEIGHT, STACK_CARD_SPACING, STACK_FOCUS_OFFSET } from '../../components/AnimatedCard';

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
  const [listHeight, setListHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [scanning, setScanning] = useState(false);
  const [processingScan, setProcessingScan] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [showDelegateInput, setShowDelegateInput] = useState(false);
  const [delegatePin, setDelegatePin] = useState('');

  const fetchParcels = useCallback(async () => {
    try {
      const response = await api.get(`/parcel/hostel/${user?.hostel_type}`);
      const pendingParcels = response.data.parcels.filter(
        (p: Parcel) => ['PENDING', 'UNASSIGNED'].includes(p.status)
      );
      setParcels(pendingParcels);
      setFilteredParcels(pendingParcels);
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.hostel_type]);

  useEffect(() => {
    fetchParcels();
  }, []);

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

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
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

  const renderParcelItem = ({ item, index }: { item: Parcel; index: number }) => (
    <AnimatedCard index={index} activeIndex={activeIndex} scrollY={scrollY}>
      <View style={styles.parcelCard}>
        <View style={styles.parcelHeader}>
          <View style={{ flex: 1 }}>
            {item.display_id ? (
              <View style={styles.displayIdBadge}>
                <Text style={styles.displayIdText}>{item.display_id}</Text>
              </View>
            ) : null}
            <View style={styles.parcelInfo}>
              <Text style={styles.roomNumber}>Room {item.room_number}</Text>
              <View style={[
                styles.statusBadge,
                item.status === 'UNASSIGNED' && { backgroundColor: Colors.unassignedBg }
              ]}>
                <Text style={[
                  styles.statusText,
                  item.status === 'UNASSIGNED' && { color: Colors.unassigned }
                ]}>
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
    </AnimatedCard>
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
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>All Parcels</Text>
          <Text style={styles.headerSubtitle}>{user?.hostel_type} Hostel</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.accentRed} />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
        <TouchableOpacity style={styles.scanButton} onPress={() => { setShowDelegateInput(false); handleStartScan(); }}>
          <Ionicons name="qr-code-outline" size={24} color="#FFF" />
          <Text style={styles.scanButtonText}>Scan to Pickup My Parcel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.scanButton, { marginTop: 12,borderColor: 'rgba(147, 112, 219, 0.8)',borderWidth: 1 }]} onPress={() => { setShowDelegateInput(true); handleStartScan(); }}>
          <Ionicons name="people-outline" size={24} color="#FFF" />
          <Text style={styles.scanButtonText}>Pickup for a Friend</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
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
          />
          
          <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={styles.cameraHeader} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.closeCameraButton}
                onPress={() => { setScanning(false); setShowDelegateInput(false); setDelegatePin(''); }}
              >
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.cameraOverlay} pointerEvents="box-none">
              <View style={styles.scanFrame} />
              <Text style={styles.scanInstruction}>
                Point at the Guard&apos;s QR code
              </Text>
              {showDelegateInput && (
                <View style={styles.delegatePinContainer}>
                  <Text style={styles.delegatePinLabel}>Enter 6-Character PIN from your friend:</Text>
                  <TextInput
                    style={styles.delegatePinInput}
                    value={delegatePin}
                    onChangeText={setDelegatePin}
                    placeholder="e.g. A4B92X"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="characters"
                    maxLength={6}
                  />
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      )}
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
    paddingVertical: 16,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
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
  displayIdBadge: {
    backgroundColor: Colors.surface,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  displayIdText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
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
    backgroundColor: Colors.pendingBg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
  scanButton: {
    borderColor: 'rgba(129, 199, 132, 0.8)',
    borderWidth: 1,
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
    backgroundColor: Colors.accentAmber,
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
  },
});
