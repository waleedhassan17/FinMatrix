import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchSalesByCustomer,
  setSalesByCustomerRange,
  setSalesByCustomerSort,
  selectSalesByCustomerState,
  type SalesByCustomerSortField,
} from './salesByCustomerSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportDateRange } from '../../../models/reportModel';

const SORT_COLS: { label: string; field: SalesByCustomerSortField; flex: number }[] = [
  { label: 'Customer', field: 'customerName', flex: 3 },
  { label: '#', field: 'invoiceCount', flex: 1 },
  { label: 'Total', field: 'totalSales', flex: 2 },
  { label: 'Avg Order', field: 'avgOrder', flex: 2 },
];

const PERIOD_OPTIONS: { label: string; range: ReportDateRange }[] = [
  {
    label: 'This Year',
    range: { startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-31` },
  },
  {
    label: 'Q1 2026',
    range: { startDate: '2026-01-01', endDate: '2026-03-31' },
  },
  {
    label: 'All Time',
    range: { startDate: '2020-01-01', endDate: '2099-12-31' },
  },
];

const SalesByCustomerScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { report, range, sortField, sortDir, isLoading, error } = useAppSelector(
    selectSalesByCustomerState,
  );
  const [activePeriod, setActivePeriod] = useState(0);

  useEffect(() => {
    dispatch(fetchSalesByCustomer(range));
  }, [dispatch, range]);

  const sortedRows = useMemo(() => {
    if (!report) return [];
    return [...report.rows].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'string') {
        return sortDir === 'asc'
          ? av.localeCompare(bv as string)
          : (bv as string).localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [report, sortField, sortDir]);

  const handlePeriodChange = (idx: number) => {
    setActivePeriod(idx);
    dispatch(setSalesByCustomerRange(PERIOD_OPTIONS[idx].range));
  };

  const sortIcon = (field: SalesByCustomerSortField) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sales by Customer</Text>
      </View>

      {/* Period filter */}
      <View style={styles.periodRow}>
        {PERIOD_OPTIONS.map((opt, idx) => (
          <TouchableOpacity
            key={opt.label}
            onPress={() => handlePeriodChange(idx)}
            style={[styles.periodBtn, activePeriod === idx && styles.periodBtnActive]}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.periodBtnText, activePeriod === idx && styles.periodBtnTextActive]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
      )}
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {report && (
        <View style={styles.flex}>
          {/* Totals banner */}
          <View style={styles.totalBanner}>
            <Text style={styles.totalLabel}>Total Sales ({sortedRows.length} customers)</Text>
            <Text style={styles.totalValue}>{formatCurrency(report.totalSales, 'Rs ')}</Text>
          </View>

          {/* Sortable table */}
          <View style={styles.tableWrap}>
            {/* Header */}
            <View style={styles.tableHeader}>
              {SORT_COLS.map(col => (
                <TouchableOpacity
                  key={col.field}
                  style={{ flex: col.flex }}
                  onPress={() => dispatch(setSalesByCustomerSort(col.field))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.colHeader}>
                    {col.label}
                    {sortIcon(col.field)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {sortedRows.length === 0 ? (
                <Text style={styles.emptyText}>No invoices found in this period</Text>
              ) : (
                sortedRows.map((row, idx) => (
                  <View
                    key={row.customerId}
                    style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                  >
                    <Text style={[styles.tableCell, { flex: 3 }]} numberOfLines={1}>
                      {row.customerName}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{row.invoiceCount}</Text>
                    <Text style={[styles.tableCell, { flex: 2, color: colors.primary }]}>
                      {formatCurrency(row.totalSales, 'Rs ')}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>
                      {formatCurrency(row.avgOrder, 'Rs ')}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1, paddingHorizontal: spacing.md },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  periodBtnTextActive: { color: '#fff', fontWeight: '600' },
  errorText: {
    fontSize: 13,
    color: '#DE350B',
    textAlign: 'center',
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    fontFamily: THEME.typography.fontFamily,
  },
  totalBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.85,
    fontFamily: THEME.typography.fontFamily,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: THEME.typography.fontFamily,
  },
  tableWrap: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    ...shadows.small,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    textAlign: 'center',
    fontFamily: THEME.typography.fontFamily,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
  },
  tableCell: {
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: THEME.typography.fontFamily,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default SalesByCustomerScreen;
