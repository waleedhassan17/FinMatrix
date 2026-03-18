// ═══════════════════════════════════════════════════════
// FinMatrix — Invoice List Screen
// Filter tabs (All / Draft / Sent / Overdue / Paid) with
// counts, search, summary bar, and colored status cards.
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
  fetchInvoices,
  selectInvoices,
  selectInvoiceSearchQuery,
  selectInvoiceStatusFilter,
  selectInvoiceIsLoading,
  selectInvoiceError,
  setSearchQuery,
  setStatusFilter,
  type InvoiceStatusFilter,
} from './invoiceListSlice';
import EmptyState from '../../../components/EmptyState';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { Invoice, InvoiceStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;

// ── Status → colour mapping ──────────────────────────
const STATUS_COLOR: Record<InvoiceStatus, string> = {
  draft: '#94A3B8',
  sent: colors.secondary,
  paid: colors.success,
  overdue: colors.danger,
  cancelled: '#475569',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const InvoiceListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const invoices = useAppSelector(selectInvoices);
  const searchQuery = useAppSelector(selectInvoiceSearchQuery);
  const statusFilter = useAppSelector(selectInvoiceStatusFilter);
  const isLoading = useAppSelector(selectInvoiceIsLoading);
  const error = useAppSelector(selectInvoiceError);
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchInvoices());
    }, [dispatch]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchInvoices());
    setRefreshing(false);
  }, [dispatch]);

  // ── Tab counts ──────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<InvoiceStatusFilter, number> = {
      all: invoices.length,
      draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0,
    };
    invoices.forEach(i => { c[i.status]++; });
    return c;
  }, [invoices]);

  const TABS: { label: string; value: InvoiceStatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Sent', value: 'sent' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Paid', value: 'paid' },
  ];

  // ── Filtered list ───────────────────────────────
  const filtered = useMemo(() => {
    let list = invoices;

    if (statusFilter !== 'all') {
      list = list.filter(i => i.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        i =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q),
      );
    }

    return [...list].sort(
      (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime(),
    );
  }, [invoices, statusFilter, searchQuery]);

  // ── Summary values ──────────────────────────────
  const totalOutstanding = useMemo(
    () =>
      invoices
        .filter(i => i.status === 'sent' || i.status === 'overdue')
        .reduce((sum, i) => sum + (i.total - i.amountPaid), 0),
    [invoices],
  );

  const overdueAmount = useMemo(
    () =>
      invoices
        .filter(i => i.status === 'overdue')
        .reduce((sum, i) => sum + (i.total - i.amountPaid), 0),
    [invoices],
  );

  // ── Render invoice card ─────────────────────────
  const renderCard = ({ item: inv }: { item: Invoice }) => {
    const statusCol = STATUS_COLOR[inv.status];
    const balance = inv.total - inv.amountPaid;

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: statusCol, borderLeftWidth: 4 }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: inv.id })}
      >
        {/* Top row */}
        <View style={styles.cardTop}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.cardInvNo}>{inv.invoiceNumber}</Text>
            <Text style={styles.cardCustomer} numberOfLines={1}>{inv.customerName}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusCol + '18' }]}>
            <Text style={[styles.badgeText, { color: statusCol }]}>
              {STATUS_LABEL[inv.status]}
            </Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.cardDates}>
          <Text style={styles.dateText}>Issued: {formatDate(inv.issueDate)}</Text>
          <Text style={styles.dateText}>Due: {formatDate(inv.dueDate)}</Text>
        </View>

        {/* Amounts */}
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.amtLabel}>Total</Text>
            <Text style={styles.amtValue}>{formatCurrency(inv.total, 'Rs ')}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amtLabel}>Balance</Text>
            <Text
              style={[
                styles.amtValue,
                { color: balance > 0 ? colors.danger : colors.success },
              ]}
            >
              {formatCurrency(balance, 'Rs ')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoices</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={styles.searchToggle}>
            <Text style={styles.searchToggleIcon}>🔍</Text>
          </TouchableOpacity>
          <CustomButton
            title="+ New"
            onPress={() => navigation.navigate('InvoiceForm')}
            variant="primary"
            size="sm"
          />
        </View>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 14 }]}>
            {formatCurrency(totalOutstanding, 'Rs ')}
          </Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { fontSize: 14, color: colors.danger }]}>
            {formatCurrency(overdueAmount, 'Rs ')}
          </Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
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
            onChangeText={v => dispatch(setSearchQuery(v))}
            placeholder="Search by invoice # or customer…"
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
              onPress={() => dispatch(setStatusFilter(tab.value))}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
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
      {isLoading && invoices.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && invoices.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="Failed to Load"
            message={error}
            actionLabel="Retry"
            onAction={() => dispatch(fetchInvoices())}
          />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            title="No Invoices Found"
            message={searchQuery ? `No results for "${searchQuery}"` : 'Create your first invoice to get started.'}
            actionLabel="Create Invoice"
            onAction={() => navigation.navigate('InvoiceForm')}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
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
        onPress={() => navigation.navigate('InvoiceForm')}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { fontSize: 14, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.xs },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  searchToggle: { padding: spacing.xs },
  searchToggleIcon: { fontSize: 18 },

  // ── Summary ────────────────────────────────────
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

  // ── Search ─────────────────────────────────────
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

  // ── Tabs ───────────────────────────────────────
  tabsScroll: {
    minHeight: 44,
  },
  tabsRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm + 2,
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

  // ── Cards ──────────────────────────────────────
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: 80 },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardInvNo: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  cardCustomer: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },
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

  // ── Empty / Loading ────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: { fontSize: 15, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  // ── FAB ────────────────────────────────────────
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

export default InvoiceListScreen;
