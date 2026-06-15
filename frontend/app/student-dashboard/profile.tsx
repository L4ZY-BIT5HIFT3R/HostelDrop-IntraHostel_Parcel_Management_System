import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import GlassInput from '../../components/GlassInput';
import AppHeader from '../../components/AppHeader';
import { Colors, Fonts, MinimalCard } from '../../utils/theme';
import ErrorPopup from '../../components/ErrorPopup';
import { extractErrorCode, extractErrorMessage } from '../../utils/errorMessage';
import { formatDateInIST } from '../../utils/dateTime';

interface StudentProfile {
  _id: string;
  name: string;
  roll_number: string;
  email: string;
  hostel_type: string;
  room_number: string;
  contact_number?: string;
  created_at?: string;
}

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [changePasswordErrors, setChangePasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Forgot password (from profile) state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpOtpSent, setFpOtpSent] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMaskedEmail, setFpMaskedEmail] = useState('');
  const [forgotPasswordErrors, setForgotPasswordErrors] = useState<{
    otp?: string;
    newPassword?: string;
  }>({});

  // Room change request state
  const [showRoomChangeModal, setShowRoomChangeModal] = useState(false);
  const [requestedNewRoom, setRequestedNewRoom] = useState('');
  const [roomChangeReason, setRoomChangeReason] = useState('');
  const [roomChangeLoading, setRoomChangeLoading] = useState(false);
  const [roomChangeErrors, setRoomChangeErrors] = useState<{
    requestedNewRoom?: string;
    roomChangeReason?: string;
  }>({});

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/student/profile');
      setProfile(response.data.student);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    const nextErrors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword.trim()) {
      nextErrors.currentPassword = 'Current password is required';
    }
    if (!newPassword.trim() || newPassword.length < 8) {
      nextErrors.newPassword = 'New password must be at least 8 characters';
    }
    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'New passwords do not match';
    }

    setChangePasswordErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setErrorMessage(
        nextErrors.confirmPassword ||
        nextErrors.newPassword ||
        nextErrors.currentPassword ||
        'Please fix the highlighted fields.'
      );
      setErrorVisible(true);
      return;
    }

    setChangePwLoading(true);
    try {
      await api.put('/auth/student/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert('Success', 'Password changed successfully!');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangePasswordErrors({});
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error, 'Failed to change password.'));
      setErrorCode(extractErrorCode(error));
      setErrorVisible(true);
    } finally {
      setChangePwLoading(false);
    }
  };

  // Forgot password from profile
  const handleForgotFromProfile = async () => {
    if (!profile) return;
    setFpOtp('');
    setFpNewPassword('');
    setFpOtpSent(false);
    setFpMaskedEmail('');
    setForgotPasswordErrors({});
    setShowForgotModal(true);

    // Immediately send OTP since we know the roll number
    setFpLoading(true);
    try {
      const response = await api.post('/auth/student/forgot-password/request-otp', {
        roll_number: profile.roll_number,
        hostel_type: profile.hostel_type,
      });
      setFpOtpSent(true);
      setFpMaskedEmail(response.data.email || '');
      if (response.data.email) {
        Alert.alert('OTP Sent', `A password reset OTP has been sent to ${response.data.email}`);
      } else {
        Alert.alert('OTP Sent', 'If an account exists, a password reset OTP has been sent.');
      }
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error, 'Failed to send OTP.'));
      setErrorCode(extractErrorCode(error));
      setErrorVisible(true);
      setShowForgotModal(false);
    } finally {
      setFpLoading(false);
    }
  };

  const handleForgotResetPassword = async () => {
    if (!profile) return;

    const nextErrors: { otp?: string; newPassword?: string } = {};

    if (!fpOtp.trim()) {
      nextErrors.otp = 'OTP is required';
    }
    if (!fpNewPassword.trim() || fpNewPassword.length < 8) {
      nextErrors.newPassword = 'New password must be at least 8 characters';
    }

    setForgotPasswordErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setErrorMessage(nextErrors.newPassword || nextErrors.otp || 'Please fix the highlighted fields.');
      setErrorVisible(true);
      return;
    }
    setFpLoading(true);
    try {
      await api.post('/auth/student/forgot-password/verify-otp', {
        roll_number: profile.roll_number,
        hostel_type: profile.hostel_type,
        otp_code: fpOtp.trim(),
        new_password: fpNewPassword,
      });
      Alert.alert('Password Reset', 'Your password has been reset successfully!');
      setShowForgotModal(false);
      setShowChangePassword(false);
      setForgotPasswordErrors({});
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error, 'Failed to reset password.'));
      setErrorCode(extractErrorCode(error));
      setErrorVisible(true);
    } finally {
      setFpLoading(false);
    }
  };

  const handleResendForgotOtp = async () => {
    if (!profile) return;
    setFpLoading(true);
    try {
      const response = await api.post('/auth/student/forgot-password/request-otp', {
        roll_number: profile.roll_number,
        hostel_type: profile.hostel_type,
      });
      setFpMaskedEmail(response.data.email || '');
      if (response.data.email) {
        Alert.alert('OTP Resent', `A new OTP has been sent to ${response.data.email}`);
      } else {
        Alert.alert('OTP Resent', 'If an account exists, a new OTP has been sent.');
      }
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error, 'Failed to resend OTP.'));
      setErrorCode(extractErrorCode(error));
      setErrorVisible(true);
    } finally {
      setFpLoading(false);
    }
  };

  const handleSubmitRoomChangeRequest = async () => {
    const nextErrors: { requestedNewRoom?: string; roomChangeReason?: string } = {};

    if (!profile?.room_number?.trim()) {
      setErrorMessage('Current room is not assigned. Please contact admin.');
      setErrorVisible(true);
      return;
    }
    if (!requestedNewRoom.trim()) {
      nextErrors.requestedNewRoom = 'New room number is required';
    }
    if (!roomChangeReason.trim()) {
      nextErrors.roomChangeReason = 'Reason is required';
    }

    setRoomChangeErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setErrorMessage(nextErrors.requestedNewRoom || nextErrors.roomChangeReason || 'Please fix the highlighted fields.');
      setErrorVisible(true);
      return;
    }

    setRoomChangeLoading(true);
    try {
      const response = await api.post('/student/room-change-request', {
        new_room_number: requestedNewRoom.trim(),
        reason: roomChangeReason.trim(),
      });
      Alert.alert('Request Submitted', response.data?.message || 'Room change request submitted to admin.');
      setShowRoomChangeModal(false);
      setRequestedNewRoom('');
      setRoomChangeReason('');
      setRoomChangeErrors({});
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error, 'Failed to submit room change request.'));
      setErrorCode(extractErrorCode(error));
      setErrorVisible(true);
    } finally {
      setRoomChangeLoading(false);
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

  const renderInfoRow = (icon: string, label: string, value: string) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon as any} size={20} color={Colors.accent} />
      </View>
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <AppHeader
          title="My Profile"
          subtitle={`${profile?.hostel_type === 'BOYS' ? 'Boys' : 'Girls'} Hostel`}
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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar & Name */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={44} color={Colors.accent} />
              </View>
            </View>
            <Text style={styles.profileName}>{profile?.name || user?.name || 'Student'}</Text>
            <Text style={styles.profileRoll}>{profile?.roll_number || user?.roll_number || ''}</Text>
            <View style={styles.hostelChip}>
              <Ionicons name="business-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.hostelChipText}>
                {profile?.hostel_type === 'BOYS' ? 'Boys Hostel' : 'Girls Hostel'}
                {profile?.room_number ? `  ·  Room ${profile.room_number}` : ''}
              </Text>
            </View>
          </View>

          {/* Profile Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            {renderInfoRow('mail-outline', 'Email', profile?.email || '-')}
            {renderInfoRow('home-outline', 'Room Number', profile?.room_number || '-')}
            {renderInfoRow('call-outline', 'Contact', profile?.contact_number || 'Not provided')}
            {renderInfoRow('business-outline', 'Hostel', profile?.hostel_type === 'BOYS' ? 'Boys Hostel' : 'Girls Hostel')}
            {profile?.created_at && renderInfoRow(
              'calendar-outline',
              'Member Since',
              formatDateInIST(profile.created_at, { year: 'numeric', month: 'long', day: 'numeric' })
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Room Change Request</Text>
            <Text style={styles.roomChangeHint}>
              Need to move rooms? Send a request to admin for approval.
            </Text>
            <TouchableOpacity
              style={styles.changePasswordButton}
              onPress={() => setShowRoomChangeModal(true)}
            >
              <Ionicons name="swap-horizontal-outline" size={20} color="#FFF" />
              <Text style={styles.changePasswordButtonText}>Request Room Change</Text>
            </TouchableOpacity>
          </View>

          {/* Change Password Section */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Password & Security</Text>

            {!showChangePassword ? (
              <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={() => setShowChangePassword(true)}
              >
                <Ionicons name="lock-closed-outline" size={20} color="#FFF" />
                <Text style={styles.changePasswordButtonText}>Change Password</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.changePasswordForm}>
                <GlassInput
                  label="Current Password"
                  leftIconName="lock-closed-outline"
                  inputType="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChangeText={(text) => {
                    setCurrentPassword(text);
                    if (changePasswordErrors.currentPassword) {
                      setChangePasswordErrors((prev) => ({ ...prev, currentPassword: undefined }));
                    }
                  }}
                  error={changePasswordErrors.currentPassword}
                  containerStyle={styles.inputContainer}
                />

                <GlassInput
                  label="New Password"
                  leftIconName="key-outline"
                  inputType="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (changePasswordErrors.newPassword) {
                      setChangePasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                    }
                  }}
                  error={changePasswordErrors.newPassword}
                  containerStyle={styles.inputContainer}
                />

                <GlassInput
                  label="Confirm New Password"
                  leftIconName="checkmark-circle-outline"
                  inputType="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (changePasswordErrors.confirmPassword) {
                      setChangePasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                  error={changePasswordErrors.confirmPassword}
                  containerStyle={styles.inputContainer}
                />

                <TouchableOpacity
                  style={[styles.saveButton, changePwLoading && styles.saveButtonDisabled]}
                  onPress={handleChangePassword}
                  disabled={changePwLoading}
                >
                  {changePwLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Update Password</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={handleForgotFromProfile}
                >
                  <Text style={styles.forgotLinkText}>Do not remember current password? Reset via OTP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelLink}
                  onPress={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setChangePasswordErrors({});
                  }}
                >
                  <Text style={styles.cancelLinkText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ========= Forgot Password Modal (from profile) ========= */}
      <Modal
        visible={showForgotModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password via OTP</Text>
                <TouchableOpacity onPress={() => setShowForgotModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 20 }}
              >
                {fpOtpSent ? (
                  <>
                    {fpMaskedEmail ? (
                      <Text style={styles.fpEmailHint}>OTP sent to {fpMaskedEmail}</Text>
                    ) : null}

                    <GlassInput
                      label="Enter OTP"
                      leftIconName="key-outline"
                      inputType="numeric"
                      placeholder="6-digit OTP"
                      value={fpOtp}
                      onChangeText={(text) => {
                        setFpOtp(text);
                        if (forgotPasswordErrors.otp) {
                          setForgotPasswordErrors((prev) => ({ ...prev, otp: undefined }));
                        }
                      }}
                      maxLength={6}
                      error={forgotPasswordErrors.otp}
                      containerStyle={styles.inputContainer}
                    />

                    <GlassInput
                      label="New Password"
                      leftIconName="lock-closed-outline"
                      inputType="password"
                      placeholder="Enter new password"
                      value={fpNewPassword}
                      onChangeText={(text) => {
                        setFpNewPassword(text);
                        if (forgotPasswordErrors.newPassword) {
                          setForgotPasswordErrors((prev) => ({ ...prev, newPassword: undefined }));
                        }
                      }}
                      error={forgotPasswordErrors.newPassword}
                      containerStyle={styles.inputContainer}
                    />

                    <TouchableOpacity
                      style={[styles.saveButton, fpLoading && styles.saveButtonDisabled]}
                      onPress={handleForgotResetPassword}
                      disabled={fpLoading}
                    >
                      {fpLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.saveButtonText}>Reset Password</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelLink}
                      onPress={handleResendForgotOtp}
                      disabled={fpLoading}
                    >
                      <Text style={styles.forgotLinkText}>Resend OTP</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={styles.loadingText}>Sending OTP...</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={showRoomChangeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRoomChangeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Room Change Request</Text>
                <TouchableOpacity onPress={() => setShowRoomChangeModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 20 }}
              >
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Current Room (non-editable)</Text>
                  <View style={[styles.inputWrapper, styles.readonlyInput]}>
                    <Ionicons name="home-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                    <Text style={styles.readonlyInputText}>{profile?.room_number || '-'}</Text>
                  </View>
                </View>

                <GlassInput
                  label="New Room Number"
                  leftIconName="home-outline"
                  inputType="numeric"
                  placeholder="e.g., 207"
                  value={requestedNewRoom}
                  onChangeText={(text) => {
                    setRequestedNewRoom(text);
                    if (roomChangeErrors.requestedNewRoom) {
                      setRoomChangeErrors((prev) => ({ ...prev, requestedNewRoom: undefined }));
                    }
                  }}
                  error={roomChangeErrors.requestedNewRoom}
                  containerStyle={styles.inputContainer}
                />

                <GlassInput
                  label="Reason to Change"
                  inputType="text"
                  placeholder="Write reason for room change request"
                  value={roomChangeReason}
                  onChangeText={(text) => {
                    setRoomChangeReason(text);
                    if (roomChangeErrors.roomChangeReason) {
                      setRoomChangeErrors((prev) => ({ ...prev, roomChangeReason: undefined }));
                    }
                  }}
                  multiline
                  numberOfLines={4}
                  error={roomChangeErrors.roomChangeReason}
                  containerStyle={styles.inputContainer}
                  inputContainerStyle={styles.reasonTextInputWrapper}
                />

                <TouchableOpacity
                  style={[styles.saveButton, roomChangeLoading && styles.saveButtonDisabled]}
                  onPress={handleSubmitRoomChangeRequest}
                  disabled={roomChangeLoading}
                >
                  {roomChangeLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Submit Request</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <ErrorPopup
        visible={errorVisible}
        message={errorMessage}
        code={errorCode}
        dismissLabel="Dismiss"
        onClose={() => {
          setErrorVisible(false);
          setErrorCode(null);
        }}
      />
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  // Avatar section
  avatarSection: {
    alignItems: 'center',
    gap: 8,
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    padding: 4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  hostelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  hostelChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  profileRoll: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    letterSpacing: 1.5,
    color: Colors.accent,
    fontWeight: '700',
    marginTop: 2,
  },
  // Info card
  infoCard: {
    ...MinimalCard,
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  roomChangeHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: -4,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginTop: 2,
  },
  // Change password
  changePasswordButton: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  changePasswordButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  changePasswordForm: {
    gap: 16,
  },
  inputContainer: {
    gap: 0,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    backgroundColor: Colors.bg,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  readonlyInput: {
    backgroundColor: Colors.surface,
  },
  readonlyInputText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  reasonTextInputWrapper: {
    alignItems: 'flex-start',
    minHeight: 104,
    paddingTop: 0,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  forgotLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
    textAlign: 'center',
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  cancelLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalKeyboard: {
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  fpEmailHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
