import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { extractLabelLine } from '../utils/labelOcr';
import { Colors } from '../utils/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called with the best-guess label text extracted from the photo. */
  onScanned: (labelText: string) => void;
}

/**
 * Full-screen camera that snaps the parcel label and runs on-device OCR
 * (Google ML Kit). The extracted text is handed back to fill the editable
 * Smart-fill box — the guard can correct any misread before it matches.
 */
export default function LabelScanner({ visible, onClose, onScanned }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);

  const handleCapture = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) {
        Alert.alert('Capture failed', 'Could not take the photo. Please try again.');
        return;
      }

      const result = await TextRecognition.recognize(photo.uri);
      const labelText = extractLabelLine(result);

      if (!labelText.trim()) {
        Alert.alert(
          'No text detected',
          'Hold steady with good lighting and frame the label clearly, then scan again.',
        );
        return; // keep the scanner open so the guard can retry
      }

      onScanned(labelText);
      onClose();
    } catch (error: any) {
      // Surface the real reason instead of failing silently. A "doesn't seem to
      // be linked" message means the ML Kit native module isn't in this build —
      // rebuild the dev client (it does not work in Expo Go).
      Alert.alert('Scan failed', error?.message ? String(error.message) : 'Unknown OCR error.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {!permission?.granted ? (
        <View style={[StyleSheet.absoluteFill, styles.permissionScreen]}>
          <SafeAreaView style={styles.permissionInner}>
            <Ionicons name="camera-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionText}>Allow the camera to scan parcel labels.</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.permissionGhost} onPress={onClose}>
              <Text style={styles.permissionGhostText}>Cancel</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cameraRoot]}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

          <SafeAreaView
            style={StyleSheet.absoluteFill}
            {...(Platform.OS !== 'web' ? { pointerEvents: 'box-none' } : {})}
          >
            <View style={styles.header} {...(Platform.OS !== 'web' ? { pointerEvents: 'box-none' } : {})}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.overlay} {...(Platform.OS !== 'web' ? { pointerEvents: 'box-none' } : {})}>
              <View style={styles.frame} />
              <Text style={styles.instruction}>
                Point at the label&apos;s &quot;Name | Room | Roll&quot; line and tap to scan
              </Text>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.shutter} onPress={handleCapture} disabled={processing}>
                {processing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Ionicons name="scan" size={30} color="#FFF" />
                )}
              </TouchableOpacity>
              <Text style={styles.shutterHint}>{processing ? 'Reading…' : 'Scan label'}</Text>
            </View>
          </SafeAreaView>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  cameraRoot: {
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '78%',
    height: 130,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  instruction: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 32,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 28,
    gap: 10,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  shutterHint: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  permissionScreen: {
    backgroundColor: Colors.bg,
  },
  permissionInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 12,
    backgroundColor: Colors.accentBlue,
    borderRadius: 12,
    paddingHorizontal: 24,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  permissionGhost: {
    padding: 10,
  },
  permissionGhostText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
