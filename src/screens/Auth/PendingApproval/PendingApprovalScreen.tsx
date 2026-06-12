import React, { useState, useCallback } from 'react';
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
import { authMe, authSignOut } from '../../../network/authNetwork';
import { setStoredCompanyId } from '../../../network/apiHelpers';

const PendingApprovalScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const [checking, setChecking] = useState(false);

  const handleRefresh = useCallback(async () => {
    setChecking(true);
    try {
      const { data } = await authMe();
      if (data.companyId) await setStoredCompanyId(data.companyId);
      dispatch(setUser(data.user));
      const status = data.user.companyStatus;
      if (status === 'approved' || status === 'active') {
        Toast.show({ type: 'success', text1: 'Your company has been approved!' });
      } else if (status === 'rejected') {
        Toast.show({ type: 'info', text1: 'Your registration was reviewed.' });
      } else {
        Toast.show({ type: 'info', text1: 'Still pending review — hang tight!' });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e?.message ?? 'Could not refresh status' });
    } finally {
      setChecking(false);
    }
  }, [dispatch]);

  const handleSignOut = useCallback(async () => {
    await authSignOut();
    dispatch(signOut());
  }, [dispatch]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xxl }]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>⏳</Text>
      </View>
      <Text style={styles.title}>Awaiting approval</Text>
      <Text style={styles.subtitle}>
        Thanks{user?.displayName ? `, ${user.displayName}` : ''}! Your company
        registration has been submitted and is being reviewed by our team.
        You'll get an email as soon as it's approved.
      </Text>

      <View style={styles.statusPill}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>Pending review</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, checking && styles.buttonDisabled]}
        onPress={handleRefresh}
        disabled={checking}>
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Check status</Text>
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
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },
  statusText: { ...typography.label, color: colors.textSecondary },
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

export default PendingApprovalScreen;
