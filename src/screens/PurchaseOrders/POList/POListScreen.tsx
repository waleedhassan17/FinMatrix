// ═══════════════════════════════════════════════════════
// FinMatrix — PO List Screen
// Mirrors Bills / Sales Orders / Estimates list UX:
//   • Always-rendered FlatList
//   • Initial centered loader only when (isLoading && items=0)
//   • Pull-to-refresh via separate `refreshing` state
//   • Pill status tabs, summary cards, FAB, "+ New" sm button
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchPurchaseOrders,
  selectItems,
  selectSearchQuery,
  selectStatusFilter,
  selectIsLoading,
  selectError,
  selectCounts,
  selectListTotals,
  setSearchQuery,
  setStatusFilter,
  type POStatusFilter,
} from './poListSlice';
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
import { PO_STATUS_COLORS, PO_STATUS_LABELS, formatPODate } from '../../../models/purchaseOrderModel';
import { formatCurrency } from '../../../utils/formatters';
import type { PurchaseOrder } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
const { colors, spacing, radius, shadows, typography } = THEME;

const POListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const rawItems = useAppSelector(selectItems);
  const searchQuery = useAppSelector(selectSearchQuery);
  const statusFilter = useAppSelector(selectStatusFilter);
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectError);
  const rawCounts = useAppSelector(selectCounts);
  const totals = useAppSelector(selectListTotals);

  const items = useMemo(() => (Array.isArray(rawItems) ? rawItems : []), [rawItems]);
  const counts = useMemo(
    () => ({
      all: Number(rawCounts?.all ?? 0),
      draft: Number(rawCounts?.draft ?? 0),
      sent: Number(rawCounts?.sent ?? 0),
      partially_received: Number(rawCounts?.partially_received ?? 0),
      fully_received: Number(rawCounts?.fully_received ?? 0),
      closed: Number(rawCounts?.closed ?? 0),
    }),
    [rawCounts],
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchPurchaseOrders());
  }, [dispatch]);

  // Re-fetch whenever filter/search changes
  useEffect(() => {
    dispatch(fetchPurchaseOrders());
  }, [statusFilter, searchQuery, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchPurchaseOrders());
    setRefreshing(false);
  }, [dispatch]);

  const TABS: TabItem<POStatusFilter>[] = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'Draft', value: 'draft', count: counts.draft },
    { label: 'Sent', value: 'sent', count: counts.sent },
    { label: 'Partial', value: 'partially_received', count: counts.partially_received },
    { label: 'Received', value: 'fully_received', count: counts.fully_received },
    { label: 'Closed', value: 'closed', count: counts.closed },
  ];

  // ── Render card ─────────────────────────────────
  const renderCard = useCallback(
    ({ item }: { item: PurchaseOrder }) => {
      const lines = Array.isArray(item.lines) ? item.lines : [];
      const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
      const totalReceived = lines.reduce((s, l) => s + l.receivedQuantity, 0);
      const receivedColor =
        totalQty > 0 && totalReceived === totalQty
          ? colors.success
          : totalReceived > 0
            ? colors.warning
            : undefined;

      return (
        <TxnCard
          number={item.poNumber}
          subtitle={item.vendorName}
          statusLabel={PO_STATUS_LABELS[item.status]}
          statusColor={PO_STATUS_COLORS[item.status]}
          metaLeft={`Ordered: ${formatPODate(item.orderDate)}`}
          metaRight={`Expected: ${formatPODate(item.expectedDate)}`}
          primaryLabel="Total"
          primaryValue={formatCurrency(item.total, 'Rs ')}
          secondaryLabel="Received"
          secondaryValue={`${totalReceived} / ${totalQty}`}
          secondaryColor={receivedColor}
          onPress={() => navigation.push('PODetail', { poId: item.id })}
        />
      );
    },
    [navigation],
  );

  // Only the FIRST load takes over the screen; background re-fetches must
  // never hide the FlatList (that used to leave a stuck spinner over no data).
  const initialLoading = isLoading && items.length === 0 && !refreshing;
  const loadFailed = !!error && items.length === 0;

  // Genuine first-run: no POs at all (not a filter/search result). Hide the
  // summary, tabs and FAB for a clean, professional zero-state.
  const isFirstRun =
    !initialLoading && !loadFailed && items.length === 0 && statusFilter === 'all' && !searchQuery.trim();
  // Summary / search / tabs only make sense once there is a list to act on.
  const showChrome = !initialLoading && !loadFailed && !isFirstRun;

  return (
    <ReportContainer>
      <ReportHeader
        title="Purchase Orders"
        onBack={() => navigation.goBack()}
        right={
          <>
            <HeaderIconButton icon="search" onPress={() => setSearchOpen(p => !p)} />
            <HeaderAction label="New" onPress={() => navigation.push('POForm')} />
          </>
        }
      />

      {/* ── Summary — the loader keeps it visible, as it did before ─────── */}
      {(showChrome || initialLoading) && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totals.totalPOs}</Text>
            <Text style={styles.summaryLabel}>Orders</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryMoney}>{formatCurrency(totals.totalValue, 'Rs ')}</Text>
            <Text style={styles.summaryLabel}>Total Value</Text>
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
            placeholder="Search purchase orders…"
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
          onChange={v => dispatch(setStatusFilter(v))}
        />
      )}

      {/* ── List / states ───────────────────────── */}
      {initialLoading ? (
        <LoadingBlock />
      ) : loadFailed ? (
        <ErrorBlock message={error!} onRetry={() => dispatch(fetchPurchaseOrders())} />
      ) : isFirstRun ? (
        <EmptyBlock
          icon="clipboard"
          title="No purchase orders yet"
          hint="Create your first purchase order to track what you've ordered from vendors."
          actionLabel="Create PO"
          onAction={() => navigation.push('POForm')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
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
              title="No purchase orders found"
              hint={searchQuery ? `No results for "${searchQuery}"` : 'Try a different filter.'}
            />
          }
        />
      )}
    </ReportContainer>
  );
};

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
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxs, paddingBottom: spacing.xxxxl + spacing.xxl },
});

export default POListScreen;
