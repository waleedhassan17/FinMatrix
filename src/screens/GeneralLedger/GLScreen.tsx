// ═══════════════════════════════════════════════════════
// FinMatrix — General Ledger Screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import {
  fetchGLEntries,
  setDateRange,
  setSelectedAccountId,
  selectFilteredEntries,
  selectDateRange,
  selectSelectedAccountId,
  selectGLIsLoading,
} from './glSlice';
import { selectAccounts, fetchAccounts } from '../ChartOfAccounts/COAList/coaListSlice';
import DateRangePicker from '../../Custom-Components/DateRangePicker';
import CustomDropdown from '../../Custom-Components/CustomDropdown';
import { formatCurrency } from '../../utils/formatters';
import type { JournalEntry, JournalEntryLine } from '../../types';

dayjs.extend(quarterOfYear);

// ─── Flat row type for table ─────────────────────────
interface LedgerRow {
  key: string;
  entryId: string;
  date: string;
  ref: string;
  description: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

// ─── Date presets ────────────────────────────────────
const buildPresets = () => {
  const now = dayjs();
  return [
    {
      label: 'This Month',
      from: now.startOf('month').toDate(),
      to: now.endOf('month').toDate(),
    },
    {
      label: 'Last Month',
      from: now.subtract(1, 'month').startOf('month').toDate(),
      to: now.subtract(1, 'month').endOf('month').toDate(),
    },
    {
      label: 'This Quarter',
      from: now.startOf('quarter').toDate(),
      to: now.endOf('quarter').toDate(),
    },
    {
      label: 'This Year',
      from: now.startOf('year').toDate(),
      to: now.endOf('year').toDate(),
    },
  ];
};

// ─── Flatten entries into ledger rows ────────────────
const flattenEntries = (
  entries: JournalEntry[],
  accountId: string,
): LedgerRow[] => {
  const rows: LedgerRow[] = [];
  for (const e of entries) {
    const lines: JournalEntryLine[] = accountId
      ? e.lines.filter(l => l.accountId === accountId)
      : e.lines;
    for (const l of lines) {
      rows.push({
        key: l.id,
        entryId: e.id,
        date: e.date,
        ref: e.entryNumber,
        description: l.description || e.description,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: l.debit,
        credit: l.credit,
      });
    }
  }
  return rows;
};

// ─── Component ───────────────────────────────────────
const GLScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const filteredEntries = useAppSelector(selectFilteredEntries);
  const dateRange = useAppSelector(selectDateRange);
  const selectedAccountId = useAppSelector(selectSelectedAccountId);
  const isLoading = useAppSelector(selectGLIsLoading);
  const accounts = useAppSelector(selectAccounts);

  const presets = useMemo(() => buildPresets(), []);
  const fromDate = useMemo(() => new Date(dateRange.fromDate), [dateRange.fromDate]);
  const toDate = useMemo(() => new Date(dateRange.toDate), [dateRange.toDate]);

  useEffect(() => {
    dispatch(fetchGLEntries());
    if (accounts.length === 0) dispatch(fetchAccounts());
  }, [dispatch, accounts.length]);

  // ── Account dropdown options ──────────────────────
  const accountOptions = useMemo(() => {
    const opts = accounts
      .filter(a => a.isActive)
      .map(a => ({ label: `${a.code} — ${a.name}`, value: a.id }));
    return [{ label: 'All Accounts', value: '' }, ...opts];
  }, [accounts]);

  // ── Flat rows + totals ────────────────────────────
  const rows = useMemo(
    () => flattenEntries(filteredEntries, selectedAccountId),
    [filteredEntries, selectedAccountId],
  );

  const totalDebit = useMemo(() => rows.reduce((s, r) => s + r.debit, 0), [rows]);
  const totalCredit = useMemo(() => rows.reduce((s, r) => s + r.credit, 0), [rows]);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  // ── Running balance ───────────────────────────────
  const rowsWithBalance = useMemo(() => {
    let balance = 0;
    return rows.map(r => {
      balance += r.debit - r.credit;
      return { ...r, balance };
    });
  }, [rows]);

  // ── Handlers ──────────────────────────────────────
  const handleFromChange = useCallback(
    (d: Date) => dispatch(setDateRange({ fromDate: d.toISOString(), toDate: dateRange.toDate })),
    [dispatch, dateRange.toDate],
  );
  const handleToChange = useCallback(
    (d: Date) => dispatch(setDateRange({ fromDate: dateRange.fromDate, toDate: d.toISOString() })),
    [dispatch, dateRange.fromDate],
  );
  const handleAccountChange = useCallback(
    (v: string) => dispatch(setSelectedAccountId(v)),
    [dispatch],
  );
  const handleRefresh = useCallback(() => dispatch(fetchGLEntries()), [dispatch]);
  const handleExport = useCallback(() => {
    // placeholder
  }, []);
  const handleRowPress = useCallback((_entryId: string) => {
    // placeholder — navigate to JE detail
  }, []);

  // ── Row renderer ──────────────────────────────────
  const renderRow = useCallback(
    ({ item, index }: { item: typeof rowsWithBalance[0]; index: number }) => {
      const bg = index % 2 === 0 ? colors.white : colors.background;
      return (
        <TouchableOpacity
          style={[styles.row, { backgroundColor: bg }]}
          activeOpacity={0.6}
          onPress={() => handleRowPress(item.entryId)}>
          <Text style={[styles.cell, styles.cellDate]}>
            {dayjs(item.date).format('MM/DD')}
          </Text>
          <Text style={[styles.cell, styles.cellRef]} numberOfLines={1}>
            {item.ref}
          </Text>
          <Text style={[styles.cell, styles.cellDesc]} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={[styles.cell, styles.cellAcct]} numberOfLines={1}>
            {item.accountCode}
          </Text>
          <Text
            style={[
              styles.cell,
              styles.cellAmount,
              item.debit > 0 && styles.debitText,
            ]}>
            {item.debit > 0 ? formatCurrency(item.debit) : ''}
          </Text>
          <Text
            style={[
              styles.cell,
              styles.cellAmount,
              item.credit > 0 && styles.creditText,
            ]}>
            {item.credit > 0 ? formatCurrency(item.credit) : ''}
          </Text>
          <Text
            style={[
              styles.cell,
              styles.cellBalance,
              { color: item.balance >= 0 ? colors.textPrimary : colors.danger },
            ]}>
            {formatCurrency(item.balance)}
          </Text>
        </TouchableOpacity>
      );
    },
    [handleRowPress],
  );

  // ── Header ────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.cellDate]}>Date</Text>
      <Text style={[styles.headerCell, styles.cellRef]}>Ref #</Text>
      <Text style={[styles.headerCell, styles.cellDesc]}>Description</Text>
      <Text style={[styles.headerCell, styles.cellAcct]}>Acct</Text>
      <Text style={[styles.headerCell, styles.cellAmount]}>Debit</Text>
      <Text style={[styles.headerCell, styles.cellAmount]}>Credit</Text>
      <Text style={[styles.headerCell, styles.cellBalance]}>Balance</Text>
    </View>
  );

  // ── Footer totals ────────────────────────────────
  const renderFooter = () => (
    <View style={[styles.tableFooter, !isBalanced && styles.footerWarning]}>
      <Text style={[styles.footerLabel, styles.cellDate]} />
      <Text style={[styles.footerLabel, styles.cellRef]} />
      <Text style={[styles.footerLabel, styles.cellDesc]}>Totals</Text>
      <Text style={[styles.footerLabel, styles.cellAcct]} />
      <Text style={[styles.footerValue, styles.cellAmount, styles.debitText]}>
        {formatCurrency(totalDebit)}
      </Text>
      <Text style={[styles.footerValue, styles.cellAmount, styles.creditText]}>
        {formatCurrency(totalCredit)}
      </Text>
      <Text style={[styles.footerValue, styles.cellBalance]}>
        {!isBalanced ? '⚠ UNBALANCED' : ''}
      </Text>
    </View>
  );

  // ── Empty state ───────────────────────────────────
  const renderEmpty = () =>
    !isLoading ? (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📖</Text>
        <Text style={styles.emptyTitle}>No Entries Found</Text>
        <Text style={styles.emptySubtitle}>
          Adjust the date range or account filter
        </Text>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Top bar ─────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>General Ledger</Text>
        <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
          <Text style={styles.exportText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* ── Filters ─────────────────────────────── */}
      <View style={styles.filters}>
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onFromChange={handleFromChange}
          onToChange={handleToChange}
          presets={presets}
        />
        <CustomDropdown
          label="Account"
          options={accountOptions}
          value={selectedAccountId}
          onChange={handleAccountChange}
          placeholder="All Accounts"
          searchable
        />
      </View>

      {/* ── Loading indicator ───────────────────── */}
      {isLoading && rows.length === 0 && (
        <ActivityIndicator size="large" color={colors.secondary} style={styles.loader} />
      )}

      {/* ── Sticky header ───────────────────────── */}
      {renderHeader()}

      {/* ── Table body ──────────────────────────── */}
      <FlatList
        data={rowsWithBalance}
        renderItem={renderRow}
        keyExtractor={item => item.key}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={rows.length > 0 ? renderFooter : null}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.secondary} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={rows.length === 0 ? styles.emptyList : undefined}
      />
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════
const COL_DATE = 52;
const COL_REF = 56;
const COL_ACCT = 44;
const COL_AMT = 68;
const COL_BAL = 72;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginRight: spacing.sm, padding: spacing.xs },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  topTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  exportBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.secondary + '14',
  },
  exportText: { fontSize: 14, fontWeight: '600', color: colors.secondary },

  // ── Filters ──
  filters: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  loader: { marginTop: spacing.xl },

  // ── Table header ──
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
    fontFamily: typography.fontFamily,
  },

  // ── Table row ──
  row: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cell: {
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },

  // ── Column widths ──
  cellDate: { width: COL_DATE },
  cellRef: { width: COL_REF },
  cellDesc: { flex: 1, paddingRight: spacing.xs },
  cellAcct: { width: COL_ACCT },
  cellAmount: { width: COL_AMT, textAlign: 'right' },
  cellBalance: { width: COL_BAL, textAlign: 'right' },

  debitText: { color: colors.success },
  creditText: { color: colors.danger },

  // ── Footer ──
  tableFooter: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '0A',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  footerWarning: {
    backgroundColor: colors.danger + '14',
    borderTopColor: colors.danger,
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  footerValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },

  // ── Empty ──
  empty: { alignItems: 'center', paddingTop: spacing.xl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  emptyList: { flexGrow: 1 },
});

export default GLScreen;
