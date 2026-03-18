import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { colors, spacing, borderRadius } from '../theme';
import { THEME } from '../utils/theme';

interface CustomInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  multiline?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
}

const CustomInput: React.FC<CustomInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  leftIcon,
  rightIcon,
  disabled = false,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  const getBorderColor = () => {
    if (error) return colors.danger;
    if (isFocused) return colors.secondary;
    return colors.border;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          { borderColor: getBorderColor() },
          isFocused && styles.inputFocused,
          multiline && styles.multilineContainer,
          disabled && styles.inputDisabled,
        ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
            multiline ? styles.multilineInput : undefined,
            disabled ? styles.textDisabled : undefined,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
            <Text style={styles.eyeIcon}>{isPasswordVisible ? '👁️' : '🔒'}</Text>
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <View style={styles.rightIcon}>{rightIcon}</View>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...THEME.typography.bodyMd,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  labelError: {
    color: colors.danger,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: borderRadius.sm + 2,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm + 4,
  },
  inputFocused: {
    borderWidth: 1.5,
  },
  inputDisabled: {
    backgroundColor: colors.background,
    opacity: 0.7,
  },
  multilineContainer: {
    height: 120,
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    ...THEME.typography.bodyLg,
    color: colors.textPrimary,
    height: '100%',
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xs,
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
  textDisabled: {
    color: colors.textLight,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  eyeIcon: {
    fontSize: THEME.typography.h3.fontSize,
  },
  errorText: {
    ...THEME.typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});

export default CustomInput;
