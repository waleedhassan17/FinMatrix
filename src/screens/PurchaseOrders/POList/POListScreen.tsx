// ═══════════════════════════════════════════════════════
// FinMatrix — PO List Screen
// Mirrors Bills / Sales Orders / Estimates list UX:
//   • Always-rendered FlatList
//   • Initial centered loader only when (isLoading && items=0)
//   • Pull-to-refresh via separate `refreshing` state
//   • Pill status tabs, summary cards, FAB, "+ New" sm button
// ═══════════════════════════════════════════════════════

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectSearchQuery,
  selectStatusFilter,
  setSearchQuery,
  setStatusFilter,
  type POStatusFilter,
} from './poListSlice';
import { getPurchaseOrdersAPI } from '../../../networks/purchases/purchaseOrderNetwork';
import { purchaseOrderListSerializer } from '../../../serializers/purchaseOrderSerializer';
import { toApiPOStatus } from '../../../models/purchaseOrderModel';
import { useDebouncedValue, usePagedList } from '../../../hooks/usePagedList';
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
import { usePendingApprovals } from '../../../hooks/usePendingApprovals';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
const { colors, radius, shadows, spacing, typography } = THEME;

const POListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();

  const searchQuery = useAppSelector(selectSearchQuery);
  const statusFilter = useAppSelector(selectStatusFilter);

  // Searched, filtered by tab, paged and counted BY THE SERVER. This read one
  // page and counted its tabs and summed "Total Value" over that page alone.
  const search = useDebouncedValue(searchQuery.trim());
  const list = usePagedList(
    useCallback(
      (page: number, limit: number) => {
        const apiStatus = toApiPOStatus(statusFilter);
        return getPurchaseOrdersAPI({
          page,
          limit,
          ...(search ? { search } : {}),
          ...(apiStatus ? { status: apiStatus } : {}),
        });
      },
      [search, statusFilter],
    ),
    p => purchaseOrderListSerializer(p).purchaseOrders,
    `${search}|${statusFilter}`,
  );
  const items = list.rows;
  const isLoading = list.isLoading;
  const error = list.error;

  // The server's statuses (partial, received) under the app's names.
  const counts = useMemo(() => {
    const by = list.summary?.byStatus ?? {};
    const n = (k: string) => by[k]?.count ?? 0;
    return {
      all: list.summary?.count ?? items.length,
      draft: n('draft'),
      sent: n('sent'),
      partially_received: n('partial'),
      fully_received: n('received'),
      closed: n('closed'),
    };
  }, [list.summary, items.length]);
  const totals = useMemo(
    () => ({
      totalPOs: list.summary?.count ?? list.total,
      totalValue: Number(list.extras?.totals?.total ?? 0),
    }),
    [list.summary, list.total, list.extras],
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // A staff member's PO does not exist until the owner approves it, so it is
  // absent from this list entirely — which reads as "my request vanished".
  // Showing the pending requests above the list closes that gap without
  // faking a PO row: these are requests, and they say so.
  //
  // The role gate, the fetch and the fail-soft moved into the hook; this was
  // the first of four copies of them.
  const {
    requests: pendingRequests,
    reload: loadPending,
    showsPending,
  } = usePendingApprovals('po', 'purchaseOrder.create');

  // The list reloads itself on focus and when the search or tab changes. On
  // focus the pending requests reload too: the owner approves elsewhere, and
  // coming back is when the real PO should appear and the pending row drop off.
  useFocusEffect(
    useCallback(() => {
      void loadPending();
    }, [loadPending]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    list.reload();
    await loadPending();
    setRefreshing(false);
  }, [list, loadPending]);

  const TABS: TabItem<POStatusFilter>[] = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'Requisitions', value: 'draft', count: counts.draft },
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

  /**
   * The requests waiting on the owner, above the real POs.
   *
   * Read-only on purpose: there is no PO to open yet, so tapping goes to My
   * Requests — the one screen that owns request status, including a rejection
   * and its reason. Rendering an editable-looking PO row here would promise
   * something that does not exist.
   */
  const openMyRequests = useCallback(() => {
    // This screen sits in the Transactions tab; My Requests is in the staff
    // More tab, so the hop goes through the parent tab navigator (same pattern
    // as the delivery reversal hand-off).
    const tabs = (navigation.getParent() ?? navigation) as unknown as {
      navigate: (name: string, params?: Record<string, unknown>) => void;
    };
    // initial: false puts StaffMoreHub underneath, so back returns there
    // instead of finding an empty stack and falling through to the Dashboard.
    tabs.navigate('StaffMoreStack', { screen: 'MyRequests', initial: false });
  }, [navigation]);

  const PendingSection = useMemo(() => {
    if (!showsPending || pendingRequests.length === 0) return null;
    return (
      <View style={styles.pendingBlock}>
        <Text style={styles.pendingHeading}>
          Waiting for approval · {pendingRequests.length}
        </Text>
        {pendingRequests.map(req => (
          <TouchableOpacity
            key={req.id}
            style={styles.pendingRow}
            onPress={openMyRequests}
            activeOpacity={0.7}
          >
            <Feather name="clock" size={15} color={colors.warning} />
            <View style={styles.pendingBody}>
              <Text style={styles.pendingSummary} numberOfLines={2}>
                {req.summary}
              </Text>
              <Text style={styles.pendingMeta}>
                Sent to the owner · not a purchase order yet
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [showsPending, pendingRequests, openMyRequests]);

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

      {/* ── Waiting on the owner ────────────────────────────────────────────
          Above the list and outside `showChrome` on purpose: a staff member's
          very first PO is a pending request with no PO behind it, which is
          exactly the first-run state — the one time this strip matters most. */}
      {PendingSection}

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
        <ErrorBlock message={error!} onRetry={list.reload} />
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
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            list.isLoadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
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
  footer: { paddingVertical: spacing.md, alignItems: 'center' },
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

  // Deliberately lighter than a TxnCard: these are not purchase orders, and
  // should not compete with the real ones below.
  pendingBlock: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xs,
  },
  pendingHeading: {
    ...typography.overline,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning + '0F',
    borderWidth: 1,
    borderColor: colors.warning + '33',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xxs,
  },
  pendingBody: { flex: 1 },
  pendingSummary: { ...typography.labelMd, color: colors.textPrimary },
  pendingMeta: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },
});

export default POListScreen;
