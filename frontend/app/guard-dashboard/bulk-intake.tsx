import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GlassTextInput from '../../components/GlassInput';
import LabelAutoMatch from '../../components/LabelAutoMatch';
import AppHeader from '../../components/AppHeader';
import { useAuthStore } from '../../store/authStore';
import { bulkAddParcels, BulkParcelItem } from '../../utils/api';
import { extractErrorMessage } from '../../utils/errorMessage';
import { Colors, Fonts, Radii } from '../../utils/theme';

export default function BulkIntakeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [items, setItems] = useState<BulkParcelItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Current row being composed.
  const [roomNumber, setRoomNumber] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [description, setDescription] = useState('');

  const resetRow = () => {
    setRoomNumber('');
    setRollNumber('');
    setStudentName('');
    setDescription('');
  };

  const addToBatch = () => {
    if (!roomNumber.trim()) {
      Alert.alert('Room required', 'Enter a room number before adding to the batch.');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        room_number: roomNumber.trim(),
        roll_number: rollNumber.trim() || null,
        student_name: studentName.trim() || null,
        description: description.trim() || null,
      },
    ]);
    resetRow();
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const submitBatch = async () => {
    if (items.length === 0) {
      Alert.alert('Nothing to log', 'Add at least one parcel to the batch.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await bulkAddParcels(user?.hostel_type ?? '', items);
      const failed = result.total - result.added;
      Alert.alert(
        'Batch logged',
        failed > 0
          ? `${result.added} of ${result.total} parcels logged. ${failed} failed.`
          : `All ${result.added} parcels logged.`,
        [{ text: 'Done', onPress: () => router.replace('/guard-dashboard') }],
      );
      setItems([]);
    } catch (error: any) {
      Alert.alert('Error', extractErrorMessage(error, 'Failed to log batch'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderItem = ({ item, index }: { item: BulkParcelItem; index: number }) => (
    <View style={styles.stagedRow}>
      <View style={styles.stagedIndex}>
        <Text style={styles.stagedIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.stagedBody}>
        <Text style={styles.stagedTitle} numberOfLines={1}>
          {item.student_name || item.roll_number || 'Unassigned'}
          <Text style={styles.stagedRoom}>{`   Room ${item.room_number}`}</Text>
        </Text>
        {item.roll_number || item.description ? (
          <Text style={styles.stagedMeta} numberOfLines={1}>
            {[item.roll_number, item.description].filter(Boolean).join('  ·  ')}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={() => removeItem(index)} hitSlop={8}>
        <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader
        title="Bulk Intake"
        subtitle={`${user?.hostel_type ?? ''} Hostel · Batch logging`}
        containerStyle={styles.header}
        onBackPress={() => router.back()}
        backAccessibilityLabel="Back"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <FlatList
          data={items}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.composer}>
              <LabelAutoMatch
                containerStyle={styles.field}
                onApply={({ room_number, roll_number, student_name }) => {
                  if (room_number) setRoomNumber(room_number);
                  if (roll_number) setRollNumber(roll_number);
                  if (student_name) setStudentName(student_name);
                }}
              />

              <GlassTextInput
                label="Room Number *"
                inputType="numeric"
                placeholder="e.g., 214"
                value={roomNumber}
                onChangeText={setRoomNumber}
                containerStyle={styles.field}
              />
              <GlassTextInput
                label="Roll Number (Optional)"
                inputType="text"
                placeholder="e.g., 21CS001"
                value={rollNumber}
                onChangeText={setRollNumber}
                containerStyle={styles.field}
              />
              <GlassTextInput
                label="Student Name (Optional)"
                inputType="text"
                placeholder="Student name"
                value={studentName}
                onChangeText={setStudentName}
                containerStyle={styles.field}
              />
              <GlassTextInput
                label="Description (Optional)"
                inputType="text"
                placeholder="Parcel description"
                value={description}
                onChangeText={setDescription}
                containerStyle={styles.field}
              />

              <TouchableOpacity style={styles.addButton} onPress={addToBatch}>
                <Ionicons name="add" size={20} color={Colors.accentBlue} />
                <Text style={styles.addButtonText}>Add to batch</Text>
              </TouchableOpacity>

              <View style={styles.batchHeader}>
                <Text style={styles.batchKicker}>In this batch</Text>
                <Text style={styles.batchCount}>{items.length}</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="documents-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No parcels staged yet</Text>
            </View>
          }
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, (items.length === 0 || submitting) && styles.submitButtonDisabled]}
            onPress={submitBatch}
            disabled={items.length === 0 || submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Logging…' : `Log all (${items.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  composer: {
    paddingTop: 12,
  },
  field: {
    marginBottom: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.accentBlue,
    backgroundColor: Colors.accentBlueDim,
    marginTop: 2,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accentBlue,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 8,
  },
  batchKicker: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
  batchCount: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  stagedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 10,
  },
  stagedIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.accentBlueDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stagedIndexText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accentBlue,
  },
  stagedBody: { flex: 1 },
  stagedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stagedRoom: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stagedMeta: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 10,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.bg,
  },
  submitButton: {
    backgroundColor: Colors.accentBlue,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
