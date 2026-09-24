// ═══════════════════════════════════════════════════════
// FinMatrix — Email Verification gate
// ═══════════════════════════════════════════════════════
// Reached after signup or an unverified sign-in (tokens are stored, the
// account is unverified), and from the finmatrix://verify-email deep link.
//
// It moves on BY ITSELF. It re-reads the account every few seconds while open
// and the moment the app returns to the foreground — which is when an owner
// comes back from their mail app — and the navigator mounts company setup as
// soon as the account reads verified. It used to wait for "I've verified —
// continue", and a link opened on a computer left the phone sitting here.
//
// A deep link may carry a token (spent here) or only `verified=1` (the web
// page or the API's own page already confirmed the address; nothing to spend).
// Either way the account is re-read before anything is called a failure: a
// token the web page already used is not an unverified email.
//
// Feedback renders inline rather than as a floating toast: <Toast/> is
// mounted without a toastConfig, so its default styling sits outside this
// flow's design language and drifts away from the action that produced it.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, AppState } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, UserRole } from '../../../types';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser, selectSelectedRole } from '../authSlice';
import {
  authResendVerification,
  authVerifyEmail,
  authMe
} from '../../../networks/auth/authNetwork';
import { setStoredCompanyId } from '../../../utils/storageUtils';
import { useSignOut } from '../../../hooks/useSignOut';
import { THEME } from '../../../theme';

// Design-system tokens (see src/theme/theme.ts).
const { typography } = THEME;
import {
  AuthLayout,
  AuthHeader,
  AuthFooterBar,
  AuthIconTile,
  AuthNotice,
  AuthHelpCard,
  AUTH,
  type AuthTone
} from '../../../components/auth/AuthUI';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'EmailVerification'>;
type RouteProps = RouteProp<RootStackParamList, 'EmailVerification'>;

const RESEND_COOLDOWN = 60;
/** How often the screen re-reads the account while it is open. */
const POLL_MS = 5000;

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
  const confirmedElsewhere = route.params?.verified === '1';

  const [verified, setVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<{ tone: AuthTone; message: string } | null>(
    null,
  );

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

  // ─── Auto-verify when opened from a deep link ──────────────────────────
  // Once per link: a token is single-use, and signing in afterwards must not
  // send it again.
  const handledLink = useRef<string | null>(null);
  useEffect(() => {
    if (!token && !confirmedElsewhere) return;
    const linkKey = token ?? 'verified';
    if (handledLink.current === linkKey) return;
    handledLink.current = linkKey;
    let active = true;
    (async () => {
      setIsVerifying(true);
      try {
        if (token) await authVerifyEmail(token);
        if (!active) return;
        setVerified(true);
        setNotice({ tone: 'success', message: 'Email verified!' });
        // Signed in: re-reading the account moves the navigator on.
        if (isAuthenticated) await refreshSession();
      } catch (e: any) {
        if (!active) return;
        // A spent token is not an unverified email — the web page may have
        // used it a moment ago. Ask the account before saying anything failed.
        const u = isAuthenticated ? await refreshSession() : null;
        if (!active) return;
        if (u?.isEmailVerified) {
          setVerified(true);
          setNotice({ tone: 'success', message: 'Email verified!' });
        } else {
          setNotice({ tone: 'error', message: e?.message ?? 'Verification failed' });
        }
      } finally {
        if (active) setIsVerifying(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, confirmedElsewhere, isAuthenticated, refreshSession]);

  // ─── Watch for the link being opened anywhere else ───────────────────────
  // Every few seconds, and when the app comes back to the foreground. Only
  // while signed in and not yet verified: refreshSession dispatches the fresh
  // user, and the navigator swaps to company setup the moment it reads
  // verified — this screen needs no navigation of its own.
  const watching = isAuthenticated && !verified && !isVerifying;
  const inFlight = useRef(false);
  const checkQuietly = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await refreshSession();
    } finally {
      inFlight.current = false;
    }
  }, [refreshSession]);

  useEffect(() => {
    if (!watching) return;
    const id = setInterval(() => void checkQuietly(), POLL_MS);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void checkQuietly();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [watching, checkQuietly]);

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
    // Signed out (the link was opened with no session on this phone): the
    // address is confirmed, so signing in is the one step left.
    if (!isAuthenticated) {
      navigation.navigate('SignIn', { role });
      return;
    }
    setIsChecking(true);
    const u = await refreshSession();
    setIsChecking(false);
    if (!u) {
      navigation.navigate('SignIn', { role });
      return;
    }
    if (!u.isEmailVerified) {
      setNotice({
        tone: 'info',
        message: "We haven't seen the confirmation yet. Open the link in the email — this screen moves on by itself.",
      });
    }
  };

  // Signup stores tokens before the email is verified, so returning to
  // sign-in must clear that half-session or a cold start would restore it.
  const handleBackToSignIn = () => signOutNow();

  return (
    <AuthLayout
      header={
        <AuthHeader
          pill="Verify Email"
          title={verified ? 'Email verified' : 'Verify your email'}
          subtitle={
            verified
              ? isAuthenticated
                ? 'Your email has been verified. Taking you to company setup…'
                : 'Your email has been verified. Sign in to set up your company.'
              : 'Open the link we emailed you — on this phone or any computer. This screen moves on by itself.'
          }
        />
      }
      footer={
        <AuthFooterBar
          primary={{
            label: verified
              ? isAuthenticated
                ? 'Continue'
                : 'Go to Sign In'
              : "I've verified — continue",
            onPress: handleContinue,
            loading: isChecking,
            loadingLabel: 'Checking',
            disabled: isVerifying,
          }}
          secondary={{ label: 'Back to Sign In', onPress: handleBackToSignIn }}
        />
      }>
      {notice ? (
        <AuthNotice
          tone={notice.tone}
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      <AuthIconTile
        icon={verified ? 'check-circle' : 'mail'}
        tone={verified ? 'success' : 'brand'}
        style={styles.tile}
      />

      {isVerifying ? (
        <ActivityIndicator color={AUTH.brand} style={styles.spinner} />
      ) : null}

      {email ? (
        <View style={styles.sentTo}>
          <Text style={styles.sentToLabel}>Sent to</Text>
          <Text style={styles.sentToValue} numberOfLines={1}>
            {email}
          </Text>
        </View>
      ) : null}

      {!verified ? (
        <AuthHelpCard
          message={
            cooldown > 0
              ? `You can request another email in ${cooldown}s. Check your spam folder if it hasn't arrived.`
              : isResending
              ? 'Sending…'
              : "Didn't get it? Tap Resend below after checking your spam folder."
          }
        />
      ) : null}

      {!verified ? (
        <Text
          style={[styles.resend, (cooldown > 0 || isResending) && styles.resendOff]}
          onPress={cooldown > 0 || isResending ? undefined : handleResend}
          accessibilityRole="button">
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
        </Text>
      ) : null}
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  tile: { marginBottom: AUTH.space.xl },
  spinner: { marginBottom: AUTH.space.lg },
  // Label above value, both left-aligned. Pushing the address to the right
  // edge squeezes long ones and forces the eye across the card to read the
  // one thing that matters here.
  sentTo: {
    gap: 2,
    backgroundColor: AUTH.surface,
    borderWidth: 1,
    borderColor: AUTH.line,
    borderRadius: AUTH.radius.lg,
    paddingVertical: AUTH.space.lg,
    paddingHorizontal: AUTH.space.lg,
    marginBottom: AUTH.space.lg,
  },
  sentToLabel: { ...THEME.typography.caption, fontFamily: AUTH.font, color: AUTH.ink[500] },
  sentToValue: {
    ...THEME.typography.labelLg,
    fontFamily: AUTH.font,
    color: AUTH.ink[900],
  },
  resend: {
    ...THEME.typography.h5,
    fontFamily: AUTH.font,
    color: AUTH.brand,
    textAlign: 'center',
    paddingVertical: AUTH.space.xl,
  },
  resendOff: { color: AUTH.ink[400], fontWeight: typography.labelLg.fontWeight }
});

export default EmailVerificationScreen;
