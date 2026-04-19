import React, { useMemo, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, MinimalInput } from '../utils/theme';

type InputType = 'text' | 'email' | 'numeric' | 'phone' | 'password';

type Props = Omit<TextInputProps, 'style' | 'keyboardType' | 'secureTextEntry'> & {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  inputType?: InputType;
  error?: string;
  leftIconName?: keyof typeof Ionicons.glyphMap;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

function getKeyboardType(inputType: InputType): TextInputProps['keyboardType'] {
  if (inputType === 'email') return 'email-address';
  if (inputType === 'numeric') return 'number-pad';
  if (inputType === 'phone') return 'phone-pad';
  return 'default';
}

function getAutoCapitalize(inputType: InputType): TextInputProps['autoCapitalize'] {
  if (inputType === 'email' || inputType === 'password') return 'none';
  return 'sentences';
}

export default function GlassInput({
  label,
  value,
  onChangeText,
  inputType = 'text',
  error,
  leftIconName,
  containerStyle,
  inputContainerStyle,
  labelStyle,
  inputStyle,
  autoCapitalize,
  autoCorrect,
  placeholderTextColor,
  ...rest
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = inputType === 'password';

  const resolvedAutoCapitalize = autoCapitalize ?? getAutoCapitalize(inputType);
  const resolvedAutoCorrect = autoCorrect ?? !(inputType === 'email' || isPassword);

  const rightIcon = useMemo(() => {
    if (!isPassword) return null;
    return showPassword ? 'eye-off-outline' : 'eye-outline';
  }, [isPassword, showPassword]);

  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrapper,
          inputContainerStyle,
          error ? styles.inputWrapperError : null,
        ]}
      >
        {leftIconName ? (
          <Ionicons
            name={leftIconName}
            size={20}
            color={error ? Colors.accentRed : Colors.textMuted}
            style={styles.inputIcon}
          />
        ) : null}

        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          style={[styles.input, inputStyle]}
          keyboardType={getKeyboardType(inputType)}
          autoCapitalize={resolvedAutoCapitalize}
          autoCorrect={resolvedAutoCorrect}
          secureTextEntry={isPassword && !showPassword}
          placeholderTextColor={placeholderTextColor ?? Colors.textMuted}
        />

        {isPassword && rightIcon ? (
          <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeIcon}>
            <Ionicons name={rightIcon} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    ...MinimalInput,
    paddingHorizontal: 16,
  },
  inputWrapperError: {
    borderColor: Colors.accentRed,
    backgroundColor: Colors.accentRedDim,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    color: Colors.accentRed,
    fontSize: 12,
    marginTop: 6,
  },
});
