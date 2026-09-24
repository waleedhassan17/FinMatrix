import dayjs from 'dayjs';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchInventoryPerformance,
  fetchInventoryValuationReport,
  fetchInventoryValuationTrend,
  refreshInventoryPerfRange,
  selectInventoryValuationState,
  setInventoryPerfRange,
  setInventoryPerfSort,
  TREND_MONTHS,
} from './inventoryValuationSlice';
import type { InventoryPerformanceSort } from '../../../models/inventoryValuationModel';
import MonthlyBars from '../shared/MonthlyBars';
import RankedBars from '../shared/RankedBars';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  SectionCard,
  KpiGrid,
  DateField,
  Segmented,
  amountColWidth,
  SummaryLine,
  Divider,
  TCell,
  tableStyles,
  LoadingBlock,
  RefreshFade,
  ErrorBlock,
  EmptyBlock,
  Card,
  ACCENT,
  reportContentStyle,
  ReportTitleBlock,
  useStatementCompany,
  asOfLabel,
  rangeLabel
} from '../../../components/reports/ReportUI';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const rs = (n: number) => formatCurrency(n, 'Rs ');

/**
 * What the table can be ordered by.
 *
 * The backend used to sort by carrying value alone. Once an item's earnings
 * sit beside its stock that ordering is actively misleading — the stock with
 * the most capital tied up is not the stock that earns — so the ordering is
 * the control that makes the new columns usable.
 */
const SORTS: { key: InventoryPerformanceSort; label: string }[] = [
  { key: 'grossProfit', label: 'Gross profit' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'marginPct', label: 'Margin' },
  { key: 'stockValue', label: 'Stock value' },
];

/** Short form for a bar label, where the full figure will not fit. */
const compactRs = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
};

const InventoryValuationScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectInventoryValuationState);
  const company = useStatementCompany();

  // The margin window follows the calendar unless the user chose one, the same
  // as every other dated report.
  useFocusEffect(
    React.useCallback(() => {
      dispatch(refreshInventoryPerfRange());
    }, [dispatch]),
  );

  useEffect(() => {
    dispatch(fetchInventoryValuationReport());
    // Separate request, separate failure. The trend is context around the
    // snapshot; losing it must not blank the figures the user came for.
    dispatch(fetchInventoryValuationTrend(TREND_MONTHS));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchInventoryPerformance({ range: state.range, sort: state.sort }));
  }, [dispatch, state.range.startDate, state.range.endDate, state.sort]);

  const report = state.report;
  const valuationRows = report?.rows ?? [];
  const categories = report?.byCategory ?? [];
  const trendPoints = (state.trend?.points ?? []).map(p => ({
    period: p.period,
    label: p.label,
    value: p.value,
  }));

  const perf = state.performance;
  const perfRows = perf?.rows ?? [];
  // The performance rows carry the same stock figures the valuation snapshot
  // does, already ordered as asked, so they replace it outright when present.
  // The snapshot stays as the fallback, so this report still works against a
  // server without the endpoint — it simply shows no margin columns.
  const usingPerf = perfRows.length > 0;
  const traded = perfRows.some(r => r.revenue !== 0 || r.cogs !== 0);
  const sortIndex = SORTS.findIndex(o => o.key === state.sort);

  const rows = usingPerf
    ? perfRows.map(r => ({
        itemId: r.itemId,
        itemName: r.itemName,
        sku: r.sku,
        qty: r.qtyOnHand,
        cost: r.unitCost,
        value: r.stockValue,
        revenue: r.revenue,
        grossProfit: r.grossProfit,
        marginPct: r.marginPct,
        costBasis: r.costBasis,
      }))
    : valuationRows.map(r => ({
        itemId: r.itemId,
        itemName: r.itemName,
        sku: r.sku,
        qty: r.qty,
        cost: r.cost,
        value: r.value,
        revenue: 0,
        grossProfit: 0,
        marginPct: null as number | null,
        costBasis: 'posted',
      }));

  const rankPoints = perfRows
    .filter(r => r.revenue !== 0 || r.cogs !== 0)
    .map(r => ({
      key: r.itemId,
      label: r.itemName,
      value:
        state.sort === 'revenue'
          ? r.revenue
          : state.sort === 'stockValue'
            ? r.stockValue
            : r.grossProfit,
      hint:
        r.marginPct === null
          ? `${r.unitsSold} sold`
          : `${r.unitsSold} sold · ${r.marginPct.toFixed(1)}% margin`,
    }));

  // Sized to the widest figure each column must hold. The hardcoded 130 was
  // tuned for a carrying value; a year's revenue is wider and would clip.
  const wValue = amountColWidth([...rows.map(r => rs(r.value)), rs(perf?.totals.stockValue ?? 0)]);
  const wRevenue = amountColWidth([...rows.map(r => rs(r.revenue)), rs(perf?.totals.revenue ?? 0)]);
  const wProfit = amountColWidth([...rows.map(r => rs(r.grossProfit)), rs(perf?.totals.grossProfit ?? 0)]);
  return (
    <ReportContainer>
      <ReportHeader title="Inventory Valuation" subtitle="Stock on hand" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
        {/* Stock is as of now; sales and margin cover this window. The two
            are labelled separately in the table because they are different
            claims about different moments. */}
        <Card>
          <View style={styles.filterRow}>
            <DateField
              label="Sales from"
              value={state.range.startDate}
              onChangeText={t => dispatch(setInventoryPerfRange({ ...state.range, startDate: t }))}
            />
            <DateField
              label="To"
              value={state.range.endDate}
              onChangeText={t => dispatch(setInventoryPerfRange({ ...state.range, endDate: t }))}
            />
          </View>
          <Text style={styles.sortLabel}>Rank by</Text>
          <Segmented
            options={SORTS.map(o => o.label)}
            activeIndex={sortIndex < 0 ? 0 : sortIndex}
            onChange={i => dispatch(setInventoryPerfSort(SORTS[i].key))}
          />
        </Card>

        {/* The spinner is for the first load only. A new period or ranking
            keeps the figures on screen, dimmed, until the answer lands. */}
        {state.isLoading && !report && <LoadingBlock label="Valuing inventory…" />}
        {!!state.error && (
          <ErrorBlock message={state.error} onRetry={() => dispatch(fetchInventoryValuationReport())} />
        )}

        {report && (
          <RefreshFade busy={state.isLoading || state.perfStatus === 'loading'}>
            <KpiGrid
              items={[
                { label: 'Stock Value', value: rs(report.totalValue ?? 0), accent: ACCENT.brand, icon: 'dollar-sign' },
                { label: 'Items', value: String(rows.length), accent: ACCENT.blue, icon: 'box' },
                ...(traded
                  ? [
                      {
                        label: 'Revenue',
                        value: rs(perf?.totals.revenue ?? 0),
                        accent: ACCENT.green,
                        icon: 'trending-up' as const,
                      },
                      {
                        label: 'Gross Profit',
                        value: rs(perf?.totals.grossProfit ?? 0),
                        accent:
                          (perf?.totals.grossProfit ?? 0) >= 0 ? ACCENT.green : ACCENT.red,
                        icon: 'percent' as const,
                      },
                    ]
                  : [
                      {
                        label: 'Categories',
                        value: String(categories.length),
                        accent: ACCENT.violet,
                        icon: 'grid' as const,
                      },
                    ]),
              ]}
            />

            {/* The endpoint values stock as it stands now — there is no date filter. */}
            <ReportTitleBlock
              company={company}
              report="Inventory Valuation Summary"
              periodLabel={asOfLabel(dayjs().format('YYYY-MM-DD'))}
            />

            {traded && (
              <SectionCard
                title={`Top items by ${SORTS.find(o => o.key === state.sort)?.label.toLowerCase()}`}
                subtitle={rangeLabel(state.range.startDate, state.range.endDate)}
                icon="award"
              >
                <RankedBars
                  points={rankPoints}
                  format={v => rs(v)}
                  emptyLabel="Nothing sold in this period."
                />
              </SectionCard>
            )}

            {trendPoints.length > 0 && (
              <SectionCard
                title="Stock value over time"
                subtitle="From the inventory control account — ties to the balance sheet"
                icon="trending-up"
              >
                <MonthlyBars
                  points={trendPoints}
                  caption="Latest month end"
                  format={v => rs(v)}
                  compact={compactRs}
                />
              </SectionCard>
            )}

            {categories.length > 0 && (
              <SectionCard title="Value by Category" icon="layers">
                {categories.map(cat => (
                  <SummaryLine key={cat.category} label={cat.category} value={rs(cat.totalValue)} />
                ))}
                <Divider />
                <SummaryLine label="Total Inventory Value" value={rs(report.totalValue ?? 0)} strong highlight valueColor={THEME.colors.primaryHover} />
              </SectionCard>
            )}

            {rows.length === 0 ? (
              <Card>
                <EmptyBlock icon="box" title="No inventory items" hint="Add items to see valuation." />
              </Card>
            ) : (
              <SectionCard title="Items" subtitle="Tap an item for its history" icon="package">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={tableStyles.head}>
                      <TCell width={200} head>Item</TCell>
                      <TCell width={120} head>SKU</TCell>
                      <TCell width={70} head align="right">Qty</TCell>
                      <TCell width={110} head align="right">Avg Cost</TCell>
                      <TCell width={130} head align="right">Asset Value</TCell>
                    </View>
                    {rows.map((row, i) => (
                      <TouchableOpacity
                        key={row.itemId}
                        style={[tableStyles.row, i % 2 === 1 && tableStyles.rowAlt]}
                        activeOpacity={0.6}
                        onPress={() =>
                          navigation.navigate('InventoryItemReport', {
                            itemId: row.itemId,
                            itemName: row.itemName,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`${row.itemName}, ${rs(row.value)}. Open item report`}
                      >
                        <TCell width={200}>{row.itemName}</TCell>
                        <TCell width={120} color={THEME.colors.textTertiary}>{row.sku}</TCell>
                        <TCell width={70} align="right">{String(row.qty)}</TCell>
                        <TCell width={110} align="right">{rs(row.cost)}</TCell>
                        <TCell width={130} align="right" strong>{rs(row.value)}</TCell>
                      </TouchableOpacity>
                    ))}
                    {/* The server's own totalValue — the rows above are not re-summed. */}
                    <View style={tableStyles.totalRow}>
                      <TCell width={200} strong>TOTAL</TCell>
                      <TCell width={120}>{''}</TCell>
                      <TCell width={70} align="right">{''}</TCell>
                      <TCell width={110} align="right">{''}</TCell>
                      <TCell width={130} align="right" strong>{rs(report.totalValue ?? 0)}</TCell>
                    </View>
                  </View>
                </ScrollView>
              </SectionCard>
            )}

            {perf && traded && perf.reconciliation.items.length > 0 && (
              // Why this report does not equal the Profit & Loss, named rather
              // than left to be discovered as a discrepancy. It foots exactly:
              // goods sold plus every line below equals the P&L figure. An
              // accountant who cannot see this reconciliation stops trusting
              // the whole screen.
              <SectionCard
                title="How this ties to Profit & Loss"
                subtitle={rangeLabel(state.range.startDate, state.range.endDate)}
                icon="git-merge"
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={tableStyles.head}>
                      <TCell width={210} head>Source</TCell>
                      <TCell width={wRevenue} head align="right">Revenue</TCell>
                      <TCell width={wProfit} head align="right">Cost of sales</TCell>
                    </View>
                    <View style={tableStyles.row}>
                      <TCell width={210}>Goods sold (this report)</TCell>
                      <TCell width={wRevenue} align="right">{rs(perf.reconciliation.itemRevenue)}</TCell>
                      <TCell width={wProfit} align="right">{rs(perf.reconciliation.itemCogs)}</TCell>
                    </View>
                    {perf.reconciliation.items.map((it, i) => (
                      <View key={it.label} style={[tableStyles.row, i % 2 === 0 && tableStyles.rowAlt]}>
                        <TCell width={210}>{it.label}</TCell>
                        <TCell width={wRevenue} align="right">{it.revenue === 0 ? '—' : rs(it.revenue)}</TCell>
                        <TCell width={wProfit} align="right">{it.cogs === 0 ? '—' : rs(it.cogs)}</TCell>
                      </View>
                    ))}
                    <View style={tableStyles.totalRow}>
                      <TCell width={210} strong>Profit &amp; Loss</TCell>
                      <TCell width={wRevenue} align="right" strong>{rs(perf.reconciliation.glRevenue)}</TCell>
                      <TCell width={wProfit} align="right" strong>{rs(perf.reconciliation.glCogs)}</TCell>
                    </View>
                  </View>
                </ScrollView>
                <Text style={styles.reconcileNote}>{perf.reconciliation.note}</Text>
                {perf.estimatedCogsShare > 0.33 && (
                  <Text style={styles.reconcileReason}>
                    {Math.round(perf.estimatedCogsShare * 100)}% of the cost above was split
                    across items that shared an invoice. Each invoice&apos;s total is exact;
                    how it divides between items on it is an estimate.
                  </Text>
                )}
              </SectionCard>
            )}
          </RefreshFade>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: THEME.spacing.sm },
  sortLabel: {
    ...THEME.typography.labelSm,
    color: THEME.colors.textTertiary,
    marginTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.xs,
  },
  // A figure that rests on an apportioned cost is marked rather than silently
  // presented as exact — the invoice total is right, the split between items
  // on it is an estimate.
  estimated: { ...THEME.typography.overline, color: THEME.colors.textTertiary },
  reconcileNote: {
    ...THEME.typography.caption,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },
  reconcileReason: {
    ...THEME.typography.overline,
    color: THEME.colors.textTertiary,
    marginBottom: THEME.spacing.xs,
  },
});

export default InventoryValuationScreen;
