import React, { useState } from 'react';
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
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import GlassInput from '../components/GlassInput';
import { Colors, Fonts } from '../utils/theme';
import { extractErrorMessage } from '../utils/errorMessage';

export default function AdminLogin() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = () => {
    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address';
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
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const response = await api.post('/auth/admin/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      await login(response.data.user, response.data.access_token);
      router.replace('/admin-panel');
    } catch (error: any) {
      setErrorMessage(extractErrorMessage(error, 'Invalid credentials. Try again.'));
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/role-selection')}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="settings" size={40} color={Colors.accentRed} />
            </View>
            <Text style={styles.title}>Admin Login</Text>
            <Text style={styles.subtitle}>Manage users and parcels</Text>
          </View>

          <View style={styles.form}>
            <GlassInput
              label="Email"
              leftIconName="mail-outline"
              inputType="email"
              placeholder="admin@hostel.local"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              error={fieldErrors.email}
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

            {errorMessage ? (
              <View style={styles.inlineError}>
                <Ionicons name="alert-circle" size={16} color={Colors.accentRed} />
                <Text style={styles.inlineErrorText}>{errorMessage}</Text>
              </View>
            ) : null}

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
    backgroundColor: Colors.accentRedDim,
    borderWidth: 1.5,
    borderColor: Colors.accentRed,
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
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  inlineErrorText: {
    color: Colors.error,
    fontSize: 14,
    flex: 1,
  },
  loginButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
