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
// The same screen serves a FREE TRIAL request, which waits on the same review
// queue. Its copy is branched rather than a second screen added: the trial
// promise is "activated within 24 hours" and "your 30 days start then", and
// neither may be said to someone who paid, nor the payment copy to a trialist.
// Which one applies comes from the sign-in gate (route param pendingKind) or,
// with a live session, from /billing/status.

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser, selectSelectedRole } from '../authSlice';
import { authMe } from '../../../networks/auth/authNetwork';
import {
  getBillingStatusAPI,
  type BillingStatus,
} from '../../../networks/billing/billingNetwork';
import { setStoredCompanyId } from '../../../utils/storageUtils';
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
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  // A signed-in session can ask what is in review; a blocked sign-in cannot
  // (no token), which is why the gate passes pendingKind along instead.
  useEffect(() => {
    if (fromLogin) return;
    let cancelled = false;
    getBillingStatusAPI()
      .then(st => {
        if (!cancelled) setBilling(st);
      })
      .catch(() => {
        /* copy falls back to the payment wording's neutral parts */
      });
    return () => {
      cancelled = true;
    };
  }, [fromLogin]);

  const isTrialRequest =
    route.params?.pendingKind === 'trial' || billing?.trialPending === true;

  const backToSignIn = useCallback(() => {
    navigation.navigate('SignIn', { role });
  }, [navigation, role]);

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
        // Approved. Tell the user and hand them the button — signing them out
        // on the spot replaced the answer they asked for with a login screen.
        setApproved(true);
        setNotice({
          tone: 'success',
          message: isTrialRequest
            ? 'Your free trial is active. Sign in again to start using FinMatrix — your 30 days have begun.'
            : 'Your company has been approved. Sign in again to start using FinMatrix.',
        });
        return;
      }
      if (data.companyId) await setStoredCompanyId(data.companyId);
      dispatch(setUser(data.user));
      setNotice({
        tone: 'info',
        message:
          status === 'rejected'
            ? 'Your registration was reviewed — see the details on the next screen.'
            : isTrialRequest
              ? 'Not activated yet. Your free trial request is with our team — usually within 24 hours. We will email you as soon as it is live.'
              : 'Not approved yet. Your payment is with our team; we will email you as soon as it is verified.'
      });
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message ?? 'Could not refresh status' });
    } finally {
      setChecking(false);
    }
  }, [dispatch, fromLogin, backToSignIn, isTrialRequest]);

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
          pill={isTrialRequest ? 'Free Trial' : 'Pending Review'}
          title={isTrialRequest ? 'Your free trial is being activated' : 'Awaiting approval'}
          subtitle={
            isTrialRequest
              ? 'Activation usually takes less than 24 hours.'
              : 'Your company registration is with our review team.'
          }
          onBack={fromLogin ? backToSignIn : undefined}
        />
      }
      footer={
        <AuthFooterBar
          primary={
            approved
              ? { label: 'Sign in to continue', onPress: signOutNow }
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
          note={
            isTrialRequest
              ? 'Free trials are usually activated within 24 hours'
              : 'Reviews are usually completed within one business day'
          }
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

      <Text style={styles.body}>
        {isTrialRequest
          ? `Thanks${user?.displayName ? `, ${user.displayName}` : ''}! We've received your request for a 30-day free trial — every feature, with one delivery rider. Our team activates it within 24 hours, and a confirmation email is on its way. Your 30 days start when the trial is activated, so no time is lost while you wait.`
          : `Thanks${user?.displayName ? `, ${user.displayName}` : ''}! Your company registration has been submitted and is being reviewed by our team. You'll get an email as soon as it's approved.`}
      </Text>

      <AuthTimeline
        items={
          isTrialRequest
            ? [
                { title: 'Company set up', detail: 'Email verified and company details received', done: true },
                {
                  title: 'Free trial requested',
                  detail: 'All features · 1 delivery rider · 30 days',
                  done: true,
                },
                {
                  title: approved ? 'Trial active' : 'Activation review',
                  detail: approved
                    ? 'Sign in again — your 30 days have started'
                    : 'Usually within 24 hours',
                  done: approved,
                },
              ]
            : [
                { title: 'Registration submitted', detail: 'Company details received', done: true },
                {
                  title: 'Payment receipt received',
                  detail: 'Awaiting administrator verification',
                  done: true,
                },
                {
                  title: approved ? 'Approved' : 'Administrator review',
                  detail: approved
                    ? 'Sign in again to start using FinMatrix'
                    : 'Usually within one business day',
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
