import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '../../../theme';
import type { RootStackParamList } from '../../../types';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser, signOut } from '../authSlice';
import {
  authResendVerification,
  authVerifyEmail,
  authMe,
} from '../../../networks/auth/authNetwork';
import { setStoredCompanyId } from '../../../utils/storageUtils';
import Toast from 'react-native-toast-message';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'EmailVerification'>;
type RouteProps = RouteProp<RootStackParamList, 'EmailVerification'>;

const RESEND_COOLDOWN = 60;

const EmailVerificationScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const user = useAppSelector(s => s.auth.user);
  const email = route.params?.email ?? user?.email ?? '';
  const token = route.params?.token;

  const [verified, setVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Pull the latest profile and update the store so the navigator advances.
  const refreshSession = useCallback(async () => {
    try {
      const { data } = await authMe();
      if (data.companyId) await setStoredCompanyId(data.companyId);
      dispatch(setUser(data.user));
      return data.user;
    } catch {
      return null;
    }
  }, [dispatch]);

  // ─── Auto-verify when opened from a deep link with a token ──────────────
  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      setIsVerifying(true);
      try {
        await authVerifyEmail(token);
        if (!active) return;
        setVerified(true);
        Toast.show({ type: 'success', text1: 'Email verified!' });
        // Auto-advance: if a session exists (tokens stored at signup), pulling
        // the profile flips the navigator to the company-details step.
        await refreshSession();
      } catch (e: any) {
        if (!active) return;
        Toast.show({ type: 'error', text1: e?.message ?? 'Verification failed' });
      } finally {
        if (active) setIsVerifying(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, refreshSession]);

  // ─── Resend cooldown timer ─────────────────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending || !email) return;
    setIsResending(true);
    try {
      await authResendVerification({ resendInfo: { email } });
      setCooldown(RESEND_COOLDOWN);
      Toast.show({ type: 'success', text1: 'Verification email sent!' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message ?? 'Failed to resend' });
    } finally {
      setIsResending(false);
    }
  };

  const handleContinue = async () => {
    setIsChecking(true);
    // Tokens are stored at signup, so a profile fetch usually succeeds even
    // before the navigator considers us "authenticated".
    const u = await refreshSession();
    setIsChecking(false);
    if (!u) {
      // No usable session (e.g. fresh deep-link install) → sign in.
      navigation.navigate('SignIn');
      return;
    }
    if (!u.isEmailVerified) {
      Toast.show({ type: 'info', text1: 'Not verified yet — check your email.' });
    }
  };

  const handleBackToSignIn = () => {
    dispatch(signOut());
    navigation.navigate('SignIn');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{verified ? '✅' : '✉️'}</Text>
      </View>

      <Text style={styles.title}>
        {verified ? 'Email verified' : 'Verify your email'}
      </Text>

      {isVerifying ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : verified ? (
        <Text style={styles.subtitle}>
          Your email has been verified. Continue to finish setting up your company.
        </Text>
      ) : (
        <Text style={styles.subtitle}>
          We sent a verification link to{'\n'}
          <Text style={styles.email}>{email || 'your email'}</Text>.{'\n'}
          Open it on this device to continue.
        </Text>
      )}

      {/* Primary action */}
      <TouchableOpacity
        style={[styles.button, (isChecking || isVerifying) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={isChecking || isVerifying}>
        {isChecking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {verified
              ? isAuthenticated
                ? 'Continue'
                : 'Go to Sign In'
              : "I've verified — continue"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Resend */}
      {!verified && (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={handleResend}
          disabled={cooldown > 0 || isResending}>
          <Text style={[styles.linkText, cooldown > 0 && styles.linkDisabled]}>
            {isResending
              ? 'Sending…'
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : 'Resend verification email'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.linkButton} onPress={handleBackToSignIn}>
        <Text style={styles.linkMuted}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { fontSize: 44 },
  title: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  email: { color: colors.textPrimary, fontWeight: '700' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    alignSelf: 'stretch',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...typography.button, color: '#fff' },
  linkButton: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { ...typography.label, color: colors.primary },
  linkDisabled: { color: colors.textTertiary },
  linkMuted: { ...typography.label, color: colors.textSecondary },
});

export default EmailVerificationScreen;
