import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassInput from './GlassInput';
import { Colors, GlassInput as GlassInputStyle } from '../utils/theme';

type Props = {
  value: string;
  onChangeText: (query: string) => void;
  placeholder?: string;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  clearButtonStyle?: StyleProp<ViewStyle>;
};

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  containerStyle,
  inputContainerStyle,
  clearButtonStyle,
}: Props) {
  const safeValue = value ?? '';
  const hasQuery = safeValue.trim().length > 0;

  const handleClear = () => {
    if (!safeValue.length) {
      onClear?.();
      return;
    }

    onChangeText('');
    onClear?.();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <GlassInput
        leftIconName="search"
        placeholder={placeholder}
        value={safeValue}
        onChangeText={onChangeText}
        containerStyle={styles.inputWrap}
        inputContainerStyle={[styles.inputContainer, inputContainerStyle]}
      />

      {hasQuery ? (
        <TouchableOpacity
          onPress={handleClear}
          style={[styles.clearButton, clearButtonStyle]}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    ...GlassInputStyle,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
  },
  inputWrap: {
    flex: 1,
  },
  inputContainer: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  clearButton: {
    marginLeft: 8,
  },
});
