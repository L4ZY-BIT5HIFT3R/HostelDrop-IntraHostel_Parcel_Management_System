import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import ErrorPopup from '../components/ErrorPopup';
import { Colors, MinimalInput } from '../utils/theme';
import { extractErrorMessage } from '../utils/errorMessage';

export default function StudentLogin() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [hostelType, setHostelType] = useState<string>('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isRegisterMode = authMode === 'REGISTER';

  // Forgot Password state
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [fpRollNumber, setFpRollNumber] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpOtpSent, setFpOtpSent] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMaskedEmail, setFpMaskedEmail] = useState('');

  useEffect(() => {
    loadHostelType();
  }, []);

  const loadHostelType = async () => {
    const hostel = await AsyncStorage.getItem('selected_hostel');
    setHostelType(hostel || '');
  };

  const handleAction = async () => {
    if (!isRegisterMode) {
      if (!rollNumber.trim() || !password.trim()) {
        setErrorMessage('Please enter your roll number and password');
        setErrorVisible(true);
        return;
      }
      setLoading(true);
      try {
        const response = await api.post('/auth/student/login', {
          roll_number: rollNumber.trim(),
          password: password,
          hostel_type: hostelType,
        });

        await login(response.data.user, response.data.access_token);
        router.replace('/student-dashboard');
      } catch (error: any) {
        setErrorMessage(extractErrorMessage(error, 'Invalid credentials. Try again.'));
        setErrorVisible(true);
      } finally {
        setLoading(false);
      }
    } else {
      if (!rollNumber.trim() || !email.trim() || !name.trim() || !roomNumber.trim() || !password.trim()) {
        setErrorMessage('Please fill in all required fields to register');
        setErrorVisible(true);
        return;
      }

      if (!email.endsWith('@iiitg.ac.in')) {
        setErrorMessage('Please use your IIITG email (e.g., ab.c@iiitg.ac.in)');
        setErrorVisible(true);
        return;
      }

      setLoading(true);
      try {
        await api.post('/auth/student/register/request-otp', {
          roll_number: rollNumber.trim(),
          email: email.trim().toLowerCase(),
          hostel_type: hostelType,
        });

        setOtpSent(true);
        Alert.alert('Registration OTP Sent', `OTP has been sent to ${email}`);
      } catch (error: any) {
        setErrorMessage(extractErrorMessage(error, 'Failed to send Registration OTP. Try again.'));
        setErrorVisible(true);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setErrorMessage('Please enter OTP');
      setErrorVisible(true);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/student/register/verify-otp', {
        name: name.trim(),
        roll_number: rollNumber.trim(),
        email: email.trim().toLowerCase(),
        hostel_type: hostelType,
        room_number: roomNumber.trim(),
        contact_number: contactNumber.trim() || null,
        password: password,
        otp_code: otp.trim(),
      });

      await login(response.data.user, response.data.access_token);
      router.replace('/student-dashboard');
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error, 'Invalid OTP. Try again.'));
      setErrorVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // ---- Forgot Password handlers ----
  const openForgotPassword = () => {
    setFpRollNumber(rollNumber);
    setFpOtp('');
    setFpNewPassword('');
    setFpOtpSent(false);
    setFpMaskedEmail('');
    setForgotModalVisible(true);
  };

  const handleForgotSendOtp = async () => {
    if (!fpRollNumber.trim()) {
      setErrorMessage('Please enter your roll number');
      setErrorVisible(true);
      return;
    }
    setFpLoading(true);
    try {
      const response = await api.post('/auth/student/forgot-password/request-otp', {
        roll_number: fpRollNumber.trim(),
        hostel_type: hostelType,
      });
      setFpOtpSent(true);
      setFpMaskedEmail(response.data.email || '');
      if (response.data.email) {
        Alert.alert('OTP Sent', `A password reset OTP has been sent to ${response.data.email}`);
      } else {
        Alert.alert('OTP Sent', 'If an account exists, a password reset OTP has been sent.');
      }
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error, 'Failed to send OTP. Try again.'));
      setErrorVisible(true);
    } finally {
      setFpLoading(false);
    }
  };

  const handleForgotResetPassword = async () => {
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
        roll_number: fpRollNumber.trim(),
        hostel_type: hostelType,
        otp_code: fpOtp.trim(),
        new_password: fpNewPassword,
      });
      Alert.alert('Password Reset', 'Your password has been reset successfully. You can now login with your new password.');
      setForgotModalVisible(false);
      setPassword('');
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error, 'Failed to reset password. Try again.'));
      setErrorVisible(true);
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            AsyncStorage.removeItem('selected_role');
            AsyncStorage.removeItem('selected_hostel');
            router.replace('/role-selection');
          }}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="person" size={40} color={Colors.accentGreen} />
            </View>
            <Text style={styles.title}>Student Access</Text>
            <Text style={styles.subtitle}>
              {hostelType === 'BOYS' ? 'Boys' : 'Girls'} Hostel
            </Text>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modeSwitchContainer}>
              <TouchableOpacity
                style={[styles.modeButton, authMode === 'LOGIN' && styles.modeButtonActive]}
                onPress={() => {
                  setAuthMode('LOGIN');
                  setOtpSent(false);
                  setOtp('');
                }}
                disabled={loading}
              >
                <Text style={[styles.modeButtonText, authMode === 'LOGIN' && styles.modeButtonTextActive]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, authMode === 'REGISTER' && styles.modeButtonActive]}
                onPress={() => {
                  setAuthMode('REGISTER');
                  setOtpSent(false);
                  setOtp('');
                }}
                disabled={loading}
              >
                <Text style={[styles.modeButtonText, authMode === 'REGISTER' && styles.modeButtonTextActive]}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            {isRegisterMode && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your full name"
                      value={name}
                      onChangeText={setName}
                      editable={!otpSent}
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Room Number</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="home-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 101"
                      value={roomNumber}
                      onChangeText={setRoomNumber}
                      editable={!otpSent}
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Contact Number (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter mobile number"
                      value={contactNumber}
                      onChangeText={setContactNumber}
                      keyboardType="phone-pad"
                      editable={!otpSent}
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>
              </>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Roll Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="card-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your roll number"
                  value={rollNumber}
                  onChangeText={setRollNumber}
                  autoCapitalize="characters"
                  editable={!otpSent}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            {isRegisterMode && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>College Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="ab.c@iiitg.ac.in"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!otpSent}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={isRegisterMode ? "Create a password" : "Enter your password"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!otpSent}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            {/* Forgot Password link - only on login mode */}
            {!isRegisterMode && !otpSent && (
              <TouchableOpacity onPress={openForgotPassword} style={styles.forgotPasswordLink}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {otpSent && isRegisterMode && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Enter OTP</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="key-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="6-digit OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>
            )}

            {!otpSent ? (
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleAction}
                disabled={loading}
                activeOpacity={0.8}
              >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {isRegisterMode ? 'Send Registration OTP' : 'Login'}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
              <View style={styles.otpActions}>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      Verify & Register
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => {
                    setOtpSent(false);
                    setOtp('');
                  }}
                >
                  <Text style={styles.resendButtonText}>Edit Details / Resend OTP</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* ========= Forgot Password Modal ========= */}
      <Modal
        visible={forgotModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <TouchableOpacity onPress={() => setForgotModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 20 }}
              >
                <Text style={styles.modalDescription}>
                  Enter your roll number to receive a password reset OTP on your registered email.
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Roll Number</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="card-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your roll number"
                      value={fpRollNumber}
                      onChangeText={setFpRollNumber}
                      autoCapitalize="characters"
                      editable={!fpOtpSent}
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>

                {fpOtpSent && (
                  <>
                    {fpMaskedEmail ? (
                      <Text style={styles.fpEmailHint}>OTP sent to {fpMaskedEmail}</Text>
                    ) : null}

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Enter OTP</Text>
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
                      <Text style={styles.label}>New Password</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter new password"
                          value={fpNewPassword}
                          onChangeText={setFpNewPassword}
                          secureTextEntry
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    </View>
                  </>
                )}

                {!fpOtpSent ? (
                  <TouchableOpacity
                    style={[styles.button, fpLoading && styles.buttonDisabled]}
                    onPress={handleForgotSendOtp}
                    disabled={fpLoading}
                    activeOpacity={0.8}
                  >
                    {fpLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>Send Reset OTP</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.otpActions}>
                    <TouchableOpacity
                      style={[styles.button, fpLoading && styles.buttonDisabled]}
                      onPress={handleForgotResetPassword}
                      disabled={fpLoading}
                      activeOpacity={0.8}
                    >
                      {fpLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.buttonText}>Reset Password</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={() => {
                        setFpOtpSent(false);
                        setFpOtp('');
                        setFpNewPassword('');
                      }}
                    >
                      <Text style={styles.resendButtonText}>Resend OTP</Text>
                    </TouchableOpacity>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 32,
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
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  form: {
    gap: 24,
    paddingBottom: 24,
  },
  formScroll: {
    flex: 1,
  },
  modeSwitchContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    paddingBottom: 8,
    marginBottom: 8,
  },
  modeButton: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  modeButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modeButtonTextActive: {
    color: Colors.textPrimary,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    ...MinimalInput,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  otpActions: {
    gap: 12,
  },
  resendButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: -12,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  fpEmailHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
