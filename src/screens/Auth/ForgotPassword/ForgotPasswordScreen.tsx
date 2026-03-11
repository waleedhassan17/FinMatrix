import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CustomButton from '../../../Custom-Components/CustomButton';
import CustomInput from '../../../Custom-Components/CustomInput';
import { colors, typography, spacing, borderRadius } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  setForgotEmail,
  clearForgotPasswordError,
  decrementCooldown,
  submitForgotPasswordAsync,
  resetForgotPasswordForm,
  selectForgotEmail,
  selectEmailSent,
  selectSentEmail,
  selectForgotResendCooldown,
  selectForgotPasswordStatus,
  selectForgotPasswordError,
} from './forgotPasswordSlice';
import { validateForgotPassword } from '../../../models/authModel';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();

  // ── Slice selectors ──
  const email = useAppSelector(selectForgotEmail);
  const emailSent = useAppSelector(selectEmailSent);
  const sentEmail = useAppSelector(selectSentEmail);
  const resendCooldown = useAppSelector(selectForgotResendCooldown);
  const status = useAppSelector(selectForgotPasswordStatus);
  const forgotError = useAppSelector(selectForgotPasswordError);

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    return () => {
      dispatch(resetForgotPasswordForm());
    };
  }, [dispatch]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => dispatch(decrementCooldown()), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown, dispatch]);

  // Animate success state
  useEffect(() => {
    if (emailSent) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [emailSent, fadeAnim, scaleAnim]);

  const handleSendReset = async () => {
    dispatch(clearForgotPasswordError());
    const validationErrors = validateForgotPassword(email);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    dispatch(submitForgotPasswordAsync({ email: email.trim() }));
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    dispatch(clearForgotPasswordError());
    dispatch(submitForgotPasswordAsync({ email: sentEmail }));
  };

  // ─── State 2: Email Sent Confirmation ──────────────
  if (emailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.sentContainer}>
          <Animated.View
            style={[
              styles.checkCircle,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}>
            <Text style={styles.checkIcon}>✓</Text>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
            <Text style={styles.sentTitle}>Check Your Email</Text>
            <Text style={styles.sentMessage}>
              We've sent password reset instructions to
            </Text>
            <Text style={styles.sentEmail}>{sentEmail}</Text>

            {/* Resend */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0}
              style={styles.resendButton}>
              <Text
                style={[
                  styles.resendText,
                  resendCooldown > 0 && styles.resendDisabled,
                ]}>
                {resendCooldown > 0
                  ? `Didn't receive? Resend in ${resendCooldown}s`
                  : "Didn't receive? Resend"}
              </Text>
            </TouchableOpacity>

            <View style={styles.sentButtonWrapper}>
              <CustomButton
                title="Back to Sign In"
                onPress={() => navigation.goBack()}
                variant="primary"
                size="lg"
                fullWidth
              />
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── State 1: Enter Email ──────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reset Password</Text>
            <View style={styles.spacer} />
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Text style={styles.lockIcon}>🔑</Text>
            </View>
          </View>

          <Text style={styles.instruction}>
            Enter the email address associated with your account and we'll send
            you instructions to reset your password.
          </Text>

          {/* Form */}
          <CustomInput
            label="Email Address"
            value={email}
            onChangeText={text => {
              dispatch(setForgotEmail(text));
              if (errors.email) setErrors({});
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            leftIcon={<Text style={styles.inputIcon}>✉️</Text>}
          />

          {/* Auth Error */}
          {forgotError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{forgotError}</Text>
            </View>
          ) : null}

          <CustomButton
            title="Send Reset Link"
            onPress={handleSendReset}
            variant="primary"
            size="lg"
            fullWidth
            isLoading={status === 'loading'}
          />

          <TouchableOpacity
            style={styles.backToSignIn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backToSignInText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  backArrow: { fontSize: 24, color: colors.textPrimary },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    flex: 1,
  },
  spacer: { width: 40 },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: { fontSize: 36 },
  instruction: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  inputIcon: { fontSize: 16 },
  errorBox: {
    backgroundColor: colors.danger + '12',
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  errorBoxText: {
    ...typography.small,
    color: colors.danger,
  },
  backToSignIn: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  backToSignInText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '500',
  },

  // ── State 2 Styles ──
  sentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  checkIcon: {
    fontSize: 48,
    color: colors.success,
    fontWeight: '700',
  },
  sentTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sentMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  sentEmail: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  resendButton: {
    marginBottom: spacing.xl,
  },
  resendText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '500',
  },
  resendDisabled: {
    color: colors.textLight,
  },
  sentButtonWrapper: {
    width: '100%',
  },
});

export default ForgotPasswordScreen;
