import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../utils/theme';
import StatusStamp from './StatusStamp';
import TrackingTag from './TrackingTag';
import ParcelTimeline from './ParcelTimeline';
import { formatDateInIST } from '../utils/dateTime';

type Parcel = {
  display_id?: string;
  room_number?: string;
  status?: string;
  student_name?: string;
  roll_number?: string;
  description?: string;
  created_at?: string;
  assigned_at?: string;
  otp_sent_at?: string;
  delivered_at?: string;
  status_history?: { event?: string; timestamp?: string }[];
};

type Props = {
  parcel: Parcel | null;
  onClose: () => void;
  /** Action buttons rendered in the footer. */
  children?: React.ReactNode;
  showTimeline?: boolean;
};

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

export default function ParcelDetailSheet({ parcel, onClose, children, showTimeline = true }: Props) {
  return (
    <Modal visible={!!parcel} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <TrackingTag code={parcel?.display_id} />
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <View style={styles.statusRow}>
              <StatusStamp status={parcel?.status} />
              {parcel?.created_at ? (
                <Text style={styles.logged}>Logged {formatDateInIST(parcel.created_at)}</Text>
              ) : null}
            </View>

            <View style={styles.grid}>
              <Field label="ROOM" value={parcel?.room_number ? `Room ${parcel.room_number}` : undefined} />
              <Field label="RECIPIENT" value={parcel?.student_name || 'Unassigned'} />
              <Field label="ROLL NO." value={parcel?.roll_number} />
            </View>

            {parcel?.description ? <Field label="DESCRIPTION" value={parcel.description} /> : null}

            {showTimeline ? (
              <ParcelTimeline
                history={parcel?.status_history}
                currentStatus={parcel?.status}
                createdAt={parcel?.created_at}
                assignedAt={parcel?.assigned_at}
                otpSentAt={parcel?.otp_sent_at}
                deliveredAt={parcel?.delivered_at}
              />
            ) : null}
          </ScrollView>

          {children ? <View style={styles.footer}>{children}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceBorder,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingVertical: 8,
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logged: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
  grid: {
    gap: 14,
  },
  field: {
    gap: 3,
  },
  fieldLabel: {
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1,
    color: Colors.textMuted,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
});
