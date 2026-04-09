import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { Colors, MinimalCard, MinimalInput } from '../../utils/theme';
import ErrorPopup from '../../components/ErrorPopup';
import { extractErrorMessage } from '../../utils/errorMessage';

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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password (from profile) state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpOtpSent, setFpOtpSent] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMaskedEmail, setFpMaskedEmail] = useState('');
  const [showFpNewPassword, setShowFpNewPassword] = useState(false);

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    if (!currentPassword.trim()) {
      setErrorMessage('Please enter your current password');
      setErrorVisible(true);
      return;
    }
    if (!newPassword.trim() || newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters');
      setErrorVisible(true);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match');
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
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error, 'Failed to change password.'));
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
      setErrorVisible(true);
      setShowForgotModal(false);
    } finally {
      setFpLoading(false);
    }
  };

  const handleForgotResetPassword = async () => {
    if (!profile) return;
    if (!fpOtp.trim()) {
      setErrorMessage('Please enter the OTP');
      setErrorVisible(true);
      return;
    }
    if (!fpNewPassword.trim() || fpNewPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters');
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
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error, 'Failed to reset password.'));
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
      setErrorVisible(true);
    } finally {
      setFpLoading(false);
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
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSubtitle}>{profile?.hostel_type === 'BOYS' ? 'Boys' : 'Girls'} Hostel</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.accentRed} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar & Name */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={Colors.textPrimary} />
            </View>
            <Text style={styles.profileName}>{profile?.name || user?.name || 'Student'}</Text>
            <Text style={styles.profileRoll}>{profile?.roll_number || user?.roll_number || ''}</Text>
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
              new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
            )}
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
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Current Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showCurrentPassword}
                      placeholderTextColor={Colors.textMuted}
                    />
                    <TouchableOpacity onPress={() => setShowCurrentPassword((prev) => !prev)} style={styles.eyeIcon}>
                      <Ionicons
                        name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={Colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="key-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      placeholderTextColor={Colors.textMuted}
                    />
                    <TouchableOpacity onPress={() => setShowNewPassword((prev) => !prev)} style={styles.eyeIcon}>
                      <Ionicons
                        name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={Colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      placeholderTextColor={Colors.textMuted}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)} style={styles.eyeIcon}>
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={Colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

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

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Enter OTP</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="key-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="6-digit OTP"
                          value={fpOtp}
                          onChangeText={setFpOtp}
                          keyboardType="number-pad"
                          maxLength={6}
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>New Password</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter new password"
                          value={fpNewPassword}
                          onChangeText={setFpNewPassword}
                          secureTextEntry={!showFpNewPassword}
                          placeholderTextColor={Colors.textMuted}
                        />
                        <TouchableOpacity onPress={() => setShowFpNewPassword((prev) => !prev)} style={styles.eyeIcon}>
                          <Ionicons
                            name={showFpNewPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={Colors.textMuted}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

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

      <ErrorPopup
        visible={errorVisible}
        message={errorMessage}
        onClose={() => setErrorVisible(false)}
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
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  profileRoll: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  // Info card
  infoCard: {
    ...MinimalCard,
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
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
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
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
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    ...MinimalInput,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  eyeIcon: {
    padding: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: Colors.textPrimary,
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
