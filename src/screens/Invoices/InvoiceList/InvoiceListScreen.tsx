// ═══════════════════════════════════════════════════════
// FinMatrix — Invoice List Screen
// Filter tabs (All / Draft / Sent / Overdue / Paid) with
// counts, search, summary bar, and colored status cards.
// Searched, filtered and paged by the server; the counts and
// tiles are the server's, over every invoice the search matches.
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { usePendingApprovals } from '../../../hooks/usePendingApprovals';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchInvoices,
  selectInvoices,
  selectInvoiceSearchQuery,
  selectInvoiceStatusFilter,
  selectInvoiceIsLoading,
  selectInvoiceIsLoadingMore,
  selectInvoiceError,
  selectInvoicePaging,
  selectInvoiceSummary,
  setSearchQuery,
  setStatusFilter,
  type InvoiceStatusFilter,
} from './invoiceListSlice';
import { statusCountsOf } from '../../../models/documentListModel';
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
import { txnStatusColor } from '../../../components/transactions/txnStatus';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { Invoice } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
const { colors, radius, shadows, spacing, typography } = THEME;

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
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
  const isLoadingMore = useAppSelector(selectInvoiceIsLoadingMore);
  const error = useAppSelector(selectInvoiceError);
  const { page, totalPages } = useAppSelector(selectInvoicePaging);
  const summary = useAppSelector(selectInvoiceSummary);
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoading = isLoading && invoices.length === 0;

  // A staff member's invoice does not exist until the owner approves it, so it
  // is absent from this list — which reads as "my request vanished". Same gap
  // the PO list closes, and the same answer: show the requests, and say plainly
  // that they are not invoices yet.
  const {
    requests: pendingRequests,
    reload: loadPending,
    showsPending,
  } = usePendingApprovals('invoice', 'invoice.create');

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchInvoices());
      // On focus, because coming back here is exactly when a just-approved
      // request should become a real invoice and drop off the strip.
      void loadPending();
    }, [dispatch, loadPending]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([dispatch(fetchInvoices()), loadPending()]);
    setRefreshing(false);
  }, [dispatch, loadPending]);

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
    searchDebounce.current = setTimeout(() => { dispatch(fetchInvoices()); }, 350);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchQuery, dispatch]);

  const onTab = useCallback(
    (v: InvoiceStatusFilter) => {
      dispatch(setStatusFilter(v));
      dispatch(fetchInvoices());
    },
    [dispatch],
  );

  // The next page, as the list nears its end.
  const onEndReached = useCallback(() => {
    if (isLoading || isLoadingMore || page >= totalPages) return;
    dispatch(fetchInvoices({ page: page + 1, append: true }));
  }, [dispatch, isLoading, isLoadingMore, page, totalPages]);

  // ── Tab counts ──────────────────────────────────
  // The server's, over every invoice the search matches — not the page held.
  const counts = useMemo(() => statusCountsOf(summary, invoices), [summary, invoices]);

  const TABS: TabItem<InvoiceStatusFilter>[] = [
    { label: 'All', value: 'all', count: counts.all ?? 0 },
    { label: 'Draft', value: 'draft', count: counts.draft ?? 0 },
    { label: 'Sent', value: 'sent', count: counts.sent ?? 0 },
    { label: 'Overdue', value: 'overdue', count: counts.overdue ?? 0 },
    { label: 'Paid', value: 'paid', count: counts.paid ?? 0 },
  ];

  // ── The list ────────────────────────────────────
  // Already searched and filtered by the server, in its order. The tab is
  // applied here too only so a switch shows at once, before the answer lands.
  const filtered = useMemo(
    () => (statusFilter === 'all' ? invoices : invoices.filter(i => i.status === statusFilter)),
    [invoices, statusFilter],
  );

  // ── Summary values ──────────────────────────────
  // The server's figures; from what has loaded only with an older server.
  const { totalOutstanding, overdueAmount, invoiceCount } = useMemo(() => {
    if (summary) {
      return { totalOutstanding: summary.outstanding, overdueAmount: summary.overdue, invoiceCount: summary.count };
    }
    let outstanding = 0;
    let overdue = 0;
    invoices.forEach(i => {
      const balance = i.total - i.amountPaid;
      if (i.status === 'sent' || i.status === 'partial' || i.status === 'overdue') outstanding += balance;
      if (i.status === 'overdue') overdue += balance;
    });
    return { totalOutstanding: outstanding, overdueAmount: overdue, invoiceCount: invoices.length };
  }, [summary, invoices]);

  // ── Render invoice card ─────────────────────────
  const renderCard = ({ item: inv }: { item: Invoice }) => {
    const balance = inv.total - inv.amountPaid;

    return (
      <TxnCard
        number={inv.invoiceNumber}
        subtitle={inv.customerName}
        statusLabel={STATUS_LABEL[inv.status]}
        statusColor={txnStatusColor(inv.status)}
        metaLeft={`Issued: ${formatDate(inv.issueDate)}`}
        metaRight={`Due: ${formatDate(inv.dueDate)}`}
        primaryLabel="Total"
        primaryValue={formatCurrency(inv.total, 'Rs ')}
        secondaryLabel="Balance"
        secondaryValue={formatCurrency(balance, 'Rs ')}
        secondaryColor={balance > 0 ? colors.danger : colors.success}
        onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: inv.id })}
      />
    );
  };

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  // Genuine first-run: no invoices at all (not a filter/search result).
  // We hide the summary cards, filter tabs and FAB to keep the zero-state
  // clean and professional instead of a cluttered wall of zeros.
  // Not while a search or a tab is narrowing the list: then the search bar and
  // tabs must stay, or an empty result could not be cleared.
  const isFirstRun =
    !initialLoading && !error && invoices.length === 0 && !searchQuery.trim() && statusFilter === 'all';

  const openMyRequests = useCallback(() => {
    // This screen sits in the Transactions tab; My Requests is in the staff
    // More tab, so the hop goes through the parent tab navigator. initial:false
    // puts StaffMoreHub underneath, so back returns there rather than finding
    // an empty stack and falling through to the Dashboard.
    const tabs = (navigation.getParent() ?? navigation) as unknown as {
      navigate: (name: string, params?: Record<string, unknown>) => void;
    };
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
                Sent to the owner · not an invoice yet
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [showsPending, pendingRequests, openMyRequests]);

  return (
    <ReportContainer>
      <ReportHeader
        title="Invoices"
        onBack={() => navigation.goBack()}
        right={
          <>
            <HeaderIconButton icon="search" onPress={() => setShowSearch(!showSearch)} />
            <HeaderAction label="New" onPress={() => navigation.navigate('InvoiceForm')} />
          </>
        }
      />

      {/* Summary bar — hidden on first-run and during initial load */}
      {!initialLoading && !isFirstRun && (
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryMoney}>
            {formatCurrency(totalOutstanding, 'Rs ')}
          </Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryMoney, { color: colors.danger }]}>
            {formatCurrency(overdueAmount, 'Rs ')}
          </Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{invoiceCount}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>
      )}

      {/* Outside the isFirstRun gates above on purpose: a staff member's very
          first invoice is a request with no invoice behind it, so the list is
          empty exactly when this strip matters most. */}
      {PendingSection}

      {/* Search — hidden during initial load to keep loader centered */}
      {showSearch && !initialLoading && !isFirstRun && (
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={v => dispatch(setSearchQuery(v))}
            placeholder="Search by invoice # or customer…"
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />
        </View>
      )}

      {/* Filter tabs — hidden during initial load and first-run */}
      {!initialLoading && !isFirstRun && (
        <FilterTabs
          tabs={TABS}
          active={statusFilter}
          onChange={onTab}
        />
      )}

      {/* List */}
      {initialLoading ? (
        <LoadingBlock />
      ) : error && invoices.length === 0 ? (
        <ErrorBlock message={error} onRetry={() => dispatch(fetchInvoices())} />
      ) : isFirstRun ? (
        <EmptyBlock
          icon="file-text"
          title="No invoices yet"
          hint="Create your first invoice to start billing customers and tracking payments."
          actionLabel="Create Invoice"
          onAction={() => navigation.navigate('InvoiceForm')}
        />
      ) : filtered.length === 0 ? (
        <EmptyBlock
          icon="search"
          title="No invoices found"
          hint={searchQuery ? `No results for "${searchQuery}"` : 'Try a different filter.'}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderCard}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
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
  // ── Summary ────────────────────────────────────
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
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

  // ── Search ─────────────────────────────────────
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

  // ── List ───────────────────────────────────────
  list: { flex: 1 },
  footer: { paddingVertical: spacing.md, alignItems: 'center' },
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxs, paddingBottom: spacing.xxl * 3 },
  // Requests, not invoices — muted so they do not compete with the real rows
  // below. Mirrors the PO list's strip so the two read as one idea.
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

export default InvoiceListScreen;
