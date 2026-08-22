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
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
import {
  ReportContainer,
  ReportHeader,
  HeaderAction,
  HeaderIconButton,
  EmptyBlock,
  LoadingBlock,
  ErrorBlock,
} from '../../../components/reports/ReportUI';
import { TxnTabs, TxnCard, type TxnTab } from '../../../components/transactions/TxnListUI';
import { txnStatusColor } from '../../../components/transactions/txnStatus';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { Invoice } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
const { colors, spacing, radius, shadows, typography } = THEME;

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
  const error = useAppSelector(selectInvoiceError);
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const initialLoading = isLoading && invoices.length === 0;

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
    const c: Record<string, number> = {
      all: invoices.length,
      draft: 0, sent: 0, partial: 0, paid: 0, overdue: 0, void: 0, cancelled: 0,
    };
    invoices.forEach(i => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [invoices]);

  const TABS: TxnTab<InvoiceStatusFilter>[] = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'Draft', value: 'draft', count: counts.draft },
    { label: 'Sent', value: 'sent', count: counts.sent },
    { label: 'Overdue', value: 'overdue', count: counts.overdue },
    { label: 'Paid', value: 'paid', count: counts.paid },
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
  const isFirstRun = !initialLoading && !error && invoices.length === 0;

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
          <Text style={styles.summaryValue}>{counts.all}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>
      )}

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
        <TxnTabs
          tabs={TABS}
          active={statusFilter}
          onChange={v => dispatch(setStatusFilter(v))}
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
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxs, paddingBottom: spacing.xxl * 3 },
});

export default InvoiceListScreen;
