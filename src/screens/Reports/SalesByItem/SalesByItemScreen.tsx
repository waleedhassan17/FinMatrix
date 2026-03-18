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
  fetchSalesByItem,
  setSalesByItemRange,
  setSalesByItemSort,
  selectSalesByItemState,
  type SalesByItemSortField,
} from './salesByItemSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportDateRange } from '../../../models/reportModel';

const SORT_COLS: { label: string; field: SalesByItemSortField; flex: number }[] = [
  { label: 'Item', field: 'itemName', flex: 3 },
  { label: 'Qty', field: 'qtySold', flex: 1 },
  { label: 'Revenue', field: 'revenue', flex: 2 },
  { label: 'Margin', field: 'profitMargin', flex: 1 },
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

const marginColor = (margin: number): string => {
  if (margin >= 30) return '#10B981';
  if (margin >= 10) return '#F59E0B';
  return '#EF4444';
};

const SalesByItemScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { report, range, sortField, sortDir, isLoading, error } =
    useAppSelector(selectSalesByItemState);
  const [activePeriod, setActivePeriod] = useState(0);

  useEffect(() => {
    dispatch(fetchSalesByItem(range));
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
    dispatch(setSalesByItemRange(PERIOD_OPTIONS[idx].range));
  };

  const sortIcon = (field: SalesByItemSortField) =>
    sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sales by Item</Text>
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
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginVertical: spacing.md }}
        />
      )}
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {report && (
        <View style={styles.flex}>
          {/* Summary banners */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderTopColor: colors.primary }]}>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {formatCurrency(report.totalRevenue, 'Rs ')}
              </Text>
            </View>
            <View style={[styles.summaryCard, { borderTopColor: '#10B981' }]}>
              <Text style={styles.summaryLabel}>Total Profit</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {formatCurrency(report.totalProfit, 'Rs ')}
              </Text>
            </View>
            <View style={[styles.summaryCard, { borderTopColor: '#6366F1' }]}>
              <Text style={styles.summaryLabel}>Avg Margin</Text>
              <Text style={[styles.summaryValue, { color: '#6366F1' }]}>
                {report.totalRevenue > 0
                  ? `${((report.totalProfit / report.totalRevenue) * 100).toFixed(1)}%`
                  : '—'}
              </Text>
            </View>
          </View>

          {/* Sortable table */}
          <View style={styles.tableWrap}>
            <View style={styles.tableHeader}>
              {SORT_COLS.map(col => (
                <TouchableOpacity
                  key={col.field}
                  style={{ flex: col.flex }}
                  onPress={() => dispatch(setSalesByItemSort(col.field))}
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
                <Text style={styles.emptyText}>No items sold in this period</Text>
              ) : (
                sortedRows.map((row, idx) => (
                  <View
                    key={row.itemId}
                    style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}
                  >
                    <Text style={[styles.tableCell, { flex: 3, textAlign: 'left' }]} numberOfLines={1}>
                      {row.itemName}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1 }]}>{row.qtySold}</Text>
                    <Text style={[styles.tableCell, { flex: 2, color: colors.primary }]}>
                      {formatCurrency(row.revenue, 'Rs ')}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 1, fontWeight: '600', color: marginColor(row.profitMargin) },
                      ]}
                    >
                      {row.profitMargin.toFixed(1)}%
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>

          {/* Margin legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>≥30% Good</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>10–29% OK</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>&lt;10% Low</Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
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
  periodBtnText: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  periodBtnTextActive: { color: '#fff', fontWeight: '600' },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    fontFamily: THEME.typography.fontFamily,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
    fontFamily: THEME.typography.fontFamily,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  tableWrap: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
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
  tableRow: { flexDirection: 'row', paddingVertical: 8 },
  tableRowAlt: { backgroundColor: '#F8FAFC', borderRadius: 4 },
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
});

export default SalesByItemScreen;
