// ═══════════════════════════════════════════════════════
// FinMatrix — Awaiting Approval gate
// ═══════════════════════════════════════════════════════
// Shown while a submitted company sits in super-admin review. Two entry
// points: `fromLogin` (a blocked sign-in, so there is no session to poll)
// and the live post-submission session.
//
// The timeline exists because "awaiting approval" with no other information
// reads as "stuck". Showing what has already completed makes the wait legible.

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser, selectSelectedRole } from '../authSlice';
import { authMe } from '../../../networks/auth/authNetwork';
import { setStoredCompanyId } from '../../../utils/storageUtils';
import { useSignOut } from '../../../hooks/useSignOut';
import type { UserRole } from '../../../types';
import {
  AuthLayout,
  AuthHeader,
  AuthFooterBar,
  AuthIconTile,
  AuthNotice,
  AuthTimeline,
  StatusPill,
  AUTH,
  type AuthTone,
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
          message:
            'Your company has been approved. Sign in again to start using FinMatrix.',
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
            : 'Not approved yet. Your payment is with our team; we will email you as soon as it is verified.',
      });
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message ?? 'Could not refresh status' });
    } finally {
      setChecking(false);
    }
  }, [dispatch, fromLogin, backToSignIn, signOutNow]);

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
          pill="Pending Review"
          title="Awaiting approval"
          subtitle="Your company registration is with our review team."
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
          note="Reviews are usually completed within one business day"
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
        {`Thanks${user?.displayName ? `, ${user.displayName}` : ''}! Your company registration has been submitted and is being reviewed by our team. You'll get an email as soon as it's approved.`}
      </Text>

      <AuthTimeline
        items={[
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
        ]}
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
    fontFamily: AUTH.font,
    fontSize: 14,
    lineHeight: 22,
    color: AUTH.ink[500],
    marginBottom: AUTH.space.xl,
  },
});

export default PendingApprovalScreen;
