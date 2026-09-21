// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory item report
// ═══════════════════════════════════════════════════════
// Reached by tapping a row in Inventory Valuation. Answers the question the
// valuation table raises and cannot answer: this item is worth Rs X today —
// how did it get there?
//
// Quantity and value are drawn as two charts rather than one with two axes.
// They do not share a scale, so overlaying them would put the crossing point
// wherever the scales happened to fall, which is an artefact and not a fact
// about the stock.

import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  Card,
  SectionCard,
  KpiGrid,
  LoadingBlock,
  ErrorBlock,
  EmptyBlock,
  ACCENT,
  reportContentStyle,
} from '../../../components/reports/ReportUI';
import MonthlyBars from '../shared/MonthlyBars';
import {
  fetchInventoryItemHistory,
  fetchItemPerformance,
  itemPerformanceRange,
  ITEM_HISTORY_MONTHS,
  resetInventoryItemReport,
  selectInventoryItemReportState,
} from './inventoryItemReportSlice';

const { colors, spacing, typography, radius } = THEME;

type Nav = NativeStackNavigationProp<ReportsStackParamList>;
type ItemRoute = RouteProp<ReportsStackParamList, 'InventoryItemReport'>;

const rs = (n: number) => formatCurrency(n, 'Rs ');

const compactQty = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
};

const InventoryItemReportScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<ItemRoute>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectInventoryItemReportState);

  const load = useCallback(() => {
    dispatch(fetchInventoryItemHistory({ itemId: params.itemId, months: ITEM_HISTORY_MONTHS }));
    // Separate request, separate failure: margin is an addition to the stock
    // history, not a replacement for it.
    dispatch(fetchItemPerformance({ itemId: params.itemId, range: itemPerformanceRange() }));
  }, [dispatch, params.itemId]);

  useEffect(() => {
    load();
    // The slice is shared across items, so leaving without clearing would show
    // the previous item's chart for a frame on the next one.
    return () => {
      dispatch(resetInventoryItemReport());
    };
  }, [load, dispatch]);

  const history = state.history;
  const points = history?.points ?? [];

  const qtyPoints = points.map(p => ({
    period: p.period,
    label: p.label,
    value: p.closingQty,
  }));
  const valuePoints = points.map(p => ({
    period: p.period,
    label: p.label,
    value: p.valueKnown ? p.closingValue : null,
  }));
  const valueKnown = points.some(p => p.valueKnown);

  const perf = state.performance;
  const perfPoints = perf?.points ?? [];
  const revenuePoints = perfPoints.map(p => ({
    period: p.period, label: p.label, value: p.revenue,
  }));
  const profitPoints = perfPoints.map(p => ({
    period: p.period, label: p.label, value: p.grossProfit,
  }));
  const traded = perfPoints.some(p => p.revenue !== 0 || p.cogs !== 0);
  // Above a third, the split between items on shared invoices is carrying
  // enough of the answer that the reader should be told before acting on it.
  const mostlyEstimated = (perf?.estimatedCogsShare ?? 0) > 0.33;

  const received = points.reduce((t, p) => t + p.qtyIn, 0);
  const issued = points.reduce((t, p) => t + p.qtyOut, 0);
  const latestQty = [...points].reverse().find(p => p.closingQty !== null)?.closingQty ?? 0;

  return (
    <ReportContainer>
      <ReportHeader
        title={params.itemName || history?.itemName || 'Item'}
        subtitle={history?.sku ? `SKU ${history.sku}` : 'Item history'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
        {state.isLoading && <LoadingBlock label="Loading item history…" />}
        {!!state.error && <ErrorBlock message={state.error} onRetry={load} />}

        {history && !state.isLoading && (
          <>
            <KpiGrid
              items={[
                { label: 'On hand', value: compactQty(latestQty), accent: ACCENT.brand, icon: 'box' },
                { label: `Received (${ITEM_HISTORY_MONTHS}m)`, value: compactQty(received), accent: ACCENT.green, icon: 'arrow-down-circle' },
                { label: `Issued (${ITEM_HISTORY_MONTHS}m)`, value: compactQty(issued), accent: ACCENT.amber, icon: 'arrow-up-circle' },
              ]}
            />

            {perf && traded && (
              <>
                <KpiGrid
                  items={[
                    { label: 'Revenue', value: rs(perf.totals.revenue), accent: ACCENT.brand, icon: 'trending-up' },
                    { label: 'Cost of sales', value: rs(perf.totals.cogs), accent: ACCENT.amber, icon: 'arrow-down-circle' },
                    { label: 'Gross profit', value: rs(perf.totals.grossProfit), accent: perf.totals.grossProfit >= 0 ? ACCENT.green : ACCENT.red, icon: 'dollar-sign' },
                    {
                      label: 'Margin',
                      value: perf.totals.marginPct === null ? '—' : `${perf.totals.marginPct.toFixed(1)}%`,
                      accent: ACCENT.blue,
                      icon: 'percent',
                    },
                  ]}
                />

                {mostlyEstimated && (
                  // A margin built mostly on apportioned cost is a number
                  // nobody should act on without knowing that. Each invoice's
                  // total is exact; the split between items on one is not.
                  <View style={styles.notice}>
                    <Feather name="info" size={14} color={colors.textTertiary} />
                    <Text style={styles.noticeText}>
                      {Math.round(perf.estimatedCogsShare * 100)}% of this cost was
                      split across items that shared an invoice. Each invoice&apos;s
                      total cost is exact; how it divides between items on it is
                      an estimate.
                    </Text>
                  </View>
                )}

                {/* Two charts, not one with two axes: revenue and gross profit
                    share a scale, margin % does not, and overlaying them would
                    put the crossing point wherever the axes happened to fall. */}
                <SectionCard title="Revenue" subtitle="By month" icon="trending-up">
                  <MonthlyBars
                    points={revenuePoints}
                    caption="Latest month"
                    format={v => rs(v)}
                    compact={compactQty}
                    emptyLabel="No sales in this period."
                  />
                </SectionCard>

                <SectionCard title="Gross profit" subtitle="Revenue less cost of sales" icon="dollar-sign">
                  <MonthlyBars
                    points={profitPoints}
                    caption="Latest month"
                    format={v => rs(v)}
                    compact={compactQty}
                    color={colors.navy400}
                    emptyLabel="No sales in this period."
                  />
                </SectionCard>
              </>
            )}

            {points.length === 0 ? (
              <Card>
                <EmptyBlock
                  icon="box"
                  title="No stock movements"
                  hint="This item has not been received, sold or adjusted yet."
                />
              </Card>
            ) : (
              <>
                <SectionCard title="Stock on hand" subtitle="At each month end" icon="bar-chart-2">
                  <MonthlyBars
                    points={qtyPoints}
                    caption="Latest month end"
                    format={v => `${compactQty(v)} on hand`}
                    compact={compactQty}
                    emptyLabel="No movements in this period."
                  />
                </SectionCard>

                <SectionCard title="Stock value" subtitle="At each month end" icon="dollar-sign">
                  {valueKnown ? (
                    <MonthlyBars
                      points={valuePoints}
                      caption="Latest month end"
                      format={v => rs(v)}
                      compact={compactQty}
                      color={colors.navy400}
                    />
                  ) : (
                    // Stating the gap rather than drawing a plausible zero. The
                    // server says why in `coverage.message`; repeating its own
                    // words keeps one explanation rather than two that drift.
                    <View style={styles.notice}>
                      <Feather name="info" size={14} color={colors.textTertiary} />
                      <Text style={styles.noticeText}>
                        {history.coverage.message ||
                          'Month-end value is not available for this item yet.'}
                      </Text>
                    </View>
                  )}
                </SectionCard>
              </>
            )}
          </>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  noticeText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
});

export default InventoryItemReportScreen;
