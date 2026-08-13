// ═══════════════════════════════════════════════════════
// FinMatrix — Email Verification gate
// ═══════════════════════════════════════════════════════
// Reached after signup (tokens are stored but the account is unverified) and
// from the finmatrix://verify-email deep link, which carries a token and
// auto-verifies on mount.
//
// Feedback renders as an inline banner inside the card rather than a floating
// toast: <Toast/> is mounted without a toastConfig, so its default styling
// sits outside this flow's design language and drifts away from the action
// that produced it.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, UserRole } from '../../../types';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser, selectSelectedRole } from '../authSlice';
import {
  authResendVerification,
  authVerifyEmail,
  authMe,
} from '../../../networks/auth/authNetwork';
import { setStoredCompanyId } from '../../../utils/storageUtils';
import { useSignOut } from '../../../hooks/useSignOut';
import {
  AuthScreen,
  AuthHeader,
  AuthCard,
  AuthMedallion,
  AuthPrimaryButton,
  AuthLinkButton,
  InlineBanner,
  AUTH_DS,
  type AuthTone,
} from '../../../components/auth/AuthUI';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'EmailVerification'>;
type RouteProps = RouteProp<RootStackParamList, 'EmailVerification'>;

const RESEND_COOLDOWN = 60;

const EmailVerificationScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const dispatch = useAppDispatch();
  const { signOutNow } = useSignOut();

  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);
  const user = useAppSelector(s => s.auth.user);
  const selectedRole = useAppSelector(selectSelectedRole);
  const role: UserRole = selectedRole ?? 'admin';
  const email = route.params?.email ?? user?.email ?? '';
  const token = route.params?.token;

  const [verified, setVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<{ tone: AuthTone; message: string } | null>(
    null,
  );

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
        setNotice({ tone: 'success', message: 'Email verified!' });
        // Auto-advance: if a session exists (tokens stored at signup), pulling
        // the profile flips the navigator to the company-details step.
        await refreshSession();
      } catch (e: any) {
        if (!active) return;
        setNotice({ tone: 'error', message: e?.message ?? 'Verification failed' });
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
      setNotice({ tone: 'success', message: 'Verification email sent!' });
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message ?? 'Failed to resend' });
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
      navigation.navigate('SignIn', { role });
      return;
    }
    if (!u.isEmailVerified) {
      setNotice({ tone: 'info', message: 'Not verified yet — check your email.' });
    }
  };

  // Signup stores tokens before the email is verified, so returning to sign-in
  // must clear that half-session or a cold start would restore it.
  const handleBackToSignIn = () => signOutNow();

  return (
    <AuthScreen>
      <AuthHeader
        title={verified ? 'Email verified' : 'Verify your email'}
        subtitle={
          verified
            ? 'Your email has been verified. Continue to finish setting up your company.'
            : 'Confirm your address to activate your FinMatrix account.'
        }
        pill="Verify Email"
        compact
      />

      <AuthCard>
        <AuthMedallion
          icon={verified ? 'check-circle' : 'mail'}
          tone={verified ? 'success' : 'brand'}
        />

        {notice ? (
          <InlineBanner
            tone={notice.tone}
            message={notice.message}
            onDismiss={() => setNotice(null)}
            style={styles.banner}
          />
        ) : null}

        {isVerifying ? (
          <ActivityIndicator color={AUTH_DS.green500} style={styles.spinner} />
        ) : verified ? (
          <Text style={styles.body}>
            Your email has been verified. Continue to finish setting up your
            company.
          </Text>
        ) : (
          <Text style={styles.body}>
            We sent a verification link to{'\n'}
            <Text style={styles.email}>{email || 'your email'}</Text>.{'\n'}
            Open it on this device to continue.
          </Text>
        )}

        <AuthPrimaryButton
          label={
            verified
              ? isAuthenticated
                ? 'Continue'
                : 'Go to Sign In'
              : "I've verified — continue"
          }
          loading={isChecking}
          loadingLabel="Checking…"
          disabled={isVerifying}
          onPress={handleContinue}
          style={styles.cta}
        />

        {!verified && (
          <AuthLinkButton
            label={
              isResending
                ? 'Sending…'
                : cooldown > 0
                ? `Resend in ${cooldown}s`
                : 'Resend verification email'
            }
            onPress={handleResend}
            disabled={cooldown > 0 || isResending}
            muted={cooldown > 0}
          />
        )}

        <View style={styles.footerLink}>
          <AuthLinkButton label="Back to Sign In" onPress={handleBackToSignIn} muted />
        </View>
      </AuthCard>
    </AuthScreen>
  );
};

const styles = StyleSheet.create({
  banner: { marginBottom: 16 },
  spinner: { marginVertical: 20 },
  body: {
    fontFamily: AUTH_DS.font,
    fontSize: 14,
    lineHeight: 22,
    color: AUTH_DS.slate500,
    textAlign: 'center',
    marginBottom: 4,
  },
  email: { fontWeight: '700', color: AUTH_DS.navy800 },
  cta: { marginTop: 18 },
  footerLink: { marginTop: 2 },
});

export default EmailVerificationScreen;
