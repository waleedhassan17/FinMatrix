// ═══════════════════════════════════════════════════════
// FinMatrix — Bill List Screen
// Same pattern as InvoiceListScreen with
// Status: Draft / Open / Partially Paid / Paid / Overdue
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchBills,
  selectBills,
  selectBillSearchQuery,
  selectBillStatusFilter,
  selectBillIsLoading,
  selectBillIsLoadingMore,
  selectBillError,
  selectBillPaging,
  selectBillCounts,
  selectBillTotals,
  setSearchQuery,
  setStatusFilter,
  type BillStatusFilter,
} from './billListSlice';
import {
  ReportContainer,
  ReportHeader,
  HeaderAction,
  HeaderIconButton,
  EmptyBlock,
  LoadingBlock,
  ErrorBlock,
} from '../../../components/reports/ReportUI';
import { TxnCard } from '../../../components/transactions/TxnListUI';
import { FilterTabs, type TabItem } from '../../../components/shared/Tabs';
import { BILL_STATUS_COLORS, BILL_STATUS_LABELS } from '../../../models/billModel';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { Bill } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
const { colors, radius, shadows, spacing, typography } = THEME;

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
  const isLoadingMore = useAppSelector(selectBillIsLoadingMore);
  const error = useAppSelector(selectBillError);
  const { page, totalPages } = useAppSelector(selectBillPaging);
  // The server's counts and totals, over every bill the search matches.
  const counts = useAppSelector(selectBillCounts);
  const { totalOutstanding, overdueAmount } = useAppSelector(selectBillTotals);
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

  // Server-side search, debounced so a request is not fired per keystroke.
  // The first run is skipped: the focus effect above has just loaded.
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchMounted = useRef(false);
  useEffect(() => {
    if (!searchMounted.current) {
      searchMounted.current = true;
      return;
    }
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => { dispatch(fetchBills()); }, 350);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchQuery, dispatch]);

  const onTab = useCallback(
    (v: BillStatusFilter) => {
      dispatch(setStatusFilter(v));
      dispatch(fetchBills());
    },
    [dispatch],
  );

  // The next page, as the list nears its end.
  const onEndReached = useCallback(() => {
    if (isLoading || isLoadingMore || page >= totalPages) return;
    dispatch(fetchBills({ page: page + 1, append: true }));
  }, [dispatch, isLoading, isLoadingMore, page, totalPages]);

  const TABS: TabItem<BillStatusFilter>[] = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'Draft', value: 'draft', count: counts.draft },
    { label: 'Open', value: 'open', count: counts.open },
    { label: 'Overdue', value: 'overdue', count: counts.overdue },
    { label: 'Part. Paid', value: 'partial', count: counts.partial },
    { label: 'Paid', value: 'paid', count: counts.paid },
  ];

  // ── The list ────────────────────────────────────
  // Already searched and filtered by the server, in its order. The tab is
  // applied here too only so a switch shows at once, before the answer lands.
  const filtered = useMemo(
    () => (statusFilter === 'all' ? bills : bills.filter(b => b.status === statusFilter)),
    [bills, statusFilter],
  );

  // ── Render card ─────────────────────────────────
  const renderCard = useCallback(({ item }: { item: Bill }) => {
    const balance = item.total - item.amountPaid;

    return (
      <TxnCard
        number={item.billNumber}
        subtitle={item.vendorName}
        statusLabel={BILL_STATUS_LABELS[item.status]}
        statusColor={BILL_STATUS_COLORS[item.status]}
        metaLeft={`Issued: ${formatDate(item.issueDate)}`}
        metaRight={`Due: ${formatDate(item.dueDate)}`}
        primaryLabel="Total"
        primaryValue={formatCurrency(item.total, 'Rs ')}
        secondaryLabel="Balance"
        secondaryValue={formatCurrency(balance, 'Rs ')}
        secondaryColor={balance > 0 ? colors.danger : undefined}
        onPress={() => navigation.push('BillDetail', { billId: item.id })}
      />
    );
  }, [navigation]);

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  const initialLoading = isLoading && bills.length === 0;
  const loadFailed = !!error && bills.length === 0;

  // Genuine first-run: no bills at all, and neither loading nor failed.
  // Hide summary, tabs and FAB for a clean, professional zero-state — but not
  // while a search or a tab narrows the list, or an empty result could not be
  // cleared.
  const isFirstRun =
    !initialLoading && !loadFailed && bills.length === 0 && !searchQuery.trim() && statusFilter === 'all';
  // Summary / search / tabs only make sense once there is a list to act on.
  const showChrome = !initialLoading && !loadFailed && !isFirstRun;

  return (
    <ReportContainer>
      <ReportHeader
        title="Bills"
        onBack={() => navigation.goBack()}
        right={
          <>
            <HeaderIconButton icon="search" onPress={() => setSearchOpen(p => !p)} />
            <HeaderAction label="New" onPress={() => navigation.push('BillForm')} />
          </>
        }
      />

      {/* ── Summary Bar — hidden on first-run ───── */}
      {!showChrome ? null : (
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryMoney}>{formatCurrency(totalOutstanding, 'Rs ')}</Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryMoney, { color: colors.danger }]}>
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
      {searchOpen && showChrome && (
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={v => dispatch(setSearchQuery(v))}
            placeholder="Search bills…"
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />
        </View>
      )}

      {/* ── Filter Tabs — hidden on first-run ───── */}
      {showChrome && (
        <FilterTabs
          tabs={TABS}
          active={statusFilter}
          onChange={onTab}
        />
      )}

      {/* ── List / states ───────────────────────── */}
      {initialLoading ? (
        <LoadingBlock />
      ) : loadFailed ? (
        <ErrorBlock message={error!} onRetry={() => dispatch(fetchBills())} />
      ) : isFirstRun ? (
        <EmptyBlock
          icon="file-text"
          title="No bills yet"
          hint="Record your first vendor bill to track expenses and payments."
          actionLabel="Create Bill"
          onAction={() => navigation.push('BillForm')}
        />
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
            <EmptyBlock
              icon="search"
              title="No bills found"
              hint={searchQuery ? `No results for "${searchQuery}"` : 'Try a different filter.'}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </ReportContainer>
  );
};

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
// Scaffold, tabs and cards now come from ReportUI / TxnListUI; what remains
// is the summary strip and the search field, which are specific to this screen.
const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    ...shadows.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: { ...typography.h3, color: colors.actionGreen },
  // Money sits a step smaller than the plain count so a long figure fits.
  summaryMoney: { ...typography.h5, color: colors.actionGreen, fontVariant: ['tabular-nums'] },
  summaryLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  searchRow: { paddingHorizontal: spacing.xl, marginBottom: spacing.xs },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: THEME.form.controlRadius,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.bodyMd,
    color: colors.textPrimary,
  },

  list: { flex: 1 },
  footer: { paddingVertical: spacing.md, alignItems: 'center' },
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxs, paddingBottom: spacing.xxxxl + spacing.xxl },
});

export default BillListScreen;
