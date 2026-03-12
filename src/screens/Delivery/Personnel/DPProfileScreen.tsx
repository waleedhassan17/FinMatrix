import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { signOut } from '../../Auth/authSlice';

const ACCENT = '#27AE60';

const DPProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.displayName
              ?.split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) ?? 'DP'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.displayName ?? 'Delivery Personnel'}</Text>
        <Text style={styles.role}>{user?.username ?? user?.email ?? ''}</Text>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => dispatch(signOut())}
          activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: typography.fontFamily,
  },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT + '14',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: ACCENT + '30',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: ACCENT,
    fontFamily: typography.fontFamily,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: typography.fontFamily,
  },
  role: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: spacing.xl,
    fontFamily: typography.fontFamily,
  },
  signOutButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E74C3C',
    backgroundColor: '#FEF2F2',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E74C3C',
    fontFamily: typography.fontFamily,
  },
});

export default DPProfileScreen;
