import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { Colors, Fonts, GlassCard, GlassInput } from '../utils/theme';
import GlassTextInput from '../components/GlassInput';
import AppHeader from '../components/AppHeader';
import { extractErrorMessage } from '../utils/errorMessage';

interface AutoDeleteStatus {
  enabled: boolean;
  interval_seconds: number;
  remaining_seconds: number;
  next_run_at: string | null;
  has_pending_cleanup: boolean;
  last_run_at: string | null;
  last_deleted_count: number;
}

interface RoomChangeRequestItem {
  _id: string;
  student_name?: string;
  roll_number?: string;
  hostel_type: 'BOYS' | 'GIRLS';
  current_room_number: string;
  new_room_number: string;
  reason: string;
  created_at: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'USER_MANAGEMENT' | 'STUDENT_LIFECYCLE' | 'PARCEL_LIFECYCLE' | 'REQUESTS'>('USER_MANAGEMENT');
  const [selectedRole, setSelectedRole] = useState<'GUARD' | 'STUDENT'>('GUARD');
  const [hostelType, setHostelType] = useState<'BOYS' | 'GIRLS'>('BOYS');
  const [loading, setLoading] = useState(false);
  const [deletingDelivered, setDeletingDelivered] = useState<'BOYS' | 'GIRLS' | null>(null);
  const [deliveredSummary, setDeliveredSummary] = useState<{ boys: number; girls: number }>({
    boys: 0,
    girls: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [autoDeleteStatus, setAutoDeleteStatus] = useState<AutoDeleteStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [roomChangeRequests, setRoomChangeRequests] = useState<RoomChangeRequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestActionLoadingId, setRequestActionLoadingId] = useState<string | null>(null);

  // Guard fields
  const [guardName, setGuardName] = useState('');
  const [guardUsername, setGuardUsername] = useState('');
  const [guardPassword, setGuardPassword] = useState('');

  // Student fields
  const [studentName, setStudentName] = useState('');
  const [studentRollNumber, setStudentRollNumber] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentRoomNumber, setStudentRoomNumber] = useState('');
  const [targetRollNumber, setTargetRollNumber] = useState('');
  const [targetNewRoomNumber, setTargetNewRoomNumber] = useState('');
  const [targetReason, setTargetReason] = useState('');
  const [studentActionLoading, setStudentActionLoading] = useState<'TRANSFER' | 'DEACTIVATE' | null>(null);

  const confirmAction = (
    title: string,
    message: string,
    confirmText: string,
    onConfirm: () => void | Promise<void>
  ) => {
    if (Platform.OS === 'web') {
      const confirmFn = (globalThis as { confirm?: (message?: string) => boolean }).confirm;
      const confirmed = typeof confirmFn === 'function' ? confirmFn(`${title}\n\n${message}`) : true;
      if (confirmed) {
        void onConfirm();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: confirmText,
        style: 'destructive',
        onPress: () => {
          void onConfirm();
        },
      },
    ]);
  };

  const resetForm = () => {
    setGuardName('');
    setGuardUsername('');
    setGuardPassword('');
    setStudentName('');
    setStudentRollNumber('');
    setStudentEmail('');
    setStudentRoomNumber('');
  };

  const handleAddUser = async () => {
    if (selectedRole === 'GUARD') {
      if (!guardName.trim() || !guardUsername.trim() || !guardPassword.trim()) {
        Alert.alert('Error', 'All fields are required for guards');
        return;
      }

      setLoading(true);
      try {
        await api.post('/admin/add-user', {
          name: guardName.trim(),
          role: 'GUARD',
          hostel_type: hostelType,
          username: guardUsername.trim(),
          password: guardPassword,
        });

        Alert.alert('Success', 'Guard added successfully');
        resetForm();
      } catch (error: any) {
        Alert.alert('Error', extractErrorMessage(error, 'Failed to add guard'));
      } finally {
        setLoading(false);
      }
    } else {
      if (
        !studentName.trim() ||
        !studentRollNumber.trim() ||
        !studentEmail.trim() ||
        !studentRoomNumber.trim()
      ) {
        Alert.alert('Error', 'All fields are required for students');
        return;
      }

      if (!studentEmail.endsWith('@iiitg.ac.in')) {
        Alert.alert('Error', 'Please use IIITG email (e.g., ab.c@iiitg.ac.in)');
        return;
      }

      setLoading(true);
      try {
        await api.post('/admin/add-user', {
          name: studentName.trim(),
          role: 'STUDENT',
          hostel_type: hostelType,
          roll_number: studentRollNumber.trim(),
          email: studentEmail.trim().toLowerCase(),
          room_number: studentRoomNumber.trim(),
        });

        Alert.alert('Success', 'Student added successfully');
        resetForm();
      } catch (error: any) {
        Alert.alert('Error', extractErrorMessage(error, 'Failed to add student'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTransferStudentRoom = async () => {
    if (!targetRollNumber.trim() || !targetNewRoomNumber.trim() || !targetReason.trim()) {
      Alert.alert('Error', 'Roll number, new room number, and reason are required');
      return;
    }

    setStudentActionLoading('TRANSFER');
    try {
      const response = await api.patch('/admin/student/room-transfer', {
        roll_number: targetRollNumber.trim(),
        hostel_type: hostelType,
        new_room_number: targetNewRoomNumber.trim(),
        reason: targetReason.trim(),
      });
      Alert.alert('Success', response.data?.message || 'Student room transferred successfully');
      setTargetNewRoomNumber('');
      setTargetReason('');
    } catch (error: any) {
      Alert.alert('Error', extractErrorMessage(error, 'Failed to transfer room'));
    } finally {
      setStudentActionLoading(null);
    }
  };

  const handleDeactivateStudent = async () => {
    if (!targetRollNumber.trim() || !targetReason.trim()) {
      Alert.alert('Error', 'Roll number and reason are required');
      return;
    }

    confirmAction(
      'Deactivate Student',
      'This will mark the student inactive and remove current room assignment. Continue?',
      'Deactivate',
      async () => {
        setStudentActionLoading('DEACTIVATE');
        try {
          const response = await api.patch('/admin/student/deactivate', {
            roll_number: targetRollNumber.trim(),
            hostel_type: hostelType,
            reason: targetReason.trim(),
          });
          Alert.alert('Success', response.data?.message || 'Student deactivated successfully');
          setTargetNewRoomNumber('');
          setTargetReason('');
        } catch (error: any) {
          Alert.alert('Error', extractErrorMessage(error, 'Failed to deactivate student'));
        } finally {
          setStudentActionLoading(null);
        }
      }
    );
  };

  const fetchDeliveredSummary = useCallback(async (showError = true) => {
    setSummaryLoading(true);
    try {
      const response = await api.get('/admin/parcels/delivered/summary');
      setDeliveredSummary({
        boys: response.data?.boys ?? 0,
        girls: response.data?.girls ?? 0,
      });
    } catch (error: any) {
      if (showError) {
        Alert.alert('Error', extractErrorMessage(error, 'Failed to load delivered summary'));
      }
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchAutoDeleteStatus = useCallback(async (showError = true) => {
    setStatusLoading(true);
    try {
      const response = await api.get('/admin/parcels/delivered/auto-delete-status');
      setAutoDeleteStatus(response.data);
    } catch (error: any) {
      if (showError) {
        Alert.alert('Error', extractErrorMessage(error, 'Failed to load auto-delete status'));
      }
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const refreshCleanupStatus = useCallback(async (showError = true) => {
    await Promise.all([
      fetchDeliveredSummary(showError),
      fetchAutoDeleteStatus(showError),
    ]);
  }, [fetchAutoDeleteStatus, fetchDeliveredSummary]);

  const fetchRoomChangeRequests = useCallback(async (showError = true) => {
    setRequestsLoading(true);
    try {
      const response = await api.get('/admin/room-change-requests', {
        params: { hostel_type: hostelType },
      });
      setRoomChangeRequests(response.data?.requests || []);
    } catch (error: any) {
      if (showError) {
        Alert.alert('Error', extractErrorMessage(error, 'Failed to load room change requests'));
      }
    } finally {
      setRequestsLoading(false);
    }
  }, [hostelType]);

  const handleResolveRoomChangeRequest = async (
    requestId: string,
    action: 'ACCEPT' | 'DENY'
  ) => {
    setRequestActionLoadingId(requestId);
    try {
      const response = await api.patch(`/admin/room-change-request/${requestId}`, {
        action,
      });
      Alert.alert('Success', response.data?.message || 'Request handled successfully');
      await fetchRoomChangeRequests(false);
    } catch (error: any) {
      Alert.alert('Error', extractErrorMessage(error, 'Failed to handle request'));
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  useEffect(() => {
    void refreshCleanupStatus();

    const countdownInterval = setInterval(() => {
      setAutoDeleteStatus((current) => {
        if (!current || !current.has_pending_cleanup) {
          return current;
        }
        return {
          ...current,
          remaining_seconds: Math.max(0, current.remaining_seconds - 1),
        };
      });
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [refreshCleanupStatus]);

  useEffect(() => {
    if (
      !autoDeleteStatus ||
      !autoDeleteStatus.has_pending_cleanup ||
      autoDeleteStatus.remaining_seconds !== 0
    ) {
      return;
    }
    void refreshCleanupStatus(false);
  }, [autoDeleteStatus, refreshCleanupStatus]);

  useEffect(() => {
    if (activeTab === 'REQUESTS') {
      void fetchRoomChangeRequests(false);
    }
  }, [activeTab, hostelType, fetchRoomChangeRequests]);

  const formatCountdown = (remainingSeconds: number | undefined) => {
    const safeSeconds = Math.max(0, remainingSeconds ?? 0);
    const days = Math.floor(safeSeconds / 86400);
    const hours = Math.floor((safeSeconds % 86400) / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    return `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatInterval = (intervalSeconds: number | undefined) => {
    const safeSeconds = Math.max(1, intervalSeconds ?? 300);
    const days = Math.floor(safeSeconds / 86400);
    const hours = Math.floor((safeSeconds % 86400) / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    return `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const activeTabLabel =
    activeTab === 'USER_MANAGEMENT'
      ? 'User Management'
      : activeTab === 'STUDENT_LIFECYCLE'
        ? 'Student Flow'
        : activeTab === 'PARCEL_LIFECYCLE'
          ? 'Parcel Flow'
          : 'Requests';

  const handleDeleteDeliveredParcels = async (targetHostel: 'BOYS' | 'GIRLS') => {
    confirmAction(
      'Delete Delivered Parcels',
      `This will permanently delete delivered parcels for the ${targetHostel} hostel. Continue?`,
      'Delete',
      async () => {
        setDeletingDelivered(targetHostel);
        try {
          const response = await api.delete('/admin/parcels/delivered', {
            params: { hostel_type: targetHostel },
          });
          const deletedCount = response.data?.deleted_count ?? 0;
          Alert.alert('Success', `Deleted ${deletedCount} delivered parcel(s).`);
          refreshCleanupStatus(false);
        } catch (error: any) {
          Alert.alert('Error', extractErrorMessage(error, 'Failed to delete delivered parcels'));
        } finally {
          setDeletingDelivered(null);
        }
      }
    );
  };

  const handleBackToCommonDashboard = () => {
    router.replace('/role-selection');
  };

  const handleLogout = async () => {
    confirmAction(
      'Logout',
      'Are you sure you want to logout?',
      'Logout',
      async () => {
        await logout();
        router.replace('/role-selection');
      }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <AppHeader
          title="Admin Panel"
          subtitle={`Administrative Controls • ${activeTabLabel}`}
          containerStyle={styles.header}
          titleStyle={styles.headerTitle}
          subtitleStyle={styles.headerSubtitle}
          onBackPress={handleBackToCommonDashboard}
          actions={[
            {
              icon: 'log-out-outline',
              color: Colors.accentRed,
              onPress: handleLogout,
              accessibilityLabel: 'Logout',
            },
          ]}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hostel Context</Text>
            <View style={styles.hostelButtons}>
              <TouchableOpacity
                style={[
                  styles.hostelButton,
                  hostelType === 'BOYS' && styles.hostelButtonActive,
                ]}
                onPress={() => setHostelType('BOYS')}
              >
                <Text
                  style={[
                    styles.hostelButtonText,
                    hostelType === 'BOYS' && styles.hostelButtonTextActive,
                  ]}
                >
                  Boys Hostel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.hostelButton,
                  hostelType === 'GIRLS' && styles.hostelButtonActive,
                ]}
                onPress={() => setHostelType('GIRLS')}
              >
                <Text
                  style={[
                    styles.hostelButtonText,
                    hostelType === 'GIRLS' && styles.hostelButtonTextActive,
                  ]}
                >
                  Girls Hostel
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {activeTab === 'USER_MANAGEMENT' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Role</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      selectedRole === 'GUARD' && styles.roleButtonActive,
                    ]}
                    onPress={() => setSelectedRole('GUARD')}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={24}
                      color={selectedRole === 'GUARD' ? Colors.accentBlue : Colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        selectedRole === 'GUARD' && styles.roleButtonTextActive,
                      ]}
                    >
                      Guard
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      selectedRole === 'STUDENT' && styles.roleButtonActive,
                    ]}
                    onPress={() => setSelectedRole('STUDENT')}
                  >
                    <Ionicons
                      name="person"
                      size={24}
                      color={selectedRole === 'STUDENT' ? Colors.accentGreen : Colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        selectedRole === 'STUDENT' && styles.roleButtonTextActive,
                      ]}
                    >
                      Student
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {selectedRole === 'GUARD' ? 'Guard Details' : 'Student Details'}
                </Text>

                {selectedRole === 'GUARD' ? (
                  <View style={styles.form}>
                    <View style={styles.inputGroup}>
                      <GlassTextInput
                        label="Name *"
                        inputType="text"
                        placeholder="Enter guard name"
                        value={guardName}
                        onChangeText={setGuardName}
                        containerStyle={styles.inputContainer}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <GlassTextInput
                        label="Username *"
                        inputType="text"
                        placeholder="Enter username"
                        value={guardUsername}
                        onChangeText={setGuardUsername}
                        autoCapitalize="none"
                        containerStyle={styles.inputContainer}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <GlassTextInput
                        label="Password *"
                        inputType="password"
                        placeholder="Enter password"
                        value={guardPassword}
                        onChangeText={setGuardPassword}
                        containerStyle={styles.inputContainer}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.form}>
                    <View style={styles.inputGroup}>
                      <GlassTextInput
                        label="Name *"
                        inputType="text"
                        placeholder="Enter student name"
                        value={studentName}
                        onChangeText={setStudentName}
                        containerStyle={styles.inputContainer}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <GlassTextInput
                        label="Roll Number *"
                        inputType="text"
                        placeholder="e.g., 2021001"
                        value={studentRollNumber}
                        onChangeText={setStudentRollNumber}
                        containerStyle={styles.inputContainer}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <GlassTextInput
                        label="Email *"
                        inputType="email"
                        placeholder="ab.c@iiitg.ac.in"
                        value={studentEmail}
                        onChangeText={setStudentEmail}
                        containerStyle={styles.inputContainer}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <GlassTextInput
                        label="Room Number *"
                        inputType="numeric"
                        placeholder="e.g., 101"
                        value={studentRoomNumber}
                        onChangeText={setStudentRoomNumber}
                        containerStyle={styles.inputContainer}
                      />
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleAddUser}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      Add {selectedRole === 'GUARD' ? 'Guard' : 'Student'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {activeTab === 'STUDENT_LIFECYCLE' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Student Room Lifecycle</Text>
              <Text style={styles.sectionHint}>
                Securely transfer room assignment or deactivate students who left the hostel.
              </Text>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <GlassTextInput
                    label="Student Roll Number *"
                    inputType="text"
                    placeholder="e.g., 2021001"
                    value={targetRollNumber}
                    onChangeText={setTargetRollNumber}
                    autoCapitalize="characters"
                    containerStyle={styles.inputContainer}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <GlassTextInput
                    label="New Room Number (for transfer)"
                    inputType="numeric"
                    placeholder="e.g., 205"
                    value={targetNewRoomNumber}
                    onChangeText={setTargetNewRoomNumber}
                    containerStyle={styles.inputContainer}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <GlassTextInput
                    label="Reason *"
                    inputType="text"
                    placeholder="e.g., Hostel relocation due to room reallocation"
                    value={targetReason}
                    onChangeText={setTargetReason}
                    multiline
                    numberOfLines={3}
                    containerStyle={styles.inputContainer}
                    inputContainerStyle={styles.reasonInput}
                  />
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.submitButton, styles.actionButton, studentActionLoading === 'TRANSFER' && styles.submitButtonDisabled]}
                  onPress={handleTransferStudentRoom}
                  disabled={studentActionLoading !== null}
                  activeOpacity={0.8}
                >
                  {studentActionLoading === 'TRANSFER' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Transfer Room</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dangerButton, styles.actionButton, studentActionLoading === 'DEACTIVATE' && styles.submitButtonDisabled]}
                  onPress={handleDeactivateStudent}
                  disabled={studentActionLoading !== null}
                  activeOpacity={0.8}
                >
                  {studentActionLoading === 'DEACTIVATE' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.dangerButtonText}>Mark Left Hostel</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'PARCEL_LIFECYCLE' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Parcel Lifecycle Tracking</Text>
              <Text style={styles.sectionHint}>
                Monitor delivered counts, cleanup timer, and force-delete delivered parcels by hostel.
              </Text>
              <View style={styles.autoDeleteCard}>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => refreshCleanupStatus()}
                  disabled={summaryLoading || statusLoading}
                  activeOpacity={0.8}
                >
                  {summaryLoading || statusLoading ? (
                    <ActivityIndicator size="small" color={Colors.accentRed} />
                  ) : (
                    <Ionicons name="refresh" size={20} color={Colors.accentRed} />
                  )}
                </TouchableOpacity>
                  <View style={styles.autoDeleteHeader}>
                    <View style={styles.autoDeleteTextBlock}>
                      <Text style={styles.autoDeleteTitle}>Automatic Cleanup Timer</Text>
                      <Text style={styles.autoDeleteSubtitle}>
                        Each delivered parcel is deleted after {formatInterval(autoDeleteStatus?.interval_seconds)} (days:hr:min:sec).
                      </Text>
                    </View>
                  </View>
                <Text style={styles.autoDeleteCountdown}>
                  {statusLoading && !autoDeleteStatus
                    ? 'Loading...'
                    : autoDeleteStatus?.has_pending_cleanup
                      ? formatCountdown(autoDeleteStatus?.remaining_seconds)
                      : 'No Pending Cleanup'}
                </Text>
                <Text style={styles.autoDeleteMeta}>
                  {autoDeleteStatus?.has_pending_cleanup
                    ? 'Next deletion countdown is based on the oldest delivered parcel.'
                    : 'Countdown starts only when at least one delivered parcel exists.'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Boys Hostel</Text>
                  <Text style={styles.summaryCount}>
                    {summaryLoading ? '...' : deliveredSummary.boys}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dangerButton,
                      deletingDelivered === 'BOYS' && styles.submitButtonDisabled,
                    ]}
                    onPress={() => handleDeleteDeliveredParcels('BOYS')}
                    disabled={deletingDelivered === 'BOYS'}
                    activeOpacity={0.8}
                  >
                    {deletingDelivered === 'BOYS' ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.dangerButtonText}>Delete Delivered</Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Girls Hostel</Text>
                  <Text style={styles.summaryCount}>
                    {summaryLoading ? '...' : deliveredSummary.girls}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dangerButton,
                      deletingDelivered === 'GIRLS' && styles.submitButtonDisabled,
                    ]}
                    onPress={() => handleDeleteDeliveredParcels('GIRLS')}
                    disabled={deletingDelivered === 'GIRLS'}
                    activeOpacity={0.8}
                  >
                    {deletingDelivered === 'GIRLS' ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.dangerButtonText}>Delete Delivered</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'REQUESTS' && (
            <View style={styles.section}>
              <View style={styles.requestsHeaderRow}>
                <Text style={styles.sectionTitle}>Room Change Requests</Text>
                <TouchableOpacity
                  style={styles.refreshButtonInline}
                  onPress={() => fetchRoomChangeRequests()}
                  disabled={requestsLoading}
                  activeOpacity={0.8}
                >
                  {requestsLoading ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <Ionicons name="refresh" size={18} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionHint}>
                Review and handle room change requests for {hostelType === 'BOYS' ? 'Boys' : 'Girls'} hostel.
              </Text>

              {requestsLoading && roomChangeRequests.length === 0 ? (
                <View style={styles.loadingBlock}>
                  <ActivityIndicator color={Colors.accent} />
                  <Text style={styles.loadingBlockText}>Loading requests...</Text>
                </View>
              ) : roomChangeRequests.length === 0 ? (
                <View style={styles.emptyRequestsCard}>
                  <Ionicons name="checkmark-done-outline" size={20} color={Colors.textSecondary} />
                  <Text style={styles.emptyRequestsText}>No pending requests.</Text>
                </View>
              ) : (
                roomChangeRequests.map((item) => {
                  const isActing = requestActionLoadingId === item._id;
                  return (
                    <View key={item._id} style={styles.requestCard}>
                      <Text style={styles.requestStudentName}>{item.student_name || 'Student'}</Text>
                      <Text style={styles.requestMeta}>Roll: {item.roll_number || '-'}</Text>
                      <Text style={styles.requestMeta}>Current Room: {item.current_room_number}</Text>
                      <Text style={styles.requestMeta}>Requested Room: {item.new_room_number}</Text>
                      <Text style={styles.requestReason}>Reason: {item.reason}</Text>

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[styles.submitButton, styles.actionButton, isActing && styles.submitButtonDisabled]}
                          disabled={isActing}
                          onPress={() => handleResolveRoomChangeRequest(item._id, 'ACCEPT')}
                        >
                          {isActing ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <Text style={styles.submitButtonText}>Accept</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.dangerButton, styles.actionButton, isActing && styles.submitButtonDisabled]}
                          disabled={isActing}
                          onPress={() => handleResolveRoomChangeRequest(item._id, 'DENY')}
                        >
                          <Text style={styles.dangerButtonText}>Deny</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomTaskbar}>
          {([
            { key: 'USER_MANAGEMENT', icon: 'person-add-outline', label: 'Users' },
            { key: 'STUDENT_LIFECYCLE', icon: 'git-compare-outline', label: 'Students' },
            { key: 'PARCEL_LIFECYCLE', icon: 'cube-outline', label: 'Parcels' },
            { key: 'REQUESTS', icon: 'mail-open-outline', label: 'Requests' },
          ] as const).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.bottomTaskButton, isActive && styles.bottomTaskButtonActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.85}
                accessibilityLabel={`${tab.label} tab`}
              >
                <Ionicons
                  name={tab.icon}
                  size={18}
                  color={isActive ? Colors.accent : Colors.textMuted}
                />
                <Text
                  style={[styles.bottomTaskLabel, isActive && styles.bottomTaskLabelActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  headerTitleBlock: {
    flex: 1,
    marginRight: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 10,
    gap: 6,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  bottomTaskbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  bottomTaskButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    height: 44,
    paddingHorizontal: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTaskButtonActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  bottomTaskLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.textMuted,
    includeFontPadding: false,
    flexShrink: 1,
  },
  bottomTaskLabelActive: {
    color: Colors.accent,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: -8,
    marginBottom: 12,
  },
  requestsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshButtonInline: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCard: {
    ...GlassCard,
    marginBottom: 12,
    padding: 14,
    gap: 6,
  },
  requestStudentName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  requestMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  requestReason: {
    fontSize: 13,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  loadingBlock: {
    ...GlassCard,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  loadingBlockText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyRequestsCard: {
    ...GlassCard,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyRequestsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  autoDeleteCard: {
    backgroundColor: Colors.accentRedDim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    padding: 16,
    gap: 8,
    marginBottom: 16,
    position: 'relative',
  },
  autoDeleteHeader: {
    paddingRight: 52,
  },
  autoDeleteTextBlock: {
    flexShrink: 1,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  autoDeleteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accentRed,
  },
  autoDeleteSubtitle: {
    fontSize: 12,
    color: 'rgba(248,113,113,0.8)',
    marginTop: 2,
  },
  autoDeleteCountdown: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.accentRed,
    letterSpacing: 1,
  },
  autoDeleteMeta: {
    fontSize: 12,
    color: 'rgba(248,113,113,0.7)',
  },
  summaryCard: {
    flex: 1,
    ...GlassCard,
    padding: 16,
    gap: 6,
    minHeight: 170,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  summaryCount: {
    fontFamily: Fonts.mono,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.accent,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
  },
  roleButtonActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  roleButtonTextActive: {
    color: Colors.accent,
  },
  hostelButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  hostelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  hostelButtonActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  hostelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  hostelButtonTextActive: {
    color: Colors.accent,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 0,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  textInput: {
    ...GlassInput,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  eyeIcon: {
    padding: 6,
    alignSelf: 'center',
  },
  reasonInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    marginTop: 0,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerButton: {
    backgroundColor: Colors.accentRed,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
