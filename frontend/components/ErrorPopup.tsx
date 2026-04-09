import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, MinimalCard } from '../utils/theme';
import { normalizeMessage } from '../utils/errorMessage';

type Props = {
  visible: boolean;
  message: unknown;
  onClose: () => void;
};

export default function ErrorPopup({ visible, message, onClose }: Props) {
  const safeMessage = normalizeMessage(message, 'Wrong OTP or password. Try again.');

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayPress} onPress={onClose} />
        <View style={styles.card}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={Colors.accentRed} />
          </TouchableOpacity>
          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={32} color={Colors.accentRed} />
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{safeMessage}</Text>
          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    position: 'relative',
  },
  overlayPress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    ...MinimalCard,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    position: 'relative',
    zIndex: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorBg,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  buttonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
});
