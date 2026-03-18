// ═══════════════════════════════════════════════════════
// FinMatrix — Tax Liability Screen
// Date range selector → table: Tax | Collected | Paid | Net
// "Record Payment" CTA → TaxPayment screen
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { colors, spacing } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchTaxLiability,
  setRange,
  selectTaxLiabilityRows,
  selectTaxLiabilityTotals,
  selectTaxLiabilityRange,
  selectTaxLiabilityLoading,
  selectTaxLiabilityError,
} from './taxLiabilitySlice';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import type { TaxLiabilityRow } from '../../../types';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

// ── Palette ─────────────────────────────────────────────
const P = {
  brand:      '#1B5E92',
  brandLight: '#EBF3FA',
  brandBorder:'#C8DCF0',
  pageBg:     '#F6F8FB',
  cardBg:     '#FFFFFF',
  textPrimary:'#1A2636',
  textSec:    '#5A6D80',
  textTert:   '#8A9BB0',
  border:     '#E3E9F0',
  borderLight:'#EDF1F6',
  success:    '#1D7D59',
  successBg:  '#F2FBF8',
  danger:     '#C0392B',
  dangerBg:   '#FFF3F3',
  warning:    '#955B10',
  warningBg:  '#FFF8EF',
  tableHead:  '#F1F4F8',
};

const fmt = (n: number) =>
  'Rs ' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ── Component ────────────────────────────────────────────

const TaxLiabilityScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch   = useAppDispatch();

  const rows      = useAppSelector(selectTaxLiabilityRows);
  const totals    = useAppSelector(selectTaxLiabilityTotals);
  const range     = useAppSelector(selectTaxLiabilityRange);
  const isLoading = useAppSelector(selectTaxLiabilityLoading);
  const error     = useAppSelector(selectTaxLiabilityError);

  useEffect(() => {
    dispatch(fetchTaxLiability({ from: range.from, to: range.to }));
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCalculate = useCallback(() => {
    dispatch(fetchTaxLiability({ from: range.from, to: range.to }));
  }, [dispatch, range]);

  const handleRecordPayment = useCallback(() => {
    navigation.navigate('TaxPayment', undefined);
  }, [navigation]);

  const netColor = (n: number) => (n > 0 ? P.danger : n < 0 ? P.success : P.textSec);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color={P.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tax Liability</Text>
          <Text style={styles.headerSub}>Collected vs. Paid summary</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Date Range Card ── */}
        <View style={styles.rangeCard}>
          <Text style={styles.rangeCardTitle}>Date Range</Text>
          <View style={styles.rangeRow}>
            <View style={styles.rangeField}>
              <Text style={styles.rangeFieldLabel}>From</Text>
              <TextInput
                style={styles.rangeInput}
                value={range.from}
                onChangeText={v => dispatch(setRange({ from: v, to: range.to }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={P.textTert}
                autoCorrect={false}
              />
            </View>
            <Feather name="arrow-right" size={16} color={P.textTert} style={{ marginTop: 20 }} />
            <View style={styles.rangeField}>
              <Text style={styles.rangeFieldLabel}>To</Text>
              <TextInput
                style={styles.rangeInput}
                value={range.to}
                onChangeText={v => dispatch(setRange({ from: range.from, to: v }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={P.textTert}
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate} activeOpacity={0.8}>
              <Feather name="refresh-cw" size={14} color="#fff" />
              <Text style={styles.calcBtnText}>Calculate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Loading ── */}
        {isLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={P.brand} />
            <Text style={styles.loadingText}>Computing liability…</Text>
          </View>
        )}

        {/* ── Error ── */}
        {!!error && !isLoading && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color={P.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Summary Chips ── */}
        {!isLoading && rows.length > 0 && (
          <>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryChip, { backgroundColor: P.brandLight, borderColor: P.brandBorder }]}>
                <Text style={styles.summaryLabel}>Total Collected</Text>
                <Text style={[styles.summaryValue, { color: P.brand }]}>{fmt(totals.collected)}</Text>
              </View>
              <View style={[styles.summaryChip, { backgroundColor: P.successBg, borderColor: '#A8DCC8' }]}>
                <Text style={styles.summaryLabel}>Total Paid</Text>
                <Text style={[styles.summaryValue, { color: P.success }]}>{fmt(totals.paid)}</Text>
              </View>
              <View style={[
                styles.summaryChip,
                totals.net > 0
                  ? { backgroundColor: P.dangerBg, borderColor: '#FCCACA' }
                  : { backgroundColor: P.successBg, borderColor: '#A8DCC8' },
              ]}>
                <Text style={styles.summaryLabel}>Net Due</Text>
                <Text style={[styles.summaryValue, { color: netColor(totals.net) }]}>{fmt(totals.net)}</Text>
              </View>
            </View>

            {/* ── Table ── */}
            <View style={styles.tableCard}>
              {/* Header Row */}
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.thCell, { flex: 2 }]}>Tax</Text>
                <Text style={[styles.thCell, styles.thRight]}>Collected</Text>
                <Text style={[styles.thCell, styles.thRight]}>Paid</Text>
                <Text style={[styles.thCell, styles.thRight]}>Net</Text>
              </View>

              {/* Data Rows */}
              {rows.map((row: TaxLiabilityRow, idx: number) => (
                <View
                  key={row.taxRateId}
                  style={[
                    styles.tableRow,
                    idx < rows.length - 1 && styles.tableRowBordered,
                  ]}
                >
                  <View style={{ flex: 2 }}>
                    <Text style={styles.tdName}>{row.taxName}</Text>
                    <Text style={styles.tdSub}>{row.taxType} · {row.rate}%</Text>
                  </View>
                  <Text style={[styles.tdCell, { color: P.brand }]}>{fmt(row.collected)}</Text>
                  <Text style={[styles.tdCell, { color: P.success }]}>{fmt(row.paid)}</Text>
                  <Text style={[styles.tdCell, { color: netColor(row.net), fontWeight: '700' }]}>{fmt(row.net)}</Text>
                </View>
              ))}

              {/* Totals Row */}
              <View style={[styles.tableRow, styles.totalsRow]}>
                <Text style={[styles.totalLabel, { flex: 2 }]}>Totals</Text>
                <Text style={[styles.totalValue, { color: P.brand }]}>{fmt(totals.collected)}</Text>
                <Text style={[styles.totalValue, { color: P.success }]}>{fmt(totals.paid)}</Text>
                <Text style={[styles.totalValue, { color: netColor(totals.net) }]}>{fmt(totals.net)}</Text>
              </View>
            </View>

            {/* ── Net Due Status Banner ── */}
            {totals.net > 0 && (
              <View style={styles.dueBanner}>
                <Feather name="alert-triangle" size={16} color={P.warning} />
                <Text style={styles.dueText}>
                  You have an outstanding tax liability of <Text style={{ fontWeight: '700' }}>{fmt(totals.net)}</Text>.
                  Consider recording a payment.
                </Text>
              </View>
            )}
            {totals.net <= 0 && (
              <View style={[styles.dueBanner, { backgroundColor: P.successBg, borderColor: '#A8DCC8' }]}>
                <Feather name="check-circle" size={16} color={P.success} />
                <Text style={[styles.dueText, { color: P.success }]}>All tax liabilities are fully paid for this period.</Text>
              </View>
            )}
          </>
        )}

        {!isLoading && rows.length === 0 && !error && (
          <View style={styles.emptyWrap}>
            <Feather name="file-text" size={36} color={P.textTert} />
            <Text style={styles.emptyTitle}>No Data</Text>
            <Text style={styles.emptyDesc}>Set a date range and tap Calculate to generate the report</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Record Payment FAB ── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.recordBtn} onPress={handleRecordPayment} activeOpacity={0.85}>
          <Feather name="credit-card" size={18} color="#fff" />
          <Text style={styles.recordBtnText}>Record Tax Payment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.pageBg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: P.cardBg,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: P.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F1F4F8',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    ...THEME.typography.h3, fontWeight: '700',
    color: P.textPrimary,
  },
  headerSub: { ...THEME.typography.caption, color: P.textSec, marginTop: 1 },

  /* Range Card */
  rangeCard: {
    margin: spacing.md,
    backgroundColor: P.cardBg,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: P.border,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#1A2636', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 5 },
      android: { elevation: 1 },
    }),
  },
  rangeCardTitle: {
    ...THEME.typography.bodySm, fontWeight: '600', color: P.textPrimary,
    marginBottom: 10,
  },
  rangeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  rangeField: { flex: 1 },
  rangeFieldLabel: { ...THEME.typography.labelSm, color: P.textSec, marginBottom: 4 },
  rangeInput: {
    backgroundColor: '#F6F8FB',
    borderWidth: 1, borderColor: P.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    ...THEME.typography.bodySm, color: P.textPrimary,
  },
  calcBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: P.brand, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  calcBtnText: { ...THEME.typography.bodySm, fontWeight: '600', color: '#fff' },

  /* Loading / Error */
  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.md },
  loadingText: { ...THEME.typography.bodySm, color: P.textSec },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: P.dangerBg, margin: spacing.md,
    borderRadius: 10, borderWidth: 1, borderColor: '#FCCACA',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: { flex: 1, ...THEME.typography.bodySm, color: P.danger },

  /* Summary Chips */
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  summaryChip: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    padding: 10, alignItems: 'center',
  },
  summaryLabel: { ...THEME.typography.overline, color: P.textSec, marginBottom: 3 },
  summaryValue: { ...THEME.typography.bodySm, fontWeight: '700' },

  /* Table */
  tableCard: {
    marginHorizontal: spacing.md,
    backgroundColor: P.cardBg,
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: P.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#1A2636', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 5 },
      android: { elevation: 1 },
    }),
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  tableRowBordered: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: P.borderLight,
  },
  tableHeader: { backgroundColor: P.tableHead },
  thCell: {
    flex: 1, ...THEME.typography.labelSm, textTransform: 'uppercase',
    color: P.textSec, letterSpacing: 0.5,
  },
  thRight: { textAlign: 'right' },
  tdName: { ...THEME.typography.bodySm, fontWeight: '600', color: P.textPrimary },
  tdSub: { ...THEME.typography.labelSm, color: P.textTert, marginTop: 1 },
  tdCell: {
    flex: 1, ...THEME.typography.bodySm, fontWeight: '500',
    textAlign: 'right',
  },
  totalsRow: {
    backgroundColor: '#F6F8FB',
    borderTopWidth: 1, borderTopColor: P.border,
  },
  totalLabel: {
    ...THEME.typography.bodySm, fontWeight: '700', color: P.textPrimary,
  },
  totalValue: {
    flex: 1, ...THEME.typography.bodySm, fontWeight: '800',
    textAlign: 'right',
  },

  /* Due Banner */
  dueBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: P.warningBg,
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    borderRadius: 10, borderWidth: 1, borderColor: '#F0D5A8',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  dueText: { flex: 1, ...THEME.typography.bodySm, color: P.warning, lineHeight: 18 },

  /* Empty */
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { ...THEME.typography.h3, color: P.textSec },
  emptyDesc: {
    ...THEME.typography.bodySm, color: P.textTert,
    textAlign: 'center', maxWidth: 240,
  },

  /* Footer CTA */
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: P.cardBg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: P.border,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
  },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: P.brand, borderRadius: 12, height: 50,
  },
  recordBtnText: {
    ...THEME.typography.h4, fontWeight: '700', color: '#fff',
  },
});

export default TaxLiabilityScreen;
