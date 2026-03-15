import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius, shadows } from '../../../../theme';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectUser } from '../../../Auth/authSlice';
import {
  selectDeliveries,
  selectDeliveryPersonnel,
  updateDeliveryStatus,
} from '../../Admin/AssignDeliveries/deliverySlice';
import CustomButton from '../../../../Custom-Components/CustomButton';
import type { DPDashboardStackParamList } from '../../../../navigators/stacks/DPDashboardStack';

type Nav = NativeStackNavigationProp<DPDashboardStackParamList>;

const SUMMARY_COLORS = {
  assigned: '#2563EB',
  completed: '#16A34A',
  inTransit: '#D97706',
  remaining: '#6B7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#B91C1C',
  medium: '#B45309',
  low: '#0F766E',
};

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const DPDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const deliveries = useAppSelector(selectDeliveries);
  const personnel = useAppSelector(selectDeliveryPersonnel);
  const userId = user?.uid ?? 'dp_002';

  const progressAnim = useRef(new Animated.Value(0)).current;

  const me = useMemo(() => personnel.find(p => p.userId === userId), [personnel, userId]);

  const todayKey = new Date().toISOString().slice(0, 10);

  const myDeliveries = useMemo(
    () => deliveries.filter(d => d.assignedTo === userId),
    [deliveries, userId],
  );

  const todayDeliveries = useMemo(
    () => myDeliveries.filter(d => d.scheduledDate === todayKey),
    [myDeliveries, todayKey],
  );

  const summary = useMemo(() => {
    const assigned = todayDeliveries.length;
    const completed = todayDeliveries.filter(d => d.status === 'delivered').length;
    const inTransit = todayDeliveries.filter(d => d.status === 'in_transit').length;
    const remaining = Math.max(assigned - completed, 0);
    return { assigned, completed, inTransit, remaining };
  }, [todayDeliveries]);

  const progress = useMemo(
    () => (summary.assigned === 0 ? 0 : summary.completed / summary.assigned),
    [summary.assigned, summary.completed],
  );

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const nextDelivery = useMemo(
    () =>
      myDeliveries
        .filter(d => d.status === 'pending' || d.status === 'in_transit')
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === 'in_transit' ? -1 : 1;
          return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        })[0],
    [myDeliveries],
  );

  const recentActivity = useMemo(
    () =>
      myDeliveries
        .filter(d => d.status === 'delivered')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3),
    [myDeliveries],
  );

  const thisWeekCount = useMemo(() => {
    const weekStart = getWeekStart(new Date());
    return myDeliveries.filter(d => {
      if (d.status !== 'delivered') return false;
      return new Date(d.updatedAt) >= weekStart;
    }).length;
  }, [myDeliveries]);

  const handleStartDelivery = () => {
    if (!nextDelivery) return;
    if (nextDelivery.status === 'pending') {
      dispatch(
        updateDeliveryStatus({
          deliveryId: nextDelivery.id,
          status: 'in_transit',
          note: 'Started by delivery personnel from dashboard',
        }),
      );
      Alert.alert('Delivery Started', `${nextDelivery.referenceNo} is now in transit.`);
    }
    navigation.navigate('DPDeliveryDetail', { deliveryId: nextDelivery.id });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day</Text>
            <Text style={styles.name}>{user?.displayName ?? me?.displayName ?? 'Delivery Partner'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.bellBtn}>
              <Text style={styles.bellText}>BELL</Text>
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.displayName ?? me?.displayName ?? 'D').charAt(0).toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>TODAY'S SUMMARY</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View style={[styles.dot, { backgroundColor: SUMMARY_COLORS.assigned }]} />
              <Text style={styles.summaryValue}>{summary.assigned}</Text>
              <Text style={styles.summaryLabel}>Assigned</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.dot, { backgroundColor: SUMMARY_COLORS.completed }]} />
              <Text style={styles.summaryValue}>{summary.completed}</Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.dot, { backgroundColor: SUMMARY_COLORS.inTransit }]} />
              <Text style={styles.summaryValue}>{summary.inTransit}</Text>
              <Text style={styles.summaryLabel}>In Transit</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.dot, { backgroundColor: SUMMARY_COLORS.remaining }]} />
              <Text style={styles.summaryValue}>{summary.remaining}</Text>
              <Text style={styles.summaryLabel}>Remaining</Text>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>NEXT DELIVERY</Text>
          {nextDelivery ? (
            <>
              <View style={styles.deliveryTopRow}>
                <Text style={styles.deliveryCustomer}>{nextDelivery.customerName}</Text>
                <View
                  style={[
                    styles.priorityPill,
                    { backgroundColor: PRIORITY_COLORS[nextDelivery.priority] + '20' },
                  ]}
                >
                  <Text style={[styles.priorityText, { color: PRIORITY_COLORS[nextDelivery.priority] }]}>
                    {nextDelivery.priority.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.deliveryAddress}>{nextDelivery.address ?? nextDelivery.zone}</Text>
              <Text style={styles.deliveryMeta}>{nextDelivery.items.length} items • {nextDelivery.referenceNo}</Text>
              <View style={{ marginTop: spacing.sm }}>
                <CustomButton
                  title={nextDelivery.status === 'in_transit' ? 'Delivery In Progress' : 'Start Delivery'}
                  onPress={handleStartDelivery}
                  fullWidth
                  disabled={nextDelivery.status === 'in_transit'}
                />
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>No pending deliveries right now.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
          {recentActivity.length === 0 && <Text style={styles.emptyText}>No completed deliveries yet.</Text>}
          {recentActivity.map(item => (
            <View key={item.id} style={styles.activityRow}>
              <View style={styles.activityLeft}>
                <Text style={styles.activityTitle}>{item.customerName}</Text>
                <Text style={styles.activitySub}>{item.referenceNo}</Text>
              </View>
              <Text style={styles.activityTime}>{new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>PERFORMANCE</Text>
          <View style={styles.performanceRow}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{me?.rating?.toFixed(1) ?? '0.0'}</Text>
              <Text style={styles.performanceLabel}>Rating</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{me?.onTimeRate ?? 0}%</Text>
              <Text style={styles.performanceLabel}>On-time Rate</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{thisWeekCount}</Text>
              <Text style={styles.performanceLabel}>This Week</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },

  header: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { ...typography.caption, color: colors.textSecondary },
  name: { ...typography.h3, color: colors.textPrimary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  bellText: { fontSize: 9, fontWeight: '700', color: colors.textSecondary },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '20',
  },
  avatarText: { ...typography.small, fontWeight: '700', color: colors.primary },

  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.small,
  },
  sectionTitle: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: 0.4,
  },

  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: '#FCFDFF',
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: spacing.xs },
  summaryValue: { ...typography.h4, color: colors.textPrimary },
  summaryLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  progressWrap: { marginTop: spacing.md },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  progressLabel: { ...typography.caption, color: colors.textSecondary },
  progressPct: { ...typography.caption, color: colors.textPrimary, fontWeight: '700' },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 999,
  },

  deliveryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deliveryCustomer: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  deliveryAddress: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  deliveryMeta: { ...typography.caption, color: colors.textLight, marginTop: spacing.xs },
  priorityPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  priorityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityLeft: { flex: 1, marginRight: spacing.sm },
  activityTitle: { ...typography.small, color: colors.textPrimary, fontWeight: '600' },
  activitySub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  activityTime: { ...typography.caption, color: colors.textLight },

  performanceRow: { flexDirection: 'row', gap: spacing.sm },
  performanceItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: '#FCFDFF',
  },
  performanceValue: { ...typography.h4, color: colors.textPrimary },
  performanceLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  emptyText: { ...typography.caption, color: colors.textLight },
});

export default DPDashboardScreen;
