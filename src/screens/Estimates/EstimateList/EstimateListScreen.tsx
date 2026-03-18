// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate List Screen
// Filter tabs: All / Draft / Sent / Accepted / Declined / Expired
// ═══════════════════════════════════════════════════════

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchEstimates,
  selectEstimates,
  selectEstimateSearchQuery,
  selectEstimateStatusFilter,
  selectEstimateIsLoading,
  selectEstimateError,
  setEstimateSearchQuery,
  setEstimateStatusFilter,
  type EstimateStatusFilter,
} from './estimateListSlice';
import EmptyState from '../../../components/EmptyState';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { Estimate, EstimateStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;

const STATUS_COLOR: Record<EstimateStatus, string> = {
  draft: '#94A3B8',
  sent: colors.secondary,
  accepted: colors.success,
  declined: colors.danger,
  expired: '#475569',
};

const STATUS_LABEL: Record<EstimateStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
};

// ═══════════════════════════════════════════════════════
const EstimateListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const estimates = useAppSelector(selectEstimates);
  const searchQuery = useAppSelector(selectEstimateSearchQuery);
  const statusFilter = useAppSelector(selectEstimateStatusFilter);
  const isLoading = useAppSelector(selectEstimateIsLoading);
  const error = useAppSelector(selectEstimateError);
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchEstimates());
    }, [dispatch]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchEstimates());
    setRefreshing(false);
  }, [dispatch]);

  // ── Tab counts ──────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<EstimateStatusFilter, number> = {
      all: estimates.length, draft: 0, sent: 0, accepted: 0, declined: 0, expired: 0,
    };
    estimates.forEach(e => { c[e.status]++; });
    return c;
  }, [estimates]);

  const TABS: { label: string; value: EstimateStatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Sent', value: 'sent' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Declined', value: 'declined' },
    { label: 'Expired', value: 'expired' },
  ];

  // ── Filtered list ───────────────────────────────
  const filtered = useMemo(() => {
    let list = estimates;
    if (statusFilter !== 'all') {
      list = list.filter(e => e.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        e =>
          e.estimateNumber.toLowerCase().includes(q) ||
          e.customerName.toLowerCase().includes(q),
      );
    }
    return [...list].sort(
      (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime(),
    );
  }, [estimates, statusFilter, searchQuery]);

  // ── Summary ─────────────────────────────────────
  const totalSent = useMemo(
    () => estimates.filter(e => e.status === 'sent').reduce((s, e) => s + e.total, 0),
    [estimates],
  );
  const totalAccepted = useMemo(
    () => estimates.filter(e => e.status === 'accepted').reduce((s, e) => s + e.total, 0),
    [estimates],
  );

  // ── Render card ─────────────────────────────────
  const renderCard = ({ item: est }: { item: Estimate }) => {
    const statusCol = STATUS_COLOR[est.status];
    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: statusCol, borderLeftWidth: 4 }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('EstimateDetail', { estimateId: est.id })}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.cardNo}>{est.estimateNumber}</Text>
            <Text style={styles.cardCustomer} numberOfLines={1}>{est.customerName}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusCol + '18' }]}>
            <Text style={[styles.badgeText, { color: statusCol }]}>
              {STATUS_LABEL[est.status]}
            </Text>
          </View>
        </View>
        <View style={styles.cardDates}>
          <Text style={styles.dateText}>Issued: {formatDate(est.issueDate)}</Text>
          <Text style={styles.dateText}>Expires: {formatDate(est.expirationDate)}</Text>
        </View>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.amtLabel}>Total</Text>
            <Text style={styles.amtValue}>{formatCurrency(est.total, 'Rs ')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ═══════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Estimates</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.searchToggle}>
            <Text style={styles.searchToggleIcon}>🔍</Text>
          </TouchableOpacity>
          <CustomButton
            title="+ New"
            onPress={() => navigation.navigate('EstimateForm')}
            variant="primary"
            size="sm"
          />
        </View>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 14 }]}>
            {formatCurrency(totalSent, 'Rs ')}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 14, color: colors.success }]}>
            {formatCurrency(totalAccepted, 'Rs ')}
          </Text>
          <Text style={styles.summaryLabel}>Accepted</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{counts.all}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* Search */}
      {showSearch && (
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={v => dispatch(setEstimateSearchQuery(v))}
            placeholder="Search by estimate # or customer…"
            placeholderTextColor={colors.textLight}
            autoFocus
          />
        </View>
      )}

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map(tab => {
          const active = statusFilter === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.tab, active && styles.tabActive]}
              activeOpacity={0.7}
              onPress={() => dispatch(setEstimateStatusFilter(tab.value))}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              <View style={[styles.tabCount, active && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                  {counts[tab.value]}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {isLoading && estimates.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && estimates.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="Failed to Load"
            message={error}
            actionLabel="Retry"
            onAction={() => dispatch(fetchEstimates())}
          />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="No Estimates Found"
            message={searchQuery ? `No results for "${searchQuery}"` : 'Create your first estimate to get started.'}
            actionLabel="Create Estimate"
            onAction={() => navigation.navigate('EstimateForm')}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => e.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('EstimateForm')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { ...THEME.typography.labelLg, color: colors.secondary, marginBottom: spacing.xs },
  headerTitle: { ...THEME.typography.h2, color: colors.textPrimary },
  searchToggle: { padding: spacing.xs },
  searchToggleIcon: { fontSize: 18 },
  summaryRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  summaryCard: { flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.sm, paddingVertical: spacing.sm + 4, paddingHorizontal: spacing.sm, alignItems: 'center', ...shadows.small },
  summaryValue: { ...THEME.typography.h3, fontWeight: '800', color: colors.primary },
  summaryLabel: { ...THEME.typography.labelSm, fontWeight: '400', color: colors.textSecondary, marginTop: 2 },
  searchRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, ...THEME.typography.bodyMd, color: colors.textPrimary },
  tabsScroll: { minHeight: 44 },
  tabsRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm + 2,
    alignItems: 'center',
    gap: spacing.sm,
  },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...THEME.typography.bodySm, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  tabCount: { marginLeft: spacing.xs, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 22, alignItems: 'center' },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { ...THEME.typography.labelSm, fontWeight: '700', color: colors.textSecondary },
  tabCountTextActive: { color: colors.white },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: 80 },
  card: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadows.card },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardNo: { ...THEME.typography.h4, fontWeight: '700', color: colors.textPrimary },
  cardCustomer: { ...THEME.typography.bodySm, color: colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  badgeText: { ...THEME.typography.labelSm, fontWeight: '700' },
  cardDates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  dateText: { ...THEME.typography.caption, color: colors.textLight },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  amtLabel: { ...THEME.typography.labelSm, fontWeight: '400', color: colors.textLight },
  amtValue: { ...THEME.typography.h4, fontWeight: '700', color: colors.textPrimary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: { ...THEME.typography.h4, fontWeight: 'normal', color: colors.textSecondary },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', ...shadows.large },
  fabIcon: { ...THEME.typography.displayMd, color: colors.white, fontWeight: '300', marginTop: -2 },
});

export default EstimateListScreen;
