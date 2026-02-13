import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';

export default function AdminPanel() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<'GUARD' | 'STUDENT'>('GUARD');
  const [hostelType, setHostelType] = useState<'BOYS' | 'GIRLS'>('BOYS');
  const [loading, setLoading] = useState(false);
  const [deletingDelivered, setDeletingDelivered] = useState<'BOYS' | 'GIRLS' | null>(null);
  const [deliveredSummary, setDeliveredSummary] = useState<{ boys: number; girls: number }>({
    boys: 0,
    girls: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Guard fields
  const [guardName, setGuardName] = useState('');
  const [guardUsername, setGuardUsername] = useState('');
  const [guardPassword, setGuardPassword] = useState('');

  // Student fields
  const [studentName, setStudentName] = useState('');
  const [studentRollNumber, setStudentRollNumber] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentRoomNumber, setStudentRoomNumber] = useState('');

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
        Alert.alert('Error', error.response?.data?.detail || 'Failed to add guard');
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
        Alert.alert('Error', error.response?.data?.detail || 'Failed to add student');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDeliveredSummary();
  }, []);

  const fetchDeliveredSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await api.get('/admin/parcels/delivered/summary');
      setDeliveredSummary({
        boys: response.data?.boys ?? 0,
        girls: response.data?.girls ?? 0,
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load delivered summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDeleteDeliveredParcels = async (targetHostel: 'BOYS' | 'GIRLS') => {
    Alert.alert(
      'Delete Delivered Parcels',
      `This will permanently delete delivered parcels for the ${targetHostel} hostel. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingDelivered(targetHostel);
            try {
              const response = await api.delete('/admin/parcels/delivered', {
                params: { hostel_type: targetHostel },
              });
              const deletedCount = response.data?.deleted_count ?? 0;
              Alert.alert('Success', `Deleted ${deletedCount} delivered parcel(s).`);
              fetchDeliveredSummary();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to delete delivered parcels');
            } finally {
              setDeletingDelivered(null);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={styles.headerSubtitle}>Add Guards and Students</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Role Selection */}
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
                  color={selectedRole === 'GUARD' ? '#2563EB' : '#9CA3AF'}
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
                  color={selectedRole === 'STUDENT' ? '#16A34A' : '#9CA3AF'}
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

          {/* Hostel Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hostel Type</Text>
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

          {/* Form Fields */}
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
                    placeholderTextColor="#9CA3AF"
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
                    placeholderTextColor="#9CA3AF"
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
                    placeholderTextColor="#9CA3AF"
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
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Roll Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., 2021001"
                    value={studentRollNumber}
                    onChangeText={setStudentRollNumber}
                    placeholderTextColor="#9CA3AF"
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
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Room Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., 101"
                    value={studentRoomNumber}
                    onChangeText={setStudentRoomNumber}
                    placeholderTextColor="#9CA3AF"
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivered Parcels</Text>
            <Text style={styles.sectionHint}>
              Manage delivered parcels by hostel type.
            </Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  sectionHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: -8,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  summaryCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  roleButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#2563EB',
  },
  hostelButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  hostelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  hostelButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  hostelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  hostelButtonTextActive: {
    color: '#6366F1',
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
    color: '#374151',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  submitButton: {
    backgroundColor: '#6366F1',
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
    backgroundColor: '#DC2626',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
