import React from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import ErrorPopup from '../components/ErrorPopup';

export default function StudentLogin() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [hostelType, setHostelType] = useState<string>('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadHostelType();
  }, []);

  const loadHostelType = async () => {
    const hostel = await AsyncStorage.getItem('selected_hostel');
    setHostelType(hostel || '');
  };

  const handleRequestOTP = async () => {
    if (!rollNumber.trim() || !email.trim()) {
      setErrorMessage('Please enter roll number and email');
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
      const response = await api.post('/auth/student/request-otp', {
        roll_number: rollNumber.trim(),
        email: email.trim().toLowerCase(),
        hostel_type: hostelType,
      });

      setOtpSent(true);
      // For development, show OTP in alert
      Alert.alert('OTP Sent', `OTP has been sent to ${email}`);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.detail || 'Failed to send OTP. Try again.');
      setErrorVisible(true);
    } finally {
      setLoading(false);
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
      const response = await api.post('/auth/student/verify-otp', {
        roll_number: rollNumber.trim(),
        email: email.trim().toLowerCase(),
        otp_code: otp.trim(),
      });

      await login(response.data.user, response.data.access_token);
      router.replace('/student-dashboard');
    } catch (error: any) {
      console.error('Verify OTP failed:', error?.response?.status, error?.response?.data || error?.message);
      setErrorMessage(error.response?.data?.detail || 'Invalid OTP. Try again.');
      setErrorVisible(true);
      // Fallback alert to ensure visibility on devices where Modal may fail
      try {
        Alert.alert('Error', error.response?.data?.detail || 'Invalid OTP. Try again.');
      } catch {}
    } finally {
      setLoading(false);
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
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="person" size={40} color="#16A34A" />
            </View>
            <Text style={styles.title}>Student Login</Text>
            <Text style={styles.subtitle}>
              {hostelType === 'BOYS' ? 'Boys' : 'Girls'} Hostel
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Roll Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="card-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your roll number"
                  value={rollNumber}
                  onChangeText={setRollNumber}
                  autoCapitalize="characters"
                  editable={!otpSent}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>College Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ab.c@iiitg.ac.in"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!otpSent}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {otpSent && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Enter OTP</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="key-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="6-digit OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            )}

            {!otpSent ? (
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRequestOTP}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
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
                    <Text style={styles.buttonText}>Verify & Login</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => {
                    setOtpSent(false);
                    setOtp('');
                  }}
                >
                  <Text style={styles.resendButtonText}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Error Popup */}
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
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#16A34A',
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
    color: '#16A34A',
  },
});
