// ═══════════════════════════════════════════════════════
// FinMatrix — Awaiting Approval gate
// ═══════════════════════════════════════════════════════
// Shown while a submitted company sits in super-admin review. Two entry
// points: `fromLogin` (a blocked sign-in, so there is no session to poll) and
// the live post-submission session.

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
  AuthScreen,
  AuthBrand,
  AuthHeading,
  AuthPrimaryButton,
  AuthTextLink,
  AuthFooter,
  InlineBanner,
  StatusNote,
  AUTH,
  type AuthTone,
} from '../../../components/auth/AuthUI';

const PendingApprovalScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  // Reached from a blocked login (no session) vs. from a live signup session.
  const fromLogin = !!route.params?.fromLogin;
  const user = useAppSelector(s => s.auth.user);
  const selectedRole = useAppSelector(selectSelectedRole);
  const role: UserRole = selectedRole ?? 'admin';
  const { confirmSignOut, signOutNow } = useSignOut();

  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<{ tone: AuthTone; message: string } | null>(
    null,
  );

  // From login there is no session to poll — send the user back to sign in to
  // retry once approved.
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
        // Approved by the super-admin → clear the onboarding session so the
        // owner signs in fresh. signOutNow() flips the navigator to sign-in
        // on this frame, so there is nothing to navigate to afterwards.
        setNotice({
          tone: 'success',
          message: 'Approved! Please sign in to continue.',
        });
        signOutNow();
        return;
      }
      if (data.companyId) await setStoredCompanyId(data.companyId);
      dispatch(setUser(data.user));
      if (status === 'rejected') {
        setNotice({ tone: 'info', message: 'Your registration was reviewed.' });
      } else {
        setNotice({ tone: 'info', message: 'Still pending review — hang tight!' });
      }
    } catch (e: any) {
      setNotice({
        tone: 'error',
        message: e?.message ?? 'Could not refresh status',
      });
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
    <AuthScreen>
      <AuthBrand />

      <AuthHeading
        title="Awaiting approval"
        subtitle="Your company registration is with our review team."
      />

      {notice ? (
        <InlineBanner
          tone={notice.tone}
          message={notice.message}
          onDismiss={() => setNotice(null)}
          style={styles.banner}
        />
      ) : null}

      <StatusNote label="Status" value="Pending review" tone="warning" />

      <Text style={styles.body}>
        {`Thanks${user?.displayName ? `, ${user.displayName}` : ''}! Your company registration has been submitted and is being reviewed by our team. You'll get an email as soon as it's approved.`}
      </Text>

      <AuthPrimaryButton
        label={fromLogin ? 'Back to Sign In' : 'Check status'}
        loading={checking}
        loadingLabel="Checking"
        onPress={handleRefresh}
      />

      <View style={styles.linkRow}>
        <AuthTextLink
          label={fromLogin ? 'Use a different account' : 'Sign out'}
          onPress={handleSignOut}
          muted
        />
      </View>

      <AuthFooter label="Reviews are usually completed within one business day" />
    </AuthScreen>
  );
};

const styles = StyleSheet.create({
  banner: { marginBottom: AUTH.space.lg },
  body: {
    ...AUTH.type.body,
    color: AUTH.ink[500],
    lineHeight: 22,
    marginBottom: AUTH.space.xl,
  },
  linkRow: { alignItems: 'center', marginTop: AUTH.space.xs },
});

export default PendingApprovalScreen;
