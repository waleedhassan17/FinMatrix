// ═══════════════════════════════════════════════════════
// FinMatrix — Bill List Screen
// Same pattern as InvoiceListScreen with
// Status: Draft / Open / Partially Paid / Paid / Overdue
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchBills,
  selectBills,
  selectBillSearchQuery,
  selectBillStatusFilter,
  selectBillIsLoading,
  setSearchQuery,
  setStatusFilter,
  type BillStatusFilter,
} from './billListSlice';
import { BILL_STATUS_COLORS, BILL_STATUS_LABELS } from '../../../models/billModel';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { Bill, BillStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const BillListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const bills = useAppSelector(selectBills);
  const searchQuery = useAppSelector(selectBillSearchQuery);
  const statusFilter = useAppSelector(selectBillStatusFilter);
  const isLoading = useAppSelector(selectBillIsLoading);
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { dispatch(fetchBills()); }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchBills());
    setRefreshing(false);
  }, [dispatch]);

  // ── Tab counts ──────────────────────────────────
  const counts = useMemo(() => {
    const c = { all: bills.length, draft: 0, open: 0, partially_paid: 0, paid: 0, overdue: 0 };
    bills.forEach(b => { c[b.status] = (c[b.status] || 0) + 1; });
    return c;
  }, [bills]);

  const TABS: { label: string; value: BillStatusFilter; count: number }[] = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'Draft', value: 'draft', count: counts.draft },
    { label: 'Open', value: 'open', count: counts.open },
    { label: 'Overdue', value: 'overdue', count: counts.overdue },
    { label: 'Part. Paid', value: 'partially_paid', count: counts.partially_paid },
    { label: 'Paid', value: 'paid', count: counts.paid },
  ];

  // ── Filtered list ───────────────────────────────
  const filtered = useMemo(() => {
    let list = bills;
    if (statusFilter !== 'all') list = list.filter(b => b.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        b => b.billNumber.toLowerCase().includes(q) || b.vendorName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [bills, statusFilter, searchQuery]);

  // ── Summary values ──────────────────────────────
  const { totalOutstanding, overdueAmount } = useMemo(() => {
    let outstanding = 0;
    let overdue = 0;
    bills.forEach(b => {
      if (b.status === 'open' || b.status === 'overdue' || b.status === 'partially_paid') {
        const bal = b.total - b.amountPaid;
        outstanding += bal;
        if (b.status === 'overdue') overdue += bal;
      }
    });
    return { totalOutstanding: outstanding, overdueAmount: overdue };
  }, [bills]);

  // ── Render card ─────────────────────────────────
  const renderCard = useCallback(({ item }: { item: Bill }) => {
    const statusColor = BILL_STATUS_COLORS[item.status];
    const balance = item.total - item.amountPaid;

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: statusColor }]}
        activeOpacity={0.6}
        onPress={() => navigation.navigate('BillDetail', { billId: item.id })}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardBillNo}>{item.billNumber}</Text>
            <Text style={styles.cardVendor}>{item.vendorName}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {BILL_STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.cardDates}>
          <Text style={styles.dateText}>Issued: {formatDate(item.issueDate)}</Text>
          <Text style={styles.dateText}>Due: {formatDate(item.dueDate)}</Text>
        </View>

        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.amtLabel}>Total</Text>
            <Text style={styles.amtValue}>{formatCurrency(item.total, 'Rs ')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amtLabel}>Balance</Text>
            <Text style={[styles.amtValue, balance > 0 && { color: colors.danger }]}>
              {formatCurrency(balance, 'Rs ')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  if (isLoading && bills.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ──────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Bills</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.searchToggle} onPress={() => setSearchOpen(p => !p)}>
              <Text style={styles.searchToggleIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('BillForm')} activeOpacity={0.7}>
              <Text style={[styles.backBtn, { marginBottom: 0 }]}>+ New</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Summary Bar ─────────────────────────── */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatCurrency(totalOutstanding, 'Rs ')}</Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>
            {formatCurrency(overdueAmount, 'Rs ')}
          </Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{counts.all}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* ── Search ──────────────────────────────── */}
      {searchOpen && (
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={v => dispatch(setSearchQuery(v))}
            placeholder="Search bills…"
            placeholderTextColor={colors.textLight}
            autoFocus
          />
        </View>
      )}

      {/* ── Filter Tabs ─────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map(tab => {
          const active = statusFilter === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => dispatch(setStatusFilter(tab.value))}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              <View style={[styles.tabCount, active && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── List ────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>No bills found</Text>
          </View>
        }
      />

      {/* ── FAB ─────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('BillForm')}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { fontSize: 14, fontWeight: '600', color: colors.secondary, fontFamily: typography.fontFamily, marginBottom: spacing.xs },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  searchToggle: { padding: spacing.xs },
  searchToggleIcon: { fontSize: 18 },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    ...shadows.small,
  },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, fontFamily: typography.fontFamily, marginTop: 2 },

  searchRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },

  tabsRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, fontFamily: typography.fontFamily },
  tabTextActive: { color: colors.white },
  tabCount: {
    marginLeft: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, fontFamily: typography.fontFamily },
  tabCountTextActive: { color: colors.white },

  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 80 },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardBillNo: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },
  cardVendor: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: typography.fontFamily },

  cardDates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  dateText: { fontSize: 12, color: colors.textLight, fontFamily: typography.fontFamily },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  amtLabel: { fontSize: 11, color: colors.textLight, fontFamily: typography.fontFamily },
  amtValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: { fontSize: 15, color: colors.textSecondary, fontFamily: typography.fontFamily },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
  },
  fabIcon: { fontSize: 28, color: colors.white, fontWeight: '300', marginTop: -2 },
});

export default BillListScreen;
