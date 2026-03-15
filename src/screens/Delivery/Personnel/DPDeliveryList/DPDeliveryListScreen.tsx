import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius, shadows } from '../../../../theme';
import { useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectUser } from '../../../Auth/authSlice';
import { selectDeliveries } from '../../Admin/AssignDeliveries/deliverySlice';
import type { DPDeliveriesStackParamList } from '../../../../navigators/stacks/DPDeliveriesStack';
import type { DeliveryRecord } from '../../../../dummy-data/deliveries';

type Props = NativeStackScreenProps<DPDeliveriesStackParamList, 'DPDeliveries'>;

const PRIORITY_COLORS: Record<string, string> = {
  high: '#B91C1C',
  medium: '#B45309',
  low: '#0F766E',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#2563EB',
  picked_up: '#8B5CF6',
  in_transit: '#D97706',
  arrived: '#0EA5E9',
  delivered: '#059669',
  failed: '#DC2626',
  returned: '#7C3AED',
  unassigned: '#6B7280',
};

const elapsedLabel = (from: string): string => {
  const mins = Math.floor((Date.now() - new Date(from).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const DeliveryCard: React.FC<{ delivery: DeliveryRecord; onPress: () => void }> = ({ delivery, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.rowBetween}>
      <Text style={styles.customer} numberOfLines={1}>{delivery.customerName}</Text>
      <View style={[styles.priorityPill, { backgroundColor: PRIORITY_COLORS[delivery.priority] + '22' }]}>
        <Text style={[styles.priorityText, { color: PRIORITY_COLORS[delivery.priority] }]}>{delivery.priority.toUpperCase()}</Text>
      </View>
    </View>

    <Text style={styles.address} numberOfLines={1}>{delivery.address ?? delivery.zone}</Text>

    <View style={styles.metaRow}>
      <Text style={styles.metaText}>{delivery.items.length} items</Text>
      <Text style={[styles.statusText, { color: STATUS_COLORS[delivery.status] }]}>{delivery.status.replace('_', ' ')}</Text>
      <Text style={styles.metaText}>{elapsedLabel(delivery.updatedAt)} ago</Text>
    </View>
  </TouchableOpacity>
);

const DPDeliveryListScreen: React.FC<Props> = ({ navigation }) => {
  const user = useAppSelector(selectUser);
  const allDeliveries = useAppSelector(selectDeliveries);
  const userId = user?.uid ?? 'dp_002';

  const myDeliveries = useMemo(
    () => allDeliveries.filter(d => d.assignedTo === userId),
    [allDeliveries, userId],
  );

  const inProgress = useMemo(
    () => myDeliveries.filter(d => d.status === 'picked_up' || d.status === 'in_transit' || d.status === 'arrived'),
    [myDeliveries],
  );

  const upNext = useMemo(
    () => myDeliveries.filter(d => d.status === 'pending').sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()),
    [myDeliveries],
  );

  const completed = useMemo(
    () => myDeliveries.filter(d => d.status === 'delivered').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [myDeliveries],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Deliveries</Text>
        <Text style={styles.subtitle}>{myDeliveries.length} assigned</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In Progress</Text>
          {inProgress.length === 0 && <Text style={styles.emptyText}>No in-progress deliveries</Text>}
          {inProgress.map(delivery => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              onPress={() => navigation.navigate('DPDeliveryDetail', { deliveryId: delivery.id })}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Up Next</Text>
          {upNext.length === 0 && <Text style={styles.emptyText}>No upcoming pending deliveries</Text>}
          {upNext.map(delivery => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              onPress={() => navigation.navigate('DPDeliveryDetail', { deliveryId: delivery.id })}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed</Text>
          {completed.length === 0 && <Text style={styles.emptyText}>No completed deliveries yet</Text>}
          {completed.map(delivery => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              onPress={() => navigation.navigate('DPDeliveryDetail', { deliveryId: delivery.id })}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.small,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: '#FCFDFF',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  customer: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  address: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusText: {
    ...typography.caption,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  priorityPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textLight,
    paddingVertical: spacing.sm,
  },
});

export default DPDeliveryListScreen;
