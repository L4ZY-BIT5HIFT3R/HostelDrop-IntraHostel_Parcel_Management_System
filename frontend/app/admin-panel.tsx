import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
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
import { Colors, GlassCard, GlassInput } from '../utils/theme';
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

export default function AdminPanel() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'USER_MANAGEMENT' | 'STUDENT_LIFECYCLE' | 'PARCEL_LIFECYCLE'>('USER_MANAGEMENT');
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

  useEffect(() => {
    void refreshCleanupStatus();

    const countdownInterval = setInterval(() => {
      setAutoDeleteStatus((current) => {
        if (!current) {
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

  const formatCountdown = (remainingSeconds: number | undefined) => {
    const safeSeconds = Math.max(0, remainingSeconds ?? 0);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const intervalMinutes = Math.max(
    1,
    Math.floor((autoDeleteStatus?.interval_seconds ?? 300) / 60)
  );

  const activeTabLabel =
    activeTab === 'USER_MANAGEMENT'
      ? 'User Management'
      : activeTab === 'STUDENT_LIFECYCLE'
        ? 'Student Flow'
        : 'Parcel Flow';

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
        <View style={styles.header}>
          <View style={styles.headerTitleBlock}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackToCommonDashboard}>
              <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
              <Text style={styles.backButtonText}></Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSubtitle}>Administrative Controls • {activeTabLabel}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color={Colors.accentRed} />
            </TouchableOpacity>
          </View>
        </View>

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
                      <Text style={styles.inputLabel}>Name *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter guard name"
                        value={guardName}
                        onChangeText={setGuardName}
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Username *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter username"
                        value={guardUsername}
                        onChangeText={setGuardUsername}
                        autoCapitalize="none"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Password *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter password"
                        value={guardPassword}
                        onChangeText={setGuardPassword}
                        secureTextEntry
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.form}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Name *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter student name"
                        value={studentName}
                        onChangeText={setStudentName}
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Roll Number *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g., 2021001"
                        value={studentRollNumber}
                        onChangeText={setStudentRollNumber}
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Email *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="ab.c@iiitg.ac.in"
                        value={studentEmail}
                        onChangeText={setStudentEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Room Number *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g., 101"
                        value={studentRoomNumber}
                        onChangeText={setStudentRoomNumber}
                        placeholderTextColor={Colors.textMuted}
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
                  <Text style={styles.inputLabel}>Student Roll Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., 2021001"
                    value={targetRollNumber}
                    onChangeText={setTargetRollNumber}
                    autoCapitalize="characters"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Room Number (for transfer)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., 205"
                    value={targetNewRoomNumber}
                    onChangeText={setTargetNewRoomNumber}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reason *</Text>
                  <TextInput
                    style={[styles.textInput, styles.reasonInput]}
                    placeholder="e.g., Hostel relocation due to room reallocation"
                    value={targetReason}
                    onChangeText={setTargetReason}
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={Colors.textMuted}
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
                        Each delivered parcel is deleted {intervalMinutes} minutes after delivery.
                      </Text>
                    </View>
                  </View>
                <Text style={styles.autoDeleteCountdown}>
                  {statusLoading && !autoDeleteStatus ? 'Loading...' : formatCountdown(autoDeleteStatus?.remaining_seconds)}
                </Text>
                <Text style={styles.autoDeleteMeta}>
                  Last cleanup deleted {autoDeleteStatus?.last_deleted_count ?? 0} parcel(s).
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
        </ScrollView>

        <View style={styles.bottomTaskbar}>
          <TouchableOpacity
            style={[styles.bottomTaskButton, activeTab === 'USER_MANAGEMENT' && styles.bottomTaskButtonActive]}
            onPress={() => setActiveTab('USER_MANAGEMENT')}
            activeOpacity={0.8}
            accessibilityLabel="User management tab"
          >
            <Ionicons
              name="person-add-outline"
              size={22}
              color={activeTab === 'USER_MANAGEMENT' ? Colors.accent : Colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomTaskButton, activeTab === 'STUDENT_LIFECYCLE' && styles.bottomTaskButtonActive]}
            onPress={() => setActiveTab('STUDENT_LIFECYCLE')}
            activeOpacity={0.8}
            accessibilityLabel="Student lifecycle tab"
          >
            <Ionicons
              name="git-compare-outline"
              size={22}
              color={activeTab === 'STUDENT_LIFECYCLE' ? Colors.accent : Colors.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bottomTaskButton, activeTab === 'PARCEL_LIFECYCLE' && styles.bottomTaskButtonActive]}
            onPress={() => setActiveTab('PARCEL_LIFECYCLE')}
            activeOpacity={0.8}
            accessibilityLabel="Parcel lifecycle tab"
          >
            <Ionicons
              name="cube-outline"
              size={22}
              color={activeTab === 'PARCEL_LIFECYCLE' ? Colors.accent : Colors.textMuted}
            />
          </TouchableOpacity>
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
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  bottomTaskButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: -8,
    marginBottom: 12,
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
    fontSize: 40,
    fontWeight: '700',
    color: Colors.textPrimary,
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
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
