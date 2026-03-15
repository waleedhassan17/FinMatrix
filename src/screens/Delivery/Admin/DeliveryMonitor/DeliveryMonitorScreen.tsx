import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius, shadows } from '../../../../theme';
import type { MoreStackParamList } from '../../../../navigators/stacks/MoreStack';
import { useAppDispatch, useAppSelector } from '../../../../hooks/useReduxHooks';
import { selectDeliveries, selectDeliveryPersonnel } from '../AssignDeliveries/deliverySlice';
import {
  selectMonitorFilter,
  selectMonitorSort,
  setFilterStatus,
  setSortBy,
  type MonitorFilterStatus,
  type MonitorSortBy,
} from './deliveryMonitorSlice';
import type { DeliveryRecordStatus } from '../../../../dummy-data/deliveries';

type Props = NativeStackScreenProps<MoreStackParamList, 'DeliveryMonitor'>;

// ── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  unassigned: '#64748B',
  pending: '#D97706',
  in_transit: '#2563EB',
  delivered: '#059669',
  failed: '#DC2626',
  returned: '#EA580C',
};

const STATUS_ICONS: Record<string, string> = {
  unassigned: '⚪',
  pending: '🟡',
  in_transit: '🔵',
  delivered: '🟢',
  failed: '🔴',
  returned: '🟠',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#B91C1C',
  medium: '#B45309',
  low: '#0F766E',
};

const PRIORITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

const STATUS_RANK: Record<string, number> = {
  in_transit: 5,
  pending: 4,
  unassigned: 3,
  failed: 2,
  returned: 1,
  delivered: 0,
};

const FILTER_CHIPS: Array<{ label: string; value: MonitorFilterStatus }> = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Failed', value: 'failed' },
  { label: 'Returned', value: 'returned' },
];

const SORT_OPTIONS: Array<{ label: string; value: MonitorSortBy }> = [
  { label: 'Time', value: 'time' },
  { label: 'Status', value: 'status' },
  { label: 'Priority', value: 'priority' },
];

const elapsedLabel = (from: string): string => {
  const diff = Date.now() - new Date(from).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── Component ────────────────────────────────────────────────────────────────
const DeliveryMonitorScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const deliveries = useAppSelector(selectDeliveries);
  const personnel = useAppSelector(selectDeliveryPersonnel);
  const filterStatus = useAppSelector(selectMonitorFilter);
  const sortBy = useAppSelector(selectMonitorSort);

  const personnelMap = useMemo(
    () => Object.fromEntries(personnel.map(p => [p.userId, p.displayName])),
    [personnel],
  );

  const stats = useMemo(
    () => ({
      total: deliveries.length,
      pending: deliveries.filter(d => d.status === 'pending').length,
      inTransit: deliveries.filter(d => d.status === 'in_transit').length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      failed: deliveries.filter(d => d.status === 'failed').length,
      unassigned: deliveries.filter(d => d.status === 'unassigned').length,
    }),
    [deliveries],
  );

  const filtered = useMemo(() => {
    const list =
      filterStatus === 'all'
        ? [...deliveries]
        : deliveries.filter(d => d.status === filterStatus);

    switch (sortBy) {
      case 'priority':
        return [...list].sort(
          (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority],
        );
      case 'status':
        return [...list].sort(
          (a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status],
        );
      default:
        return [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }
  }, [deliveries, filterStatus, sortBy]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Delivery Monitor</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Stats Bar ── */}
        <View style={styles.statsBar}>
          {[
            { label: 'Total', count: stats.total, color: colors.secondary },
            { label: 'Pending', count: stats.pending, color: STATUS_COLORS.pending },
            { label: 'Transit', count: stats.inTransit, color: STATUS_COLORS.in_transit },
            { label: 'Done', count: stats.delivered, color: STATUS_COLORS.delivered },
            { label: 'Failed', count: stats.failed, color: STATUS_COLORS.failed },
            { label: 'Unassigned', count: stats.unassigned, color: STATUS_COLORS.unassigned },
          ].map(item => (
            <View key={item.label} style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: item.color }]} />
              <Text style={styles.statCount}>{item.count}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Map Placeholder ── */}
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.mapTitle}>Map View Coming Soon</Text>
          <Text style={styles.mapSub}>Live route tracking will appear here</Text>
        </View>

        {/* ── Sort Bar ── */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortChip, sortBy === opt.value && styles.sortChipActive]}
              onPress={() => dispatch(setSortBy(opt.value))}
            >
              <Text
                style={[styles.sortChipText, sortBy === opt.value && styles.sortChipTextActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Filter Chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
        >
          {FILTER_CHIPS.map(chip => {
            const active = filterStatus === chip.value;
            const chipColor =
              chip.value === 'all'
                ? colors.primary
                : STATUS_COLORS[chip.value as DeliveryRecordStatus];
            return (
              <TouchableOpacity
                key={chip.value}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: chipColor, borderColor: chipColor },
                ]}
                onPress={() => dispatch(setFilterStatus(chip.value))}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Feed Header ── */}
        <Text style={styles.feedHeader}>
          {filtered.length} deliver{filtered.length !== 1 ? 'ies' : 'y'}
        </Text>

        {/* ── Delivery Feed ── */}
        {filtered.map(delivery => {
          const statusColor = STATUS_COLORS[delivery.status] ?? '#64748B';
          const personName = delivery.assignedTo ? personnelMap[delivery.assignedTo] : null;

          return (
            <TouchableOpacity
              key={delivery.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('AdminDeliveryDetail', { deliveryId: delivery.id })
              }
            >
              {/* Top: icon + customer + priority */}
              <View style={styles.cardTop}>
                <View style={styles.cardLeftGroup}>
                  <Text style={styles.statusIcon}>{STATUS_ICONS[delivery.status]}</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardCustomer} numberOfLines={1}>
                      {delivery.customerName}
                    </Text>
                    <Text style={styles.cardAddress} numberOfLines={1}>
                      {delivery.address ?? delivery.zone}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.priorityBadge,
                    { backgroundColor: PRIORITY_COLORS[delivery.priority] + '22' },
                  ]}
                >
                  <Text
                    style={[styles.priorityText, { color: PRIORITY_COLORS[delivery.priority] }]}
                  >
                    {delivery.priority.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Middle: meta + status + elapsed */}
              <View style={styles.cardMiddle}>
                <View style={styles.cardMeta}>
                  {personName !== null && (
                    <Text style={styles.metaChip}>👤 {personName}</Text>
                  )}
                  <Text style={styles.metaChip}>
                    📦 {delivery.items.length} item{delivery.items.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.metaChip}>📅 {delivery.scheduledDate}</Text>
                </View>
                <View style={styles.cardRightGroup}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {delivery.status.replace('_', ' ')}
                    </Text>
                  </View>
                  <Text style={styles.elapsed}>{elapsedLabel(delivery.createdAt)}</Text>
                </View>
              </View>

              {/* Footer: ref + chevron */}
              <View style={styles.cardFooter}>
                <Text style={styles.refNo}>{delivery.referenceNo}</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No deliveries match this filter</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  back: { ...typography.h2, color: colors.primary },
  title: { ...typography.h4, color: colors.textPrimary },

  content: { padding: spacing.md, paddingBottom: spacing.xl },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    ...shadows.card,
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  statCount: { ...typography.h4, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },

  // Map
  mapPlaceholder: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  mapIcon: { fontSize: 36, marginBottom: spacing.sm },
  mapTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.xs },
  mapSub: { ...typography.caption, color: colors.textSecondary },

  // Sort
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  sortLabel: { ...typography.small, color: colors.textSecondary },
  sortChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
  },
  sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortChipText: { ...typography.caption, color: colors.textSecondary },
  sortChipTextActive: { color: colors.white, fontWeight: '600' },

  // Filter Chips
  filterRow: { marginBottom: spacing.md },
  filterRowContent: { gap: spacing.xs, paddingRight: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBg,
  },
  filterChipText: { ...typography.caption, color: colors.textSecondary },
  filterChipTextActive: { color: colors.white, fontWeight: '600' },

  // Feed
  feedHeader: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  // Delivery Card
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardLeftGroup: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusIcon: { fontSize: 22, marginRight: spacing.sm },
  cardInfo: { flex: 1 },
  cardCustomer: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  cardAddress: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  priorityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  cardMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, flex: 1 },
  metaChip: { ...typography.caption, color: colors.textSecondary },
  cardRightGroup: { alignItems: 'flex-end' },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  elapsed: { ...typography.caption, color: colors.textLight, marginTop: 4 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  refNo: { ...typography.caption, color: colors.textLight },
  chevron: { ...typography.h3, color: colors.textLight },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.textSecondary },
});

export default DeliveryMonitorScreen;
