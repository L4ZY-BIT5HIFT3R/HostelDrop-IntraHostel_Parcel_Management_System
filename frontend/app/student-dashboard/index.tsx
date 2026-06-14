import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Animated,
  FlatList,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import api, { verifyQrCode, generateDelegationCode } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { Colors, MinimalCard } from '../../utils/theme';
import GlassInput from '../../components/GlassInput';
import SearchBar from '../../components/SearchBar';
import AppHeader from '../../components/AppHeader';
import ParcelRow from '../../components/ParcelRow';
import ParcelDetailSheet from '../../components/ParcelDetailSheet';
import { formatDateInIST } from '../../utils/dateTime';

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

interface StudentNotification {
  _id: string;
  title: string;
  message: string;
  created_at: string;
}

type AppAlertVariant = 'info' | 'success' | 'error';
type AppAlertActionStyle = 'primary' | 'destructive' | 'ghost';

interface AppAlertAction {
  label: string;
  style?: AppAlertActionStyle;
  onPress?: () => void | Promise<void>;
}

interface AppAlertState {
  visible: boolean;
  title: string;
  message: string;
  variant: AppAlertVariant;
  code?: string;
  footer?: string;
  actions: AppAlertAction[];
}

export default function StudentDashboardIndex() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [filteredParcels, setFilteredParcels] = useState<Parcel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [detailParcel, setDetailParcel] = useState<Parcel | null>(null);

  const [scanning, setScanning] = useState(false);
  const [processingScan, setProcessingScan] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const [showDelegateInput, setShowDelegateInput] = useState(false);
  const [delegatePin, setDelegatePin] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [appAlert, setAppAlert] = useState<AppAlertState>({
    visible: false,
    title: '',
    message: '',
    variant: 'info',
    actions: [{ label: 'OK', style: 'primary' }],
  });

  const hideAppAlert = useCallback(() => {
    setAppAlert((prev) => ({ ...prev, visible: false }));
    setCodeCopied(false);
  }, []);

  const showAppAlert = useCallback((payload: Omit<AppAlertState, 'visible' | 'actions'> & { actions?: AppAlertAction[] }) => {
    setCodeCopied(false);
    setAppAlert({
      visible: true,
      title: payload.title,
      message: payload.message,
      variant: payload.variant,
      code: payload.code,
      footer: payload.footer,
      actions: payload.actions?.length ? payload.actions : [{ label: 'OK', style: 'primary' }],
    });
  }, []);

  const handleAlertActionPress = useCallback(async (action: AppAlertAction) => {
    hideAppAlert();
    if (action.onPress) {
      await action.onPress();
    }
  }, [hideAppAlert]);

  const handleCopyCode = useCallback(async () => {
    if (!appAlert.code) return;
    try {
      await Clipboard.setStringAsync(appAlert.code);
      setCodeCopied(true);
    } catch {
      showAppAlert({
        title: 'Copy Failed',
        message: 'Unable to copy code. Please copy it manually.',
        variant: 'error',
      });
    }
  }, [appAlert.code, showAppAlert]);

  const fetchParcels = useCallback(async () => {
    try {
      const response = await api.get(`/parcel/hostel/${user?.hostel_type}`);
      const pendingParcels = response.data.parcels.filter(
        (p: Parcel) => ['PENDING', 'UNASSIGNED'].includes(p.status)
      );
      setParcels(pendingParcels);
      setFilteredParcels(pendingParcels);
    } catch {
      showAppAlert({
        title: 'Unable to load parcels',
        message: 'Please refresh or login again.',
        variant: 'error',
      });
    } finally {
      setRefreshing(false);
    }
  }, [user?.hostel_type, showAppAlert]);

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchParcels();
  };

  const openNotifications = async () => {
    setNotificationsVisible(true);
    setNotificationsLoading(true);
    try {
      const response = await api.get('/student/notifications');
      setNotifications(response.data?.notifications || []);
    } catch {
      showAppAlert({
        title: 'Notifications',
        message: 'Failed to load notifications. Please try again.',
        variant: 'error',
      });
    } finally {
      setNotificationsLoading(false);
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
        showAppAlert({
          title: 'Permission Required',
          message: 'Camera permission is required to scan QR codes.',
          variant: 'error',
        });
        return;
      }
    }
    setScanning(true);
  };

  const handleDelegatePickup = async (parcelId: string) => {
    try {
      const data = await generateDelegationCode(parcelId);
      showAppAlert({
        title: 'Delegation Code Generated',
        message: 'Give this 6-character PIN to your friend so they can pick up your parcel:',
        code: data.delegation_code,
        footer: 'Valid for 10 minutes.',
        variant: 'info',
      });
    } catch (error: any) {
      showAppAlert({
        title: 'Error',
        message: error.response?.data?.detail || 'Failed to generate code.',
        variant: 'error',
      });
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (processingScan) return;

    // In delegated pickup the friend's 6-character PIN is required. The camera
    // auto-fires on the first QR it sees, so guard against scanning before the
    // PIN is entered — otherwise the backend rejects it with a confusing
    // "belongs to a different student" error.
    if (showDelegateInput && delegatePin.trim().length !== 6) {
      setProcessingScan(true);
      setScanning(false);
      showAppAlert({
        title: 'PIN Required',
        message: 'Enter the full 6-character PIN from your friend, then tap "Pickup for a Friend" again to scan.',
        variant: 'error',
      });
      setProcessingScan(false);
      return;
    }

    setProcessingScan(true);
    setScanning(false);
    try {
      const payload = JSON.parse(data);
      if (!payload.parcel_id || !payload.token) {
        showAppAlert({
          title: 'Invalid QR Code',
          message: 'This QR code is not valid for HostelDrop.',
          variant: 'error',
        });
        setProcessingScan(false);
        return;
      }

      await verifyQrCode(payload.parcel_id, payload.token, showDelegateInput && delegatePin ? delegatePin : undefined);
      showAppAlert({
        title: 'Success!',
        message: 'Parcel claimed successfully! You may now take your package.',
        variant: 'success',
      });
      setDelegatePin('');
      setShowDelegateInput(false);
      fetchParcels();
    } catch (e: any) {
      showAppAlert({
        title: 'Error',
        message: e.response?.data?.detail || 'Failed to verify QR code.',
        variant: 'error',
      });
    } finally {
      setProcessingScan(false);
    }
  };

  const handleLogout = async () => {
    showAppAlert({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      variant: 'info',
      actions: [
        { label: 'Cancel', style: 'ghost' },
        {
          label: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/role-selection');
          },
        },
      ],
    });
  };

  const renderParcelItem = ({ item }: { item: Parcel }) => (
    <ParcelRow parcel={item} onPress={() => setDetailParcel(item)} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="All Parcels"
        subtitle={`${user?.hostel_type ?? ''} Hostel`}
        containerStyle={styles.header}
        titleStyle={styles.headerTitle}
        subtitleStyle={styles.headerSubtitle}
        onBackPress={async () => {
          await logout();
          router.replace('/role-selection');
        }}
        actions={[
          {
            icon: 'notifications-outline',
            onPress: openNotifications,
            buttonStyle: styles.notificationButton,
            accessibilityLabel: 'Open notifications',
          },
          {
            icon: 'log-out-outline',
            color: Colors.accentRed,
            onPress: handleLogout,
            accessibilityLabel: 'Logout',
          },
        ]}
      />

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
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search by room, roll number, or name..."
          containerStyle={styles.searchContainer}
        />

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
                {searchQuery ? 'No parcels found' : 'No parcels available'}
              </Text>
            </View>
          }
        />
      </View>

      <Modal
        visible={appAlert.visible}
        animationType="fade"
        transparent
        onRequestClose={hideAppAlert}
      >
        <View style={styles.appAlertOverlay}>
          <Pressable style={styles.appAlertOverlayPress} onPress={hideAppAlert} />
          <View style={styles.appAlertCard}>
            <View style={styles.appAlertHeader}>
              <View
                style={[
                  styles.appAlertIconWrap,
                  appAlert.variant === 'success'
                    ? styles.appAlertIconSuccess
                    : appAlert.variant === 'error'
                      ? styles.appAlertIconError
                      : styles.appAlertIconInfo,
                ]}
              >
                <Ionicons
                  name={
                    appAlert.variant === 'success'
                      ? 'checkmark-circle'
                      : appAlert.variant === 'error'
                        ? 'alert-circle'
                        : 'information-circle'
                  }
                  size={20}
                  color={
                    appAlert.variant === 'success'
                      ? Colors.delivered
                      : appAlert.variant === 'error'
                        ? Colors.error
                        : Colors.accent
                  }
                />
              </View>
              <Text style={styles.appAlertTitle}>{appAlert.title}</Text>
            </View>

            <Text style={styles.appAlertMessage}>{appAlert.message}</Text>

            {appAlert.code ? (
              <View style={styles.alertCodeContainer}>
                <Text style={styles.alertCodeText}>{appAlert.code}</Text>
                <TouchableOpacity style={styles.copyCodeButton} onPress={handleCopyCode}>
                  <Ionicons name="copy-outline" size={16} color={Colors.textPrimary} />
                  <Text style={styles.copyCodeButtonText}>Copy Code</Text>
                </TouchableOpacity>
                {codeCopied ? <Text style={styles.copySuccessText}>Copied to clipboard</Text> : null}
              </View>
            ) : null}

            {appAlert.footer ? <Text style={styles.appAlertFooter}>{appAlert.footer}</Text> : null}

            <View style={styles.appAlertActions}>
              {appAlert.actions.map((action, index) => (
                <TouchableOpacity
                  key={`${action.label}-${index}`}
                  style={[
                    styles.appAlertButton,
                    action.style === 'destructive'
                      ? styles.appAlertButtonDestructive
                      : action.style === 'ghost'
                        ? styles.appAlertButtonGhost
                        : styles.appAlertButtonPrimary,
                  ]}
                  onPress={() => handleAlertActionPress(action)}
                >
                  <Text
                    style={[
                      styles.appAlertButtonText,
                      action.style === 'destructive'
                        ? styles.appAlertButtonTextDestructive
                        : action.style === 'ghost'
                          ? styles.appAlertButtonTextGhost
                          : styles.appAlertButtonTextPrimary,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={notificationsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.notificationsOverlay}>
          <View style={styles.notificationsSheet}>
            <View style={styles.notificationsHeader}>
              <Text style={styles.notificationsTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {notificationsLoading ? (
              <View style={styles.notificationsLoadingState}>
                <ActivityIndicator color={Colors.accent} />
                <Text style={styles.notificationsHintText}>Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.notificationsLoadingState}>
                <Ionicons name="mail-open-outline" size={24} color={Colors.textMuted} />
                <Text style={styles.notificationsHintText}>No notifications yet.</Text>
              </View>
            ) : (
              <Animated.FlatList
                data={notifications}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <View style={styles.notificationItem}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                    <Text style={styles.notificationDate}>{formatDateInIST(item.created_at)}</Text>
                  </View>
                )}
                contentContainerStyle={styles.notificationsList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

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
          
          <SafeAreaView
            style={StyleSheet.absoluteFill}
            {...(Platform.OS !== 'web' ? { pointerEvents: 'box-none' } : {})}
          >
            <View
              style={styles.cameraHeader}
              {...(Platform.OS !== 'web' ? { pointerEvents: 'box-none' } : {})}
            >
              <TouchableOpacity
                style={styles.closeCameraButton}
                onPress={() => { setScanning(false); setShowDelegateInput(false); setDelegatePin(''); }}
              >
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View
              style={styles.cameraOverlay}
              {...(Platform.OS !== 'web' ? { pointerEvents: 'box-none' } : {})}
            >
              <View style={styles.scanFrame} />
              <Text style={styles.scanInstruction}>
                Point at the Guard&apos;s QR code
              </Text>
              {showDelegateInput && (
                <View style={styles.delegatePinContainer}>
                  <Text style={styles.delegatePinLabel}>Enter 6-Character PIN from your friend:</Text>
                  <GlassInput
                    inputType="text"
                    containerStyle={styles.delegatePinInputWrap}
                    inputContainerStyle={styles.delegatePinInputContainer}
                    value={delegatePin}
                    onChangeText={setDelegatePin}
                    placeholder="e.g. A4B92X"
                    autoCapitalize="characters"
                    maxLength={6}
                  />
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      )}

      {/* Parcel detail sheet */}
      <ParcelDetailSheet parcel={detailParcel} onClose={() => setDetailParcel(null)}>
        {detailParcel?.student_id === user?._id && detailParcel?.status === 'PENDING' && (
          <TouchableOpacity
            style={styles.sheetBtn}
            onPress={() => {
              const p = detailParcel;
              setDetailParcel(null);
              if (p) handleDelegatePickup(p._id);
            }}
          >
            <Ionicons name="people-outline" size={18} color="#FFFFFF" />
            <Text style={styles.sheetBtnText}>Delegate Pickup to a Friend</Text>
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
  headerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  searchContainer: {
    marginBottom: 12,
  },
  listContainer: {
    paddingBottom: 16,
  },
  parcelCard: {
    ...MinimalCard,
    padding: 20,
    overflow: 'hidden',
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
  parcelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trackingTag: {
    marginBottom: 8,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.pendingBg,
    borderWidth: 1,
    borderColor: Colors.pending,
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
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 10,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  delegateButtonText: {
    color: '#FFFFFF',
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
  delegatePinInputWrap: {
    width: '100%',
  },
  delegatePinInputContainer: {
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  appAlertOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    position: 'relative',
  },
  appAlertOverlayPress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  appAlertCard: {
    width: '100%',
    maxWidth: 420,
    ...MinimalCard,
    padding: 20,
    zIndex: 2,
  },
  appAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  appAlertIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  appAlertIconInfo: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accent,
  },
  appAlertIconSuccess: {
    backgroundColor: Colors.deliveredBg,
    borderColor: Colors.delivered,
  },
  appAlertIconError: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error,
  },
  appAlertTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  appAlertMessage: {
    fontSize: 16,
    lineHeight: 23,
    color: Colors.textSecondary,
  },
  alertCodeContainer: {
    marginTop: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 10,
  },
  alertCodeText: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 3,
    color: Colors.textPrimary,
  },
  copyCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.bg,
  },
  copyCodeButtonText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  copySuccessText: {
    fontSize: 12,
    color: Colors.delivered,
    fontWeight: '600',
  },
  appAlertFooter: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  appAlertActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  appAlertButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appAlertButtonPrimary: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  appAlertButtonGhost: {
    backgroundColor: Colors.bg,
    borderColor: Colors.surfaceBorder,
  },
  appAlertButtonDestructive: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.error,
  },
  appAlertButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  appAlertButtonTextPrimary: {
    color: '#FFF',
  },
  appAlertButtonTextGhost: {
    color: Colors.textPrimary,
  },
  appAlertButtonTextDestructive: {
    color: Colors.error,
  },
  notificationsOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  notificationsSheet: {
    maxHeight: '75%',
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  notificationsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  notificationsList: {
    paddingBottom: 12,
  },
  notificationsLoadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  notificationsHintText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  notificationItem: {
    ...MinimalCard,
    marginBottom: 10,
    padding: 12,
    gap: 6,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  notificationMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  notificationDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
