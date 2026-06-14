import { Alert, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Colors, Shadows } from '../utils/theme';

const feedbackFormUrl = process.env.EXPO_PUBLIC_FEEDBACK_FORM_URL?.trim();

const setupMessage = [
  'Create a Google Form with these fields:',
  'Name',
  'Roll number (optional)',
  'Problem you are facing',
  'Suggestion, if any (optional)',
  '',
  'Then paste the public response link into EXPO_PUBLIC_FEEDBACK_FORM_URL in frontend/.env.',
].join('\n');

type FeedbackButtonProps = {
  style?: StyleProp<ViewStyle>;
};

export default function FeedbackButton({ style }: FeedbackButtonProps) {
  const openFeedbackForm = async () => {
    if (!feedbackFormUrl) {
      Alert.alert('Feedback form not configured', setupMessage);
      return;
    }

    try {
      await WebBrowser.openBrowserAsync(feedbackFormUrl);
    } catch {
      Alert.alert('Unable to open feedback', 'Please try again after checking your internet connection.');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={openFeedbackForm}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Open feedback form"
    >
      <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.textPrimary} />
      <Text style={styles.label}>Feedback</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.bg,
    ...Shadows.button,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
