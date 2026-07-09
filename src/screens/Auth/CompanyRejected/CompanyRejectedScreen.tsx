import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { colors, spacing, typography, radius } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser, signOut } from '../authSlice';
import {
  authMe,
  authSignOut,
  getCompanyAPI,
  submitCompanyAPI,
} from '../../../networks/auth/authNetwork';
import { setStoredCompanyId } from '../../../networks/network/apiHelpers';

const CompanyRejectedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const fromLogin = !!route.params?.fromLogin;
  const mode: 'rejected' | 'inactive' = route.params?.mode ?? 'rejected';
  const isInactive = mode === 'inactive';
  const user = useAppSelector(s => s.auth.user);
  const companyId = user?.companyId ?? null;

  const [reason, setReason] = useState<string | null>(route.params?.reason ?? null);
  const [resubmitting, setResubmitting] = useState(false);

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
    try {
      await submitCompanyAPI(companyId);
      const { data } = await authMe();
      if (data.companyId) await setStoredCompanyId(data.companyId);
      dispatch(setUser(data.user));
      Toast.show({ type: 'success', text1: 'Resubmitted for review.' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message ?? 'Could not resubmit' });
    } finally {
      setResubmitting(false);
    }
  }, [companyId, dispatch]);

  const handleSignOut = useCallback(async () => {
    if (fromLogin) { navigation.navigate('SignIn'); return; }
    await authSignOut();
    dispatch(signOut());
  }, [dispatch, fromLogin, navigation]);

  // Resubmit only makes sense for a rejected company with a live session.
  const canResubmit = !isInactive && !fromLogin && !!companyId;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xxl }]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{isInactive ? '🚫' : '⚠️'}</Text>
      </View>
      <Text style={styles.title}>
        {isInactive ? 'Account deactivated' : 'Registration not approved'}
      </Text>
      <Text style={styles.subtitle}>
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
        <TouchableOpacity
          style={[styles.button, resubmitting && styles.buttonDisabled]}
          onPress={handleResubmit}
          disabled={resubmitting}>
          {resubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Resubmit for review</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>{fromLogin ? 'Back to Sign In' : 'Sign out'}</Text>
        </TouchableOpacity>
      )}

      {canResubmit && (
        <TouchableOpacity style={styles.linkButton} onPress={handleSignOut}>
          <Text style={styles.linkMuted}>Sign out</Text>
        </TouchableOpacity>
      )}
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
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  reasonCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  reasonLabel: {
    ...typography.overline,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  reasonText: { ...typography.body, color: colors.textPrimary },
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
  linkMuted: { ...typography.label, color: colors.textSecondary },
});

export default CompanyRejectedScreen;
