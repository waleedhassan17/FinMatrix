import React, { useEffect, useState } from 'react';
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
  fetchSalesTaxReport,
  setSalesTaxRange,
  selectSalesTaxReportState,
} from './salesTaxReportSlice';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportDateRange, SalesTaxRow } from '../../../models/reportModel';

const PERIOD_OPTIONS: { label: string; range: ReportDateRange }[] = [
  {
    label: 'This Year',
    range: {
      startDate: `${new Date().getFullYear()}-01-01`,
      endDate: `${new Date().getFullYear()}-12-31`,
    },
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

type SummaryCardProps = { label: string; value: string; color: string };

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, color }) => (
  <View style={[styles.summaryCard, { borderTopColor: color }]}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
  </View>
);

type TaxRowProps = { row: SalesTaxRow; alt: boolean };

const TaxTableRow: React.FC<TaxRowProps> = ({ row, alt }) => {
  const liabilityColor = row.netLiability > 0 ? '#EF4444' : '#10B981';
  return (
    <View style={[styles.taxRow, alt && styles.taxRowAlt]}>
      <Text style={[styles.taxCell, { flex: 2, textAlign: 'left' }]} numberOfLines={1}>
        {row.taxName}
      </Text>
      <Text style={[styles.taxCell, { color: '#2563EB' }]}>
        {formatCurrency(row.collected, 'Rs ')}
      </Text>
      <Text style={[styles.taxCell, { color: '#F59E0B' }]}>
        {formatCurrency(row.paid, 'Rs ')}
      </Text>
      <Text style={[styles.taxCell, { color: liabilityColor, fontWeight: '700' }]}>
        {formatCurrency(row.netLiability, 'Rs ')}
      </Text>
    </View>
  );
};

const SalesTaxReportScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { report, range, isLoading, error } = useAppSelector(selectSalesTaxReportState);
  const [activePeriod, setActivePeriod] = useState(0);

  useEffect(() => {
    dispatch(fetchSalesTaxReport(range));
  }, [dispatch, range]);

  const handlePeriodChange = (idx: number) => {
    setActivePeriod(idx);
    dispatch(setSalesTaxRange(PERIOD_OPTIONS[idx].range));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Reports</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Sales Tax Report</Text>
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ marginVertical: spacing.md }}
          />
        )}
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {report && (
          <>
            {/* Period info */}
            <Text style={styles.periodInfo}>
              {report.range.startDate} — {report.range.endDate}
            </Text>

            {/* Summary row */}
            <View style={styles.summaryRow}>
              <SummaryCard
                label="Tax Collected"
                value={formatCurrency(report.totalCollected, 'Rs ')}
                color="#2563EB"
              />
              <SummaryCard
                label="Tax Paid"
                value={formatCurrency(report.totalPaid, 'Rs ')}
                color="#F59E0B"
              />
              <SummaryCard
                label="Net Liability"
                value={formatCurrency(report.totalNetLiability, 'Rs ')}
                color={report.totalNetLiability >= 0 ? '#EF4444' : '#10B981'}
              />
            </View>

            {/* Tax table */}
            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Tax Breakdown by Rate</Text>

              {/* Column headers */}
              <View style={styles.tableHeader}>
                <Text style={[styles.colHeader, { flex: 2, textAlign: 'left' }]}>Tax Type</Text>
                <Text style={styles.colHeader}>Collected</Text>
                <Text style={styles.colHeader}>Paid</Text>
                <Text style={styles.colHeader}>Net Liability</Text>
              </View>

              {report.rows.length === 0 ? (
                <Text style={styles.emptyText}>No taxable transactions in this period</Text>
              ) : (
                report.rows.map((row, idx) => (
                  <TaxTableRow key={row.taxRate} row={row} alt={idx % 2 === 1} />
                ))
              )}

              {/* Totals row */}
              {report.rows.length > 0 && (
                <View style={styles.totalsRow}>
                  <Text style={[styles.totalsCell, { flex: 2, textAlign: 'left' }]}>TOTAL</Text>
                  <Text style={[styles.totalsCell, { color: '#2563EB' }]}>
                    {formatCurrency(report.totalCollected, 'Rs ')}
                  </Text>
                  <Text style={[styles.totalsCell, { color: '#F59E0B' }]}>
                    {formatCurrency(report.totalPaid, 'Rs ')}
                  </Text>
                  <Text
                    style={[
                      styles.totalsCell,
                      { color: report.totalNetLiability >= 0 ? '#EF4444' : '#10B981' },
                    ]}
                  >
                    {formatCurrency(report.totalNetLiability, 'Rs ')}
                  </Text>
                </View>
              )}
            </View>

            {/* Explanation card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>How to read this report</Text>
              <Text style={styles.infoText}>
                <Text style={{ fontWeight: '700', color: '#2563EB' }}>Collected</Text>
                {' — tax charged on customer invoices.\n'}
                <Text style={{ fontWeight: '700', color: '#F59E0B' }}>Paid</Text>
                {' — input tax from vendor bills.\n'}
                <Text style={{ fontWeight: '700', color: '#EF4444' }}>Net Liability</Text>
                {' — amount payable to tax authority (Collected − Paid).'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  periodInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
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
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 3,
    fontFamily: THEME.typography.fontFamily,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: THEME.typography.fontFamily,
  },
  tableCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.small,
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  colHeader: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    textAlign: 'center',
    fontFamily: THEME.typography.fontFamily,
  },
  taxRow: { flexDirection: 'row', paddingVertical: 8 },
  taxRowAlt: { backgroundColor: '#F8FAFC', borderRadius: 4 },
  taxCell: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: THEME.typography.fontFamily,
  },
  totalsRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  totalsCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontFamily: THEME.typography.fontFamily,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: spacing.md,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  infoText: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 20,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default SalesTaxReportScreen;
