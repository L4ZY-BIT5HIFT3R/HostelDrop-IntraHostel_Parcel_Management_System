import React, { useState } from 'react';
import { StyleProp, StyleSheet, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

type Props = {
  value: string;
  onChangeText: (query: string) => void;
  placeholder?: string;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search…',
  onClear,
  containerStyle,
}: Props) {
  const [focused, setFocused] = useState(false);
  const safeValue = value ?? '';
  const hasQuery = safeValue.length > 0;

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View style={[styles.field, focused && styles.fieldFocused, containerStyle]}>
      <Ionicons name="search" size={18} color={focused ? Colors.accent : Colors.textMuted} />
      <TextInput
        style={styles.input}
        value={safeValue}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {hasQuery ? (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 10,
  },
  fieldFocused: {
    borderColor: Colors.accent,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
});
