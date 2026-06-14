import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import ErrorPopup from '../components/ErrorPopup';
import GlassInput from '../components/GlassInput';
import { Colors, Fonts } from '../utils/theme';
import { extractErrorCode, extractErrorMessage } from '../utils/errorMessage';

export default function GuardLogin() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [hostelType, setHostelType] = useState<string>('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    loadHostelType();
  }, []);

  const loadHostelType = async () => {
    const hostel = await AsyncStorage.getItem('selected_hostel');
    setHostelType(hostel || '');
  };

  const validateForm = () => {
    const nextErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      nextErrors.username = 'Username is required';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      setErrorMessage('Please fix the highlighted fields.');
      setErrorCode(null);
      setErrorVisible(true);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/guard/login', {
        username: username.trim(),
        password,
        hostel_type: hostelType,
      });

      await login(response.data.user, response.data.access_token);
      router.replace('/guard-dashboard');
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error, 'Invalid credentials. Try again.'));
      setErrorCode(extractErrorCode(error));
      setErrorVisible(true);
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
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={40} color={Colors.accentBlue} />
            </View>
            <Text style={styles.title}>Guard Login</Text>
            <Text style={styles.subtitle}>
              {hostelType === 'BOYS' ? 'Boys' : 'Girls'} Hostel
            </Text>
          </View>

          <View style={styles.form}>
            <GlassInput
              label="Username"
              leftIconName="person-outline"
              inputType="text"
              placeholder="Enter your username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (fieldErrors.username) {
                  setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }
              }}
              error={fieldErrors.username}
              autoCapitalize="none"
              containerStyle={styles.inputContainer}
            />

            <GlassInput
              label="Password"
              leftIconName="lock-closed-outline"
              inputType="password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              error={fieldErrors.password}
              containerStyle={styles.inputContainer}
            />

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      <ErrorPopup
        visible={errorVisible}
        message={errorMessage}
        code={errorCode}
        retryLabel="Retry Login"
        dismissLabel="Dismiss"
        onRetry={handleLogin}
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
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: Colors.accentBlueDim,
    borderWidth: 1.5,
    borderColor: Colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 0,
  },
  loginButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
