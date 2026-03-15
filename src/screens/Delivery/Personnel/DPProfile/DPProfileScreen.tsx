import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../../../theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { signOut } from '../../../Auth/authSlice';
import { selectDeliveries } from '../../Admin/AssignDeliveries/deliverySlice';
import type { DPProfileStackParamList } from '../../../../navigators/stacks/DPProfileStack';

const ACCENT = '#27AE60';

type Props = NativeStackScreenProps<DPProfileStackParamList, 'DPProfile'>;

const DPProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const deliveries = useAppSelector(selectDeliveries);

  const userId = user?.uid ?? 'dp_002';
  const myDeliveries = deliveries.filter(d => d.assignedTo === userId);
  const delivered = myDeliveries.filter(d => d.status === 'delivered').length;
  const onTimeRate = delivered > 0 ? Math.min(99, Math.round((delivered / Math.max(1, myDeliveries.length)) * 100)) : 0;
  const thisMonth = myDeliveries.filter(d => d.scheduledDate.startsWith('2026-03')).length;
  const rating = delivered > 0 ? 4.8 : 4.5;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
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
        <Text style={styles.role}>{user?.email ?? 'delivery@finmatrix.pk'}</Text>
        <Text style={styles.badge}>Delivery Personnel</Text>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <Text style={styles.detailLine}>Phone: {user?.phoneNumber || '+92 300 0000000'}</Text>
          <Text style={styles.detailLine}>Username: {user?.username || 'dp_user'}</Text>
          <Text style={styles.detailLine}>Role: {user?.role || 'delivery'}</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}><Text style={styles.metricValue}>{myDeliveries.length}</Text><Text style={styles.metricLabel}>Total Deliveries</Text></View>
            <View style={styles.metricBox}><Text style={styles.metricValue}>{onTimeRate}%</Text><Text style={styles.metricLabel}>On-Time Rate</Text></View>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}><Text style={styles.metricValue}>{rating.toFixed(1)}</Text><Text style={styles.metricLabel}>Rating</Text></View>
            <View style={styles.metricBox}><Text style={styles.metricValue}>{thisMonth}</Text><Text style={styles.metricLabel}>This Month</Text></View>
          </View>
        </View>

        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('DPHistory')}>
          <Text style={styles.linkLabel}>History</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('DPSettings')}>
          <Text style={styles.linkLabel}>Settings</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => dispatch(signOut())}
          activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  body: { padding: spacing.lg, alignItems: 'center', paddingBottom: spacing.xl },
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
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  badge: {
    fontSize: 12,
    color: ACCENT,
    borderWidth: 1,
    borderColor: ACCENT + '60',
    backgroundColor: ACCENT + '10',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  detailLine: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: typography.fontFamily,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  linkRow: {
    width: '100%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  linkLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  linkArrow: {
    fontSize: 20,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: typography.fontFamily,
  },
  signOutButton: {
    width: '100%',
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
