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

  const email = useAppSelector(selectForgotEmail);
  const emailSent = useAppSelector(selectEmailSent);
  const sentEmail = useAppSelector(selectSentEmail);
  const resendCooldown = useAppSelector(selectForgotResendCooldown);
  const status = useAppSelector(selectForgotPasswordStatus);
  const forgotError = useAppSelector(selectForgotPasswordError);

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentFade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    return () => {
      dispatch(resetForgotPasswordForm());
    };
  }, [dispatch, contentFade]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => dispatch(decrementCooldown()), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown, dispatch]);

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

  // Email Sent Confirmation
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
            <Text style={styles.checkIcon}>{'\u2713'}</Text>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
            <Text style={styles.sentTitle}>Check your email</Text>
            <Text style={styles.sentMessage}>
              We've sent password reset instructions to
            </Text>
            <View style={styles.emailBadge}>
              <Text style={styles.sentEmail}>{sentEmail}</Text>
            </View>

            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0}
              style={styles.resendButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text
                style={[
                  styles.resendText,
                  resendCooldown > 0 && styles.resendDisabled,
                ]}>
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Didn't receive it? Resend"}
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

  // Enter Email State
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
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <View style={styles.backIconContainer}>
                <Text style={styles.backArrow}>{'‹'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Animated.View style={{ opacity: contentFade }}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <View style={styles.lockIconInner}>
                  <Text style={styles.lockIconText}>{'?'}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.instruction}>
              Enter the email address associated with your account. We'll send you
              a link to reset your password.
            </Text>

            {/* Form */}
            <CustomInput
              label="Email Address"
              value={email}
              onChangeText={text => {
                dispatch(setForgotEmail(text));
                if (errors.email) setErrors({});
              }}
              placeholder="name@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            {/* Error */}
            {forgotError ? (
              <View style={styles.errorBox}>
                <View style={styles.errorIconContainer}>
                  <Text style={styles.errorIconChar}>!</Text>
                </View>
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
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backToSignInText}>
                {'‹ '}Back to Sign In
              </Text>
            </TouchableOpacity>
          </Animated.View>
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
    paddingHorizontal: spacing.lg + 4,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: colors.textPrimary,
    marginTop: -2,
    fontWeight: '300',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg + 4,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '0A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary + '20',
  },
  lockIconInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
    letterSpacing: -0.3,
  },
  instruction: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg + 4,
    paddingHorizontal: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.sm + 2,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  errorIconChar: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  errorBoxText: {
    flex: 1,
    fontSize: typography.small.fontSize,
    color: '#991B1B',
    fontFamily: typography.fontFamily,
    lineHeight: 18,
  },
  backToSignIn: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  backToSignInText: {
    fontSize: typography.body.fontSize,
    color: colors.primary,
    fontWeight: '500',
    fontFamily: typography.fontFamily,
  },

  // Sent State
  sentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  checkIcon: {
    fontSize: 40,
    color: colors.success,
    fontWeight: '700',
  },
  sentTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
    letterSpacing: -0.3,
  },
  sentMessage: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: typography.fontFamily,
  },
  emailBadge: {
    backgroundColor: colors.primary + '0A',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 8,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '15',
  },
  sentEmail: {
    fontSize: typography.body.fontSize,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  resendButton: {
    marginBottom: spacing.xl,
    paddingVertical: spacing.xs,
  },
  resendText: {
    fontSize: typography.small.fontSize,
    color: colors.primary,
    fontWeight: '500',
    fontFamily: typography.fontFamily,
  },
  resendDisabled: {
    color: colors.textLight,
  },
  sentButtonWrapper: {
    width: '100%',
  },
});

export default ForgotPasswordScreen;