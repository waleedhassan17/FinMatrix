// ═══════════════════════════════════════════════════════
// FinMatrix — OtpInput (segmented one-time-code field)
// ═══════════════════════════════════════════════════════
// Renders `length` boxes but is driven by ONE real TextInput stretched
// transparently across them.
//
// Why one input and not one per box: a single input receives an entire pasted
// or SMS-autofilled string in a single onChangeText, so paste works on web and
// native for free, along with caret movement, selection and backspace. Six
// separate inputs only ever fill the first box on paste and need fragile
// ref-chaining and onKeyPress handling to fake the rest.
//
// Emits digits only, so callers keep whatever validation they already have
// (the forgot-password flow's /^\d{6}$/ still applies unchanged).

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AUTH } from './authTokens';

export interface OtpInputProps {
  /** Current digits (already stripped to `length`). */
  value: string;
  onChange: (digits: string) => void;
  length?: number;
  autoFocus?: boolean;
  error?: boolean;
  disabled?: boolean;
  /** Fired once the last box is filled — handy for auto-submit. */
  onComplete?: (digits: string) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  error = false,
  disabled = false,
  onComplete,
  style,
  testID,
}) => {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  const boxes = Array.from({ length }, (_, i) => i);
  // The box the caret sits in: the next empty one, or the last while full.
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={[styles.row, style]}
      testID={testID}
      accessibilityRole="none">
      {boxes.map(i => {
        const char = value[i] ?? '';
        const isActive = focused && i === activeIndex && !disabled;
        return (
          <View
            key={i}
            style={[
              styles.box,
              char !== '' && styles.boxFilled,
              isActive && styles.boxActive,
              error && styles.boxError,
              disabled && styles.boxDisabled,
            ]}>
            <Text style={styles.digit}>{char}</Text>
            {isActive && char === '' ? <View style={styles.caret} /> : null}
          </View>
        );
      })}

      {/* The real field — invisible, but covers the whole row so taps and the
          platform's own paste/autofill affordances land on it. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hiddenInput}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        selectTextOnFocus={false}
        // SMS autofill: iOS reads the code from Messages, Android from the
        // SMS Retriever / autofill service.
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        importantForAutofill="yes"
        accessibilityLabel={`${length}-digit code`}
        testID={testID ? `${testID}-input` : undefined}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    position: 'relative',
  },
  box: {
    flex: 1,
    height: 48,
    maxWidth: 52,
    borderRadius: AUTH.control.radius,
    borderWidth: 1,
    borderColor: AUTH.line.DEFAULT,
    backgroundColor: AUTH.surface.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: AUTH.line.strong },
  // Focus is a border weight/colour change - no glow, no shadow.
  boxActive: { borderColor: AUTH.brand.DEFAULT, borderWidth: 1.5 },
  boxError: { borderColor: AUTH.status.error.accent },
  boxDisabled: { backgroundColor: AUTH.surface.sunken },
  digit: {
    fontFamily: AUTH.font,
    fontSize: 19,
    fontWeight: '600',
    color: AUTH.ink[900],
  },
  caret: {
    position: 'absolute',
    width: 1.5,
    height: 20,
    borderRadius: 1,
    backgroundColor: AUTH.brand.DEFAULT,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0,
    color: 'transparent',
    fontSize: 19,
    textAlign: 'center',
  },
});

export default OtpInput;
