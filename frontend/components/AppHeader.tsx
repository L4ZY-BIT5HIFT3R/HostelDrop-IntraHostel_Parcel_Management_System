import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

export type AppHeaderAction = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void | Promise<void>;
  color?: string;
  size?: number;
  accessibilityLabel?: string;
  buttonStyle?: StyleProp<ViewStyle>;
};

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  onBackPress?: () => void | Promise<void>;
  backAccessibilityLabel?: string;
  actions?: AppHeaderAction[];
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  titleContainerStyle?: StyleProp<ViewStyle>;
};

export default function AppHeader({
  title,
  subtitle,
  onBackPress,
  backAccessibilityLabel = 'Go back',
  actions = [],
  containerStyle,
  titleStyle,
  subtitleStyle,
  titleContainerStyle,
}: AppHeaderProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {onBackPress ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            void onBackPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={backAccessibilityLabel}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      ) : null}

      <View style={[styles.titleContainer, onBackPress ? styles.titleContainerWithBack : null, titleContainerStyle]}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text> : null}
      </View>

      {actions.length ? (
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={`${action.icon}-${index}`}
              style={[styles.actionButton, action.buttonStyle]}
              onPress={() => {
                void action.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
            >
              <Ionicons
                name={action.icon}
                size={action.size ?? 22}
                color={action.color ?? Colors.textPrimary}
              />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  titleContainerWithBack: {
    marginLeft: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
});
