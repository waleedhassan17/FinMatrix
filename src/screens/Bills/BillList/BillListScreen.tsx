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
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchBills,
  selectBills,
  selectBillSearchQuery,
  selectBillStatusFilter,
  selectBillIsLoading,
  selectBillError,
  setSearchQuery,
  setStatusFilter,
  type BillStatusFilter,
} from './billListSlice';
import EmptyState from '../../../components/shared/EmptyState';
import CustomButton from '../../../Custom-Components/CustomButton';
import { HEADER_NAVY, HeaderAction } from '../../../components/reports/ReportUI';
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
  const error = useAppSelector(selectBillError);
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Refetch on focus so a payment or edit made elsewhere is reflected without
  // a manual pull — matches InvoiceListScreen.
  useFocusEffect(useCallback(() => { dispatch(fetchBills()); }, [dispatch]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchBills());
    setRefreshing(false);
  }, [dispatch]);

  // ── Tab counts ──────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bills.length, draft: 0, open: 0, partial: 0, paid: 0, overdue: 0, void: 0 };
    bills.forEach(b => { c[b.status] = (c[b.status] ?? 0) + 1; });
    return c;
  }, [bills]);

  const TABS: { label: string; value: BillStatusFilter; count: number }[] = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'Draft', value: 'draft', count: counts.draft },
    { label: 'Open', value: 'open', count: counts.open },
    { label: 'Overdue', value: 'overdue', count: counts.overdue },
    { label: 'Part. Paid', value: 'partial', count: counts.partial },
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
      if (b.status === 'open' || b.status === 'overdue' || b.status === 'partial') {
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
        onPress={() => navigation.push('BillDetail', { billId: item.id })}
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
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && bills.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.center}>
          <EmptyState title="Failed to Load" message={error} actionLabel="Retry" onAction={() => dispatch(fetchBills())} />
        </View>
      </SafeAreaView>
    );
  }

  // Genuine first-run (loading / error empties are handled above): no bills at
  // all. Hide summary, tabs and FAB for a clean, professional zero-state.
  const isFirstRun = bills.length === 0;

  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
      <View style={styles.body}>
      {/* ── Header ────────────────────────── */}
      <LinearGradient colors={HEADER_NAVY} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Bills</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.searchToggle} onPress={() => setSearchOpen(p => !p)}>
              <Feather name="search" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <HeaderAction label="New" onPress={() => navigation.push('BillForm')} />
          </View>
        </View>
      </LinearGradient>

      {/* ── Summary Bar — hidden on first-run ───── */}
      {!isFirstRun && (
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
      )}

      {/* ── Search ──────────────────────────────── */}
      {searchOpen && !isFirstRun && (
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

      {/* ── Filter Tabs — hidden on first-run ───── */}
      {!isFirstRun && (
      <View style={styles.tabsBar}>
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
      </View>
      )}

      {/* ── List / states ───────────────────────── */}
      {isFirstRun ? (
        <View style={styles.emptyFull}>
          <EmptyState
            icon="file-text"
            title="No bills yet"
            message="Record your first vendor bill to track expenses and payments."
            actionLabel="Create Bill"
            onAction={() => navigation.push('BillForm')}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <EmptyState
                icon="search"
                title="No Bills Found"
                message={searchQuery ? `No results for "${searchQuery}"` : 'Try a different filter.'}
              />
            </View>
          }
        />
      )}

      {/* ── FAB — hidden on first-run ───────────── */}
      </View>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeTop: { backgroundColor: HEADER_NAVY[0] },
  body: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', fontFamily: THEME.typography.fontFamily },
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
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },

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
    fontFamily: THEME.typography.fontFamily,
  },

  // Fixed-height bar so the tab row keeps a constant vertical slot and never
  // shifts between "has results" / "empty filter" list states.
  tabsBar: {
    height: 52,
    justifyContent: 'center',
  },
  tabsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  tabsRow: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
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
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
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
  tabCountText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  tabCountTextActive: { color: colors.white },

  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: 80 },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardBillNo: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  cardVendor: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },

  cardDates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  dateText: { fontSize: 12, color: colors.textLight, fontFamily: THEME.typography.fontFamily },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  amtLabel: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },
  amtValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyFull: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: { fontSize: 15, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

});

export default BillListScreen;
