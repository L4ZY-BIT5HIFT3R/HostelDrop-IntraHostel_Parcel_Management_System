import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, MinimalCard } from '../utils/theme';
import { normalizeMessage } from '../utils/errorMessage';

type Props = {
  visible: boolean;
  message: unknown;
  code?: unknown;
  onClose: () => void;
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  dismissLabel?: string;
};

export default function ErrorPopup({
  visible,
  message,
  code,
  onClose,
  onRetry,
  retryLabel = 'Retry',
  dismissLabel = 'Dismiss',
}: Props) {
  const safeMessage = normalizeMessage(message, 'Wrong OTP or password. Try again.');
  const safeCode = normalizeMessage(code, '').trim();
  const hasRetry = typeof onRetry === 'function';

  const handleRetry = () => {
    onClose();
    if (onRetry) {
      void Promise.resolve(onRetry());
    }
  };

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
          {safeCode ? <Text style={styles.codeText}>Code: {safeCode}</Text> : null}
          <View style={[styles.actions, hasRetry ? styles.actionsRow : styles.actionsSingle]}>
            <TouchableOpacity
              style={[styles.button, styles.dismissButton, hasRetry && styles.buttonHalf]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={[styles.buttonText, styles.dismissButtonText]}>{dismissLabel}</Text>
            </TouchableOpacity>
            {hasRetry ? (
              <TouchableOpacity
                style={[styles.button, styles.retryButton, styles.buttonHalf]}
                onPress={handleRetry}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>{retryLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
  codeText: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  actions: {
    marginTop: 12,
    width: '100%',
    gap: 10,
  },
  actionsSingle: {
    alignItems: 'stretch',
  },
  actionsRow: {
    flexDirection: 'row',
  },
  button: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  buttonHalf: {
    flex: 1,
  },
  dismissButton: {
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.bg,
  },
  retryButton: {
    borderColor: Colors.error,
    backgroundColor: Colors.error,
  },
  buttonText: {
    color: Colors.bg,
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButtonText: {
    color: Colors.textSecondary,
  },
});
