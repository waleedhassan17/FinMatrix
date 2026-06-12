import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { colors, spacing, typography, radius } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser, signOut } from '../authSlice';
import {
  authMe,
  authSignOut,
  getCompanyAPI,
  submitCompanyAPI,
} from '../../../network/authNetwork';
import { setStoredCompanyId } from '../../../network/apiHelpers';

const CompanyRejectedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const companyId = user?.companyId ?? null;

  const [reason, setReason] = useState<string | null>(null);
  const [resubmitting, setResubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!companyId) return;
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
  }, [companyId]);

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
    await authSignOut();
    dispatch(signOut());
  }, [dispatch]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xxl }]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>⚠️</Text>
      </View>
      <Text style={styles.title}>Registration not approved</Text>
      <Text style={styles.subtitle}>
        Unfortunately your company registration wasn't approved this time.
      </Text>

      {reason ? (
        <View style={styles.reasonCard}>
          <Text style={styles.reasonLabel}>Reason</Text>
          <Text style={styles.reasonText}>{reason}</Text>
        </View>
      ) : null}

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

      <TouchableOpacity style={styles.linkButton} onPress={handleSignOut}>
        <Text style={styles.linkMuted}>Sign out</Text>
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
