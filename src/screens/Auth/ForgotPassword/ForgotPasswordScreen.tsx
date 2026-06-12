import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, radius } from '../../../theme';
import {
  authForgotPassword,
  authVerifyOtp,
  authResetPassword,
} from '../../../network/authNetwork';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

type Step = 'request' | 'otp' | 'reset';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const RESEND_COOLDOWN = 60;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

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
      Toast.show({
        type: 'success',
        text1: 'Check your email',
        text2: 'If an account exists, a 6-digit code was sent.',
      });
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await authForgotPassword({ forgotPasswordInfo: { email: email.trim() } });
      setCooldown(RESEND_COOLDOWN);
      Toast.show({ type: 'success', text1: 'Code resent' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message ?? 'Failed to resend' });
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setLoading(true);
    setError('');
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
      setError(
        'Password must be 8+ chars with upper, lower and a number',
      );
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
      Toast.show({ type: 'success', text1: 'Password updated. Please sign in.' });
      navigation.navigate('SignIn');
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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><Feather name="arrow-left" size={17} color={colors.textSecondary} style={{ marginRight: 2 }} /><Text style={styles.backText}>Back</Text></View>
        </TouchableOpacity>

        <Text style={styles.title}>{titles[step].title}</Text>
        <Text style={styles.subtitle}>{titles[step].subtitle}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step === 'request' && (
          <>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={t => {
                setEmail(t);
                if (error) setError('');
              }}
              placeholder="you@company.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <PrimaryButton label="Send code" loading={loading} onPress={handleRequest} />
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={styles.label}>6-digit code</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              value={otp}
              onChangeText={t => {
                setOtp(t.replace(/\D/g, '').slice(0, 6));
                if (error) setError('');
              }}
              placeholder="------"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={6}
            />
            <PrimaryButton label="Verify code" loading={loading} onPress={handleVerifyOtp} />
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleResend}
              disabled={cooldown > 0}>
              <Text style={[styles.link, cooldown > 0 && styles.linkDisabled]}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'reset' && (
          <>
            <Text style={styles.label}>New password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={t => {
                setPassword(t);
                if (error) setError('');
              }}
              placeholder="New password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={t => {
                setConfirm(t);
                if (error) setError('');
              }}
              placeholder="Confirm password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
            />
            <PrimaryButton label="Update password" loading={loading} onPress={handleReset} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const PrimaryButton: React.FC<{
  label: string;
  loading: boolean;
  onPress: () => void;
}> = ({ label, loading, onPress }) => (
  <TouchableOpacity
    style={[styles.button, loading && styles.buttonDisabled]}
    onPress={onPress}
    disabled={loading}>
    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  back: { marginBottom: spacing.lg },
  backText: { ...typography.label, color: colors.textSecondary },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  error: {
    ...typography.bodySmall,
    color: '#DE350B',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  otpInput: {
    letterSpacing: 8,
    textAlign: 'center',
    fontSize: 22,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: spacing.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...typography.button, color: '#fff' },
  linkButton: { marginTop: spacing.lg, alignItems: 'center' },
  link: { ...typography.label, color: colors.primary },
  linkDisabled: { color: colors.textTertiary },
});

export default ForgotPasswordScreen;
