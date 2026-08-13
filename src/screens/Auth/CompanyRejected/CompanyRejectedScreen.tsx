// ═══════════════════════════════════════════════════════
// FinMatrix — Registration Rejected / Account Deactivated gate
// ═══════════════════════════════════════════════════════
// Sibling of PendingApprovalScreen and deliberately built from the same kit —
// a user moving between these states should see one consistent screen family.

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser, selectSelectedRole } from '../authSlice';
import {
  authMe,
  getCompanyAPI,
  submitCompanyAPI,
} from '../../../networks/auth/authNetwork';
import { setStoredCompanyId } from '../../../utils/storageUtils';
import { useSignOut } from '../../../hooks/useSignOut';
import type { UserRole } from '../../../types';
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

const CompanyRejectedScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const fromLogin = !!route.params?.fromLogin;
  const mode: 'rejected' | 'inactive' = route.params?.mode ?? 'rejected';
  const isInactive = mode === 'inactive';
  const user = useAppSelector(s => s.auth.user);
  const selectedRole = useAppSelector(selectSelectedRole);
  const role: UserRole = selectedRole ?? 'admin';
  const companyId = user?.companyId ?? null;
  const { confirmSignOut } = useSignOut();

  const [reason, setReason] = useState<string | null>(route.params?.reason ?? null);
  const [resubmitting, setResubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: AuthTone; message: string } | null>(
    null,
  );

  useEffect(() => {
    // With a live session (not from the login gate) we can fetch the latest
    // reason; from the login gate we only have what was passed in params.
    if (fromLogin || !companyId || isInactive) return;
    let active = true;
    (async () => {
      try {
        const company = await getCompanyAPI(companyId);
        if (active) setReason(company?.rejectionReason ?? null);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      active = false;
    };
  }, [companyId, fromLogin, isInactive]);

  const handleResubmit = useCallback(async () => {
    if (!companyId) return;
    setResubmitting(true);
    setNotice(null);
    try {
      await submitCompanyAPI(companyId);
      const { data } = await authMe();
      if (data.companyId) await setStoredCompanyId(data.companyId);
      dispatch(setUser(data.user));
      setNotice({ tone: 'success', message: 'Resubmitted for review.' });
    } catch (e: any) {
      setNotice({ tone: 'error', message: e?.message ?? 'Could not resubmit' });
    } finally {
      setResubmitting(false);
    }
  }, [companyId, dispatch]);

  const handleSignOut = useCallback(() => {
    if (fromLogin) {
      navigation.navigate('SignIn', { role });
      return;
    }
    confirmSignOut();
  }, [fromLogin, navigation, role, confirmSignOut]);

  // Resubmit only makes sense for a rejected company with a live session.
  const canResubmit = !isInactive && !fromLogin && !!companyId;

  return (
    <AuthScreen>
      <AuthHeader
        title={isInactive ? 'Account deactivated' : 'Registration not approved'}
        subtitle={
          isInactive
            ? 'Access is paused until an administrator restores it.'
            : 'Review the note below, then resubmit when you are ready.'
        }
        pill={isInactive ? 'Deactivated' : 'Not Approved'}
        compact
      />

      <AuthCard>
        <AuthMedallion
          icon={isInactive ? 'slash' : 'alert-triangle'}
          tone={isInactive ? 'error' : 'warning'}
        />

        {notice ? (
          <InlineBanner
            tone={notice.tone}
            message={notice.message}
            onDismiss={() => setNotice(null)}
            style={styles.banner}
          />
        ) : null}

        <Text style={styles.body}>
          {isInactive
            ? 'Your company account has been deactivated. Please contact the FinMatrix administrator to restore access.'
            : "Unfortunately your company registration wasn't approved this time."}
        </Text>

        {reason ? (
          <View style={styles.reasonCard}>
            <Text style={styles.reasonLabel}>Reason</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ) : null}

        {canResubmit ? (
          <>
            <AuthPrimaryButton
              label="Resubmit for review"
              loading={resubmitting}
              loadingLabel="Resubmitting…"
              onPress={handleResubmit}
              style={styles.cta}
            />
            <AuthLinkButton label="Sign out" onPress={handleSignOut} muted />
          </>
        ) : (
          <AuthPrimaryButton
            label={fromLogin ? 'Back to Sign In' : 'Sign out'}
            onPress={handleSignOut}
            style={styles.cta}
          />
        )}
      </AuthCard>
    </AuthScreen>
  );
};

const styles = StyleSheet.create({
  banner: { marginBottom: 16 },
  body: {
    fontFamily: AUTH_DS.font,
    fontSize: 14,
    lineHeight: 22,
    color: AUTH_DS.slate500,
    textAlign: 'center',
  },
  reasonCard: {
    backgroundColor: AUTH_DS.slate50,
    borderRadius: AUTH_DS.radius.md,
    borderWidth: 1,
    borderColor: AUTH_DS.slate200,
    padding: 14,
    marginTop: 18,
  },
  reasonLabel: {
    fontFamily: AUTH_DS.font,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: AUTH_DS.slate400,
    marginBottom: 5,
  },
  reasonText: {
    fontFamily: AUTH_DS.font,
    fontSize: 14,
    lineHeight: 21,
    color: AUTH_DS.navy700,
  },
  cta: { marginTop: 20 },
});

export default CompanyRejectedScreen;
