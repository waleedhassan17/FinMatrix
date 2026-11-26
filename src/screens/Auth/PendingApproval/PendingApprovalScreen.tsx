// ═══════════════════════════════════════════════════════
// FinMatrix — Awaiting Approval gate
// ═══════════════════════════════════════════════════════
// Shown while a submitted company sits in super-admin review. Two entry
// points: `fromLogin` (a blocked sign-in, so there is no session to poll)
// and the live post-submission session.
//
// The timeline exists because "awaiting approval" with no other information
// reads as "stuck". Showing what has already completed makes the wait legible.
//
// The same screen serves a HELD free trial: the trial was not started
// instantly because our team checks a few (the reason is never shown). Which
// one applies comes from the session's pendingKind (or, from a blocked
// sign-in, the gate's).

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, AppState } from 'react-native';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser, selectSelectedRole } from '../authSlice';
import { authMe } from '../../../networks/auth/authNetwork';
import { refreshSessionTokens } from '../../../networks/network/apiHelpers';
import { bootstrapSession } from '../../../components/app-container/appContainerSlice';
// BILLING-DISABLED BUILD: un-comment with the /billing/status effect below.
// import {
//   getBillingStatusAPI,
//   type BillingStatus,
// } from '../../../networks/billing/billingNetwork';
import { setStoredCompanyId } from '../../../utils/storageUtils';
import { LAUNCH } from '../../../config/launchStrings';
import { useSignOut } from '../../../hooks/useSignOut';
import type { UserRole } from '../../../types';
import { THEME } from '../../../theme';
import {
  AuthLayout,
  AuthHeader,
  AuthFooterBar,
  AuthIconTile,
  AuthNotice,
  AuthTimeline,
  StatusPill,
  AUTH,
  type AuthTone
} from '../../../components/auth/AuthUI';

const PendingApprovalScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const fromLogin = !!route.params?.fromLogin;
  const user = useAppSelector(s => s.auth.user);
  const selectedRole = useAppSelector(selectSelectedRole);
  const role: UserRole = selectedRole ?? 'admin';
  const { confirmSignOut, signOutNow } = useSignOut();

  const [checking, setChecking] = useState(false);
  // Set once the review comes back approved. The user is NOT signed out
  // automatically: they are told the outcome and choose when to continue,
  // rather than having the screen yanked out from under them.
  const [approved, setApproved] = useState(false);
  const [notice, setNotice] = useState<{ tone: AuthTone; message: string } | null>(
    null,
  );
  // BILLING-DISABLED BUILD: un-comment with the /billing/status effect below.
  // const [billing, setBilling] = useState<BillingStatus | null>(null);
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);

  // This screen is registered in the signed-out stack only as the hand-off
  // from a blocked sign-in (fromLogin). On web, a reload of /PendingApproval
  // with no session restores it from the URL anyway — it would show a review
  // the owner can no longer check, with the wrong copy. Send them to the start
  // of sign-in. Deferred a tick so the navigator restored from the URL is
  // ready to handle the reset; only a navigator that has RoleSelection (the
  // signed-out one) can.
  useEffect(() => {
    if (isAuthenticated || fromLogin) return;
    const id = setTimeout(() => {
      const names: string[] = navigation.getState?.()?.routeNames ?? [];
      if (names.includes('RoleSelection')) {
        navigation.reset({ index: 0, routes: [{ name: 'RoleSelection' }] });
      }
    }, 0);
    return () => clearTimeout(id);
  }, [isAuthenticated, fromLogin, navigation]);

  // Fallback only, for when the token could not be re-issued (see goLive):
  // sign out so the owner signs in again with a token that carries the
  // company. On web, clear the /PendingApproval URL first — otherwise the
  // signed-out navigator restores this screen from it instead of opening at
  // the start of sign-in.
  const continueToSignIn = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
    signOutNow();
  }, [signOutNow]);

  // BILLING-DISABLED BUILD: nothing can be in billing review any more, so
  // there is nothing to ask /billing/status about.
  //
  // // A signed-in session can ask what is in review; a blocked sign-in cannot
  // // (no token), which is why the gate passes pendingKind along instead.
  // useEffect(() => {
  //   if (fromLogin || !isAuthenticated) return;
  //   let cancelled = false;
  //   getBillingStatusAPI()
  //     .then(st => {
  //       if (!cancelled) setBilling(st);
  //     })
  //     .catch(() => {
  //       /* copy falls back to the payment wording's neutral parts */
  //     });
  //   return () => {
  //     cancelled = true;
  //   };
  // }, [fromLogin, isAuthenticated]);
  // A held free trial (we check a few) vs a request for approval.
  const isTrialRequest =
    route.params?.pendingKind === 'trial' || user?.pendingKind === 'trial';

  const backToSignIn = useCallback(() => {
    navigation.navigate('SignIn', { role });
  }, [navigation, role]);

  // Approved: straight into the app. The session's token was minted before
  // the company existed and names none; the server fills it in on refresh, so
  // re-issue it, then re-read the account — the navigator mounts the
  // dashboard as soon as the approved status lands. This used to sign the
  // owner out and make them sign in again to get that token.
  const wentLive = useRef(false);
  const goLive = useCallback(async () => {
    if (wentLive.current) return;
    wentLive.current = true;
    const refreshed = await refreshSessionTokens();
    if (!refreshed) {
      // Could not re-issue it: fall back to the old path, which always works.
      wentLive.current = false;
      setApproved(true);
      setNotice({
        tone: 'success',
        message: 'Your company has been approved. Sign in again to start using FinMatrix.',
      });
      return;
    }
    Toast.show({
      type: 'success',
      text1: 'Your company is approved',
      text2: 'Welcome to FinMatrix.',
    });
    await dispatch(bootstrapSession());
  }, [dispatch]);

  // Look again without being asked: every 30 seconds while this screen is
  // open, and whenever the app comes back to the foreground (the owner has
  // just read the approval email). Quiet — no notice unless something changed.
  const currentStatus = user?.companyStatus;
  const checkQuietly = useCallback(async () => {
    if (fromLogin || !isAuthenticated || wentLive.current) return;
    try {
      const { data } = await authMe();
      const status = data.user.companyStatus;
      if (status === 'approved' || status === 'active') {
        await goLive();
        return;
      }
      if (status !== currentStatus) {
        if (data.companyId) await setStoredCompanyId(data.companyId);
        dispatch(setUser(data.user));
      }
    } catch {
      /* offline or a blip — the next tick tries again */
    }
  }, [dispatch, fromLogin, goLive, isAuthenticated, currentStatus]);

  useEffect(() => {
    if (fromLogin || !isAuthenticated) return;
    const id = setInterval(() => void checkQuietly(), 30_000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') void checkQuietly();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [checkQuietly, fromLogin, isAuthenticated]);

  const handleRefresh = useCallback(async () => {
    if (fromLogin) {
      backToSignIn();
      return;
    }
    setChecking(true);
    setNotice(null);
    try {
      const { data } = await authMe();
      const status = data.user.companyStatus;
      if (status === 'approved' || status === 'active') {
        await goLive();
        return;
      }
      if (data.companyId) await setStoredCompanyId(data.companyId);
      dispatch(setUser(data.user));
      setNotice({
        tone: 'info',
        message:
          status === 'rejected'
            ? 'Your registration was reviewed — see the details on the next screen.'
            : isTrialRequest ? LAUNCH.heldBody : LAUNCH.approvalPendingBody
      });
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message ?? 'Could not refresh status' });
    } finally {
      setChecking(false);
    }
  }, [dispatch, fromLogin, backToSignIn, isTrialRequest, goLive]);

  const handleSignOut = useCallback(() => {
    if (fromLogin) {
      backToSignIn();
      return;
    }
    confirmSignOut();
  }, [fromLogin, backToSignIn, confirmSignOut]);

  return (
    <AuthLayout
      header={
        <AuthHeader
          pill={isTrialRequest ? LAUNCH.planOnTrial : 'Pending Review'}
          title={isTrialRequest ? LAUNCH.heldTitle : LAUNCH.approvalPendingTitle}
          onBack={fromLogin ? backToSignIn : undefined}
        />
      }
      footer={
        <AuthFooterBar
          primary={
            approved
              ? { label: 'Sign in to continue', onPress: continueToSignIn }
              : {
                  label: fromLogin ? 'Back to Sign In' : 'Check status',
                  onPress: handleRefresh,
                  loading: checking,
                  loadingLabel: 'Checking',
                }
          }
          secondary={{
            label: fromLogin ? 'Use a different account' : 'Sign out',
            onPress: handleSignOut,
          }}
          note={LAUNCH.trialCardNote}
        />
      }>
      {notice ? (
        <AuthNotice
          tone={notice.tone}
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      <View style={styles.head}>
        <AuthIconTile
          icon={approved ? 'check-circle' : 'clock'}
          tone={approved ? 'success' : 'warning'}
        />
        <StatusPill
          label={approved ? 'Approved' : 'Pending review'}
          tone={approved ? 'success' : 'warning'}
        />
      </View>
      <Text style={[styles.body]} testID="pending-body">
        {isTrialRequest ? LAUNCH.heldBody : LAUNCH.approvalPendingBody}
      </Text>

      <AuthTimeline
        items={
          isTrialRequest
            ? [
                { title: 'Company set up', detail: 'Email verified and company details received', done: true },
                {
                  title: 'Free trial requested',
                  detail: 'All features · 1 delivery rider',
                  done: true,
                },
                {
                  title: approved ? 'Trial active' : 'A quick check by our team',
                  detail: approved
                    ? 'Your trial has started'
                    : 'Usually within a few hours. This screen moves on by itself.',
                  done: approved,
                },
              ]
            : [
                { title: 'Registration submitted', detail: 'Company details received', done: true },
                // BILLING-DISABLED BUILD: was "Payment receipt received /
                // Awaiting administrator verification". Nobody pays anything
                // on this build, so that step described a receipt that does
                // not exist. Restore the two commented lines with the flag.
                {
                  title: 'Details received',
                  detail: 'Your company is in the review queue',
                  done: true,
                },
                // {
                //   title: 'Payment receipt received',
                //   detail: 'Awaiting administrator verification',
                //   done: true,
                // },
                {
                  title: approved ? 'Approved' : 'Administrator review',
                  detail: approved
                    ? 'Sign in again to start using FinMatrix'
                    : 'Usually within one business day. This screen moves on by itself.',
                  done: approved,
                },
              ]
        }
      />
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AUTH.space.lg,
    marginBottom: AUTH.space.xl,
  },
  body: {
    ...THEME.typography.bodySm,
    fontFamily: AUTH.font,
    lineHeight: 22,
    color: AUTH.ink[500],
    marginBottom: AUTH.space.xl,
  }
});

export default PendingApprovalScreen;
