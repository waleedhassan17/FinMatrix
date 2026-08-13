// ═══════════════════════════════════════════════════════
// FinMatrix — Forgot Password (3 steps in one screen)
// ═══════════════════════════════════════════════════════
//   request → email in, 6-digit code out
//   otp     → verify the code, receive a single-use reset token
//   reset   → set the new password, then back to sign-in
//
// The success path deliberately routes to SignIn WITH an explicit role and
// via reset(): the user has no session here, so nothing in this flow may
// touch a screen that reads a signed-in user's role, and Back must not
// return to a form holding a spent reset token.

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  authForgotPassword,
  authVerifyOtp,
  authResetPassword,
} from '../../../networks/auth/authNetwork';
import { useAppSelector } from '../../../hooks/useReduxHooks';
import { selectSelectedRole } from '../authSlice';
import {
  AuthScreen,
  AuthBrand,
  AuthBackLink,
  AuthHeading,
  AuthField,
  AuthPrimaryButton,
  AuthTextLink,
  AuthFooter,
  InlineBanner,
  StepBar,
  OtpInput,
  AUTH,
} from '../../../components/auth/AuthUI';
import type { RootStackParamList, UserRole } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

type Step = 'request' | 'otp' | 'reset';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const RESEND_COOLDOWN = 60;

const STEP_INDEX: Record<Step, number> = { request: 1, otp: 2, reset: 3 };

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Keep the portal the user originally chose — landing them on the admin
  // sign-in after resetting a delivery account would be wrong.
  const selectedRole = useAppSelector(selectSelectedRole);
  const role: UserRole = selectedRole ?? 'admin';

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const goToSignIn = () => {
    // reset(), not navigate(): the reset token is spent, so Back must not
    // return here. Falls back to navigate() if SignIn isn't in this stack.
    try {
      navigation.reset({ index: 0, routes: [{ name: 'SignIn', params: { role } }] });
    } catch {
      navigation.navigate('SignIn', { role });
    }
  };

  const handleRequest = async () => {
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authForgotPassword({ forgotPasswordInfo: { email: email.trim() } });
      setStep('otp');
      setCooldown(RESEND_COOLDOWN);
      setNotice('If an account exists, a 6-digit code was sent.');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    try {
      await authForgotPassword({ forgotPasswordInfo: { email: email.trim() } });
      setCooldown(RESEND_COOLDOWN);
      setNotice('Code resent');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to resend');
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { resetToken: rt } = await authVerifyOtp(email.trim(), otp);
      setResetToken(rt);
      setStep('reset');
    } catch (e: any) {
      setError(e?.message ?? 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!PASSWORD_REGEX.test(password)) {
      setError('Password must be 8+ chars with upper, lower and a number');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authResetPassword(email.trim(), resetToken, password);
      setNotice('Password updated successfully. Please sign in.');
      // Let the confirmation register before the screen changes.
      setTimeout(goToSignIn, 900);
    } catch (e: any) {
      setError(e?.message ?? 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Step, { title: string; subtitle: string }> = {
    request: {
      title: 'Reset password',
      subtitle: "Enter your email and we'll send you a 6-digit code.",
    },
    otp: {
      title: 'Enter code',
      subtitle: `We sent a 6-digit code to ${email}.`,
    },
    reset: {
      title: 'New password',
      subtitle: 'Choose a strong password for your account.',
    },
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('request');
      setError('');
      setNotice('');
      return;
    }
    if (step === 'reset') {
      setStep('otp');
      setError('');
      setNotice('');
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('RoleSelection');
    }
  };

  const clearError = () => {
    if (error) setError('');
  };

  return (
    <AuthScreen>
      <AuthBrand />
      <AuthBackLink onPress={handleBack} />

      <StepBar current={STEP_INDEX[step]} total={3} />

      <AuthHeading
        eyebrow={`Step ${STEP_INDEX[step]} of 3`}
        title={titles[step].title}
        subtitle={titles[step].subtitle}
      />

      {error ? (
        <InlineBanner tone="error" message={error} style={styles.banner} />
      ) : notice ? (
        <InlineBanner
          tone={step === 'reset' ? 'success' : 'info'}
          message={notice}
          style={styles.banner}
        />
      ) : null}

      {step === 'request' && (
        <>
          <AuthField
            label="Email address"
            value={email}
            onChangeText={t => {
              setEmail(t);
              clearError();
            }}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleRequest}
            returnKeyType="send"
          />
          <AuthPrimaryButton
            label="Send code"
            loading={loading}
            loadingLabel="Sending"
            onPress={handleRequest}
          />
        </>
      )}

      {step === 'otp' && (
        <>
          <Text style={styles.otpLabel}>6-digit code</Text>
          <OtpInput
            value={otp}
            onChange={t => {
              setOtp(t);
              clearError();
            }}
            error={!!error}
            autoFocus
            style={styles.otp}
          />
          <AuthPrimaryButton
            label="Verify code"
            loading={loading}
            loadingLabel="Verifying"
            onPress={handleVerifyOtp}
          />
          <View style={styles.linkRow}>
            <AuthTextLink
              label={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              onPress={handleResend}
              disabled={cooldown > 0}
              muted={cooldown > 0}
            />
          </View>
        </>
      )}

      {step === 'reset' && (
        <>
          <AuthField
            label="New password"
            value={password}
            onChangeText={t => {
              setPassword(t);
              clearError();
            }}
            placeholder="New password"
            secure
            autoCapitalize="none"
            hint="At least 8 characters, with an uppercase letter, a lowercase letter and a number."
          />
          <AuthField
            label="Confirm password"
            value={confirm}
            onChangeText={t => {
              setConfirm(t);
              clearError();
            }}
            placeholder="Confirm password"
            secure
            autoCapitalize="none"
            onSubmitEditing={handleReset}
            returnKeyType="done"
          />
          <AuthPrimaryButton
            label="Update password"
            loading={loading}
            loadingLabel="Updating"
            onPress={handleReset}
          />
        </>
      )}

      <View style={styles.linkRow}>
        <AuthTextLink label="Back to Sign In" onPress={goToSignIn} muted />
      </View>

      <AuthFooter />
    </AuthScreen>
  );
};

const styles = StyleSheet.create({
  banner: { marginBottom: AUTH.space.lg },
  otpLabel: {
    ...AUTH.type.label,
    color: AUTH.ink[700],
    marginBottom: AUTH.space.sm,
  },
  otp: { marginBottom: AUTH.space.xl },
  linkRow: { alignItems: 'center', marginTop: AUTH.space.xs },
});

export default ForgotPasswordScreen;
