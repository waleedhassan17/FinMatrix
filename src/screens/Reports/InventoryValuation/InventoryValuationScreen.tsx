// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Valuation
// ═══════════════════════════════════════════════════════
// What the stock is worth, and which of it earns — the phone's half of the
// web report. Two claims about two moments share the screen and it says so:
// STOCK is as of now (quantity at average cost, which ties to Inventory 1200
// on the balance sheet); SALES cover the dates picked at the top.
//
// Every item opens its explorer — monthly figures, charted, down to the
// documents behind each month — carrying the dates along, so it opens on the
// figures that were tapped.

import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchInventoryPerformance,
  fetchInventoryValuationReport,
  fetchInventoryValuationTrend,
  refreshInventoryPerfRange,
  selectInventoryValuationState,
  setInventoryPerfRange,
  setInventoryRank,
  TREND_MONTHS,
} from './inventoryValuationSlice';
import {
  RANK_OPTIONS,
  STOCK_FILTERS,
  categoryShares,
  filterRows,
  formatShare,
  ledgerTie,
  matchesFilter,
  rankFigure,
  rankRows,
  rowTotals,
  traded,
  unsoldStock,
  valuationRows,
  type RankKey,
  type StockFilter,
  type ValuationRow,
} from '../../../models/inventoryValuationModel';
import MetricChart from '../shared/MetricChart';
import RankedBars from '../shared/RankedBars';
import { formatCurrency } from '../../../utils/formatters';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import {
  ReportContainer,
  ReportHeader,
  SectionCard,
  FigureStrip,
  DateField,
  TCell,
  tableStyles,
  LoadingBlock,
  RefreshFade,
  ErrorBlock,
  EmptyBlock,
  Card,
  reportContentStyle,
  ReportTitleBlock,
  useStatementCompany,
  asOfLabel,
  rangeLabel,
} from '../../../components/reports/ReportUI';

const { colors, radius, spacing, typography } = THEME;

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;

const rs = (n: number) => formatCurrency(n, 'Rs ');
const qty = (n: number) =>
  `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
/** Rows drawn before "Show more" — a warehouse can carry hundreds of items. */
const PAGE = 40;

const InventoryValuationScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectInventoryValuationState);
  const company = useStatementCompany();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [category, setCategory] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [trendMonth, setTrendMonth] = useState<string | null>(null);

  // The sales window follows the calendar unless the user chose one, the same
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
    dispatch(fetchInventoryPerformance({ range: state.range }));
  }, [dispatch, state.range.startDate, state.range.endDate]);

  const report = state.report;
  const perf = state.performance;
  const rows = useMemo(() => valuationRows(report, perf), [report, perf]);
  const showSales = (perf?.rows.length ?? 0) > 0;
  const stockValue = perf?.totals.stockValue ?? report?.totalValue ?? 0;
  const tie = ledgerTie(stockValue, perf?.totals.ledgerValue ?? null);
  const unsold = unsoldStock(rows);
  const shares = useMemo(() => categoryShares(rows), [rows]);
  const period = rangeLabel(state.range.startDate, state.range.endDate);
  const periodShort = `${dayjs(state.range.startDate).format('MMM D')} – ${dayjs(state.range.endDate).format('MMM D, YYYY')}`;

  const rank = state.rank;
  const ranked = rankRows(rows, rank);
  const rankLabel = RANK_OPTIONS.find(o => o.key === rank)?.label ?? 'Gross profit';
  const rankFormat = (v: number) =>
    rank === 'marginPct' ? `${v.toFixed(1)}%` : rank === 'unitsSold' ? qty(v) : rs(v);
  const rankHint = (r: ValuationRow) => {
    if (rank === 'stockValue') {
      const held = `${qty(r.qty)} on hand`;
      if (!showSales) return held;
      return r.unitsSold > 0 ? `${held} · ${qty(r.unitsSold)} sold` : `${held} · not sold in period`;
    }
    const sold = `${qty(r.unitsSold)} sold`;
    return r.marginPct === null ? sold : `${sold} · ${r.marginPct.toFixed(1)}% margin`;
  };

  const counts = useMemo(
    () =>
      Object.fromEntries(STOCK_FILTERS.map(f => [f.key, rows.filter(r => matchesFilter(r, f.key)).length])) as Record<
        StockFilter,
        number
      >,
    [rows],
  );
  const filters = STOCK_FILTERS.filter(f => showSales || (f.key !== 'belowCost' && f.key !== 'unsold'));
  const listed = useMemo(
    () =>
      filterRows(rows, { search, category, filter }).sort(
        (a, b) => b.value - a.value || a.itemName.localeCompare(b.itemName),
      ),
    [rows, search, category, filter],
  );
  const listTotals = rowTotals(listed);
  const narrowed = search.trim() !== '' || category !== '' || filter !== 'all';

  const openItem = (itemId: string) => {
    const row = rows.find(r => r.itemId === itemId);
    navigation.navigate('InventoryItemReport', {
      itemId,
      itemName: row?.itemName,
      range: showSales ? state.range : undefined,
    });
  };

  const trendPoints = (state.trend?.points ?? []).map(p => ({ period: p.period, label: p.label, value: p.value }));
  const trendSelected = trendPoints.find(p => p.period === trendMonth) ?? trendPoints[trendPoints.length - 1];

  const figures = [
    {
      label: 'Stock value',
      value: rs(stockValue),
      caption:
        tie && !tie.ties ? (
          <Text style={styles.warn}>
            Ledger {rs(tie.ledgerValue)} · differs by {rs(tie.difference)}
          </Text>
        ) : (
          `${rows.length} items · ${shares.length} categor${shares.length === 1 ? 'y' : 'ies'}${tie ? ' · ties to the ledger' : ''}`
        ),
    },
    {
      label: 'Revenue',
      value: showSales ? rs(perf?.totals.revenue ?? 0) : '—',
      caption: showSales ? `${qty(perf?.totals.unitsSold ?? 0)} units sold` : 'Not available',
    },
    {
      label: 'Gross profit',
      value: showSales ? rs(perf?.totals.grossProfit ?? 0) : '—',
      tone: showSales && (perf?.totals.grossProfit ?? 0) < 0 ? ('danger' as const) : ('default' as const),
      caption: showSales
        ? perf?.totals.marginPct == null
          ? 'No sales in the period'
          : `${perf.totals.marginPct.toFixed(1)}% margin`
        : 'Not available',
    },
    {
      label: 'Unsold stock',
      value: showSales ? rs(unsold.value) : '—',
      tone: showSales && unsold.value > 0 ? ('warning' as const) : ('default' as const),
      caption: showSales
        ? unsold.count === 0
          ? 'Every item in stock sold'
          : `${unsold.count} item${unsold.count === 1 ? '' : 's'} · ${formatShare(stockValue > 0 ? unsold.value / stockValue : 0)} of stock`
        : 'Not available',
    },
  ];

  return (
    <ReportContainer>
      <ReportHeader title="Inventory Valuation" subtitle="Stock, and which of it earns" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.filterRow}>
            <View style={styles.dateCell}>
              <DateField
                label="Sales from"
                value={state.range.startDate}
                onChangeText={t => dispatch(setInventoryPerfRange({ ...state.range, startDate: t }))}
              />
            </View>
            <View style={styles.dateCell}>
              <DateField
                label="To"
                value={state.range.endDate}
                onChangeText={t => dispatch(setInventoryPerfRange({ ...state.range, endDate: t }))}
              />
            </View>
          </View>
          <Text style={styles.note}>
            Stock is as of today and ties to the balance sheet. Revenue and margin cover the dates
            above. Tap any item to explore it month by month.
          </Text>
        </Card>

        {/* The spinner is for the first load only. A new period keeps the
            figures on screen, dimmed, until the answer lands. */}
        {state.isLoading && !report && <LoadingBlock label="Valuing inventory…" />}
        {!!state.error && (
          <ErrorBlock message={state.error} onRetry={() => dispatch(fetchInventoryValuationReport())} />
        )}

        {report && (
          <RefreshFade busy={state.isLoading || state.perfStatus === 'loading'}>
            <FigureStrip items={figures} />

            <ReportTitleBlock
              company={company}
              report="Inventory Valuation"
              periodLabel={
                showSales
                  ? `Stock ${asOfLabel(dayjs().format('YYYY-MM-DD')).replace(/^As of/, 'as of')} · sales ${period}`
                  : asOfLabel(dayjs().format('YYYY-MM-DD'))
              }
            />

            <SectionCard
              title={`Top items by ${rankLabel.toLowerCase()}`}
              subtitle={rank === 'stockValue' ? 'As of today · every item held' : `${periodShort} · items that sold`}
              icon="award"
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {RANK_OPTIONS.filter(o => showSales || o.key === 'stockValue').map(o => {
                  const on = o.key === rank;
                  return (
                    <TouchableOpacity
                      key={o.key}
                      style={[styles.chip, on && styles.chipOn]}
                      activeOpacity={0.8}
                      onPress={() => dispatch(setInventoryRank(o.key as RankKey))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styles.gapTop}>
                <RankedBars
                  points={ranked.map(r => ({
                    key: r.itemId,
                    label: r.itemName,
                    value: rankFigure(r, rank) ?? 0,
                    hint: rankHint(r),
                  }))}
                  format={rankFormat}
                  onSelect={openItem}
                  navigates
                  emptyLabel={rank === 'stockValue' ? 'Nothing is held in stock.' : 'Nothing sold in this period.'}
                />
              </View>
            </SectionCard>

            {shares.length > 0 && (
              <SectionCard
                title="Stock value by category"
                subtitle={category ? `Filtering the list to ${category}` : 'As of today · tap one to filter the list'}
                icon="layers"
                right={
                  category ? (
                    <TouchableOpacity onPress={() => setCategory('')} accessibilityRole="button">
                      <Text style={styles.link}>Show all</Text>
                    </TouchableOpacity>
                  ) : undefined
                }
              >
                <RankedBars
                  points={shares.map(c => ({
                    key: c.category,
                    label: c.category,
                    value: c.value,
                    hint: `${c.items} item${c.items === 1 ? '' : 's'} · ${formatShare(c.share)} of stock`,
                  }))}
                  format={v => rs(v)}
                  onSelect={key => {
                    setCategory(key === category ? '' : key);
                    setShown(PAGE);
                  }}
                  activeKey={category || null}
                />
              </SectionCard>
            )}

            {trendPoints.length > 0 && (
              <SectionCard
                title="Stock value over time"
                subtitle="Inventory account 1200 at each month end — ties to the balance sheet"
                icon="trending-up"
              >
                {trendSelected && (
                  <View style={styles.readout}>
                    <Text style={styles.readoutLabel}>{trendSelected.label}</Text>
                    <Text style={[styles.readoutValue, (trendSelected.value ?? 0) < 0 && styles.bad]}>
                      {rs(trendSelected.value ?? 0)}
                    </Text>
                  </View>
                )}
                <MetricChart
                  metric="closingValue"
                  type="bar"
                  points={trendPoints}
                  selected={trendMonth}
                  onSelect={setTrendMonth}
                />
              </SectionCard>
            )}

            <SectionCard
              title="Items"
              subtitle={showSales ? `Stock today · sales ${periodShort}` : 'Stock today'}
              icon="package"
            >
              <View style={styles.search}>
                <Feather name="search" size={15} color={colors.textTertiary} />
                <TextInput
                  value={search}
                  onChangeText={v => {
                    setSearch(v);
                    setShown(PAGE);
                  }}
                  placeholder="Find an item or SKU"
                  placeholderTextColor={colors.textTertiary}
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  accessibilityLabel="Find an item or SKU"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search">
                    <Feather name="x" size={15} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, styles.gapTop]}>
                {filters.map(f => {
                  const on = f.key === filter;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.chip, on && styles.chipOn]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setFilter(f.key);
                        setShown(PAGE);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {f.label} {counts[f.key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {listed.length === 0 ? (
                <EmptyBlock
                  icon="search"
                  title="No items match"
                  hint={narrowed ? 'Try another search or filter.' : 'Add items to see valuation.'}
                />
              ) : (
                <View style={styles.gapTop}>
                  {listed.slice(0, shown).map((r, i) => {
                    const idle = showSales && r.qty > 0 && r.unitsSold <= 0;
                    const sub = !showSales
                      ? `${qty(r.qty)} on hand`
                      : r.qty <= 0 && !traded(r)
                        ? 'Out of stock'
                        : idle
                          ? r.lastSoldDate
                            ? `Not sold since ${dayjs(r.lastSoldDate).format('MMM D, YYYY')}`
                            : 'Never sold'
                          : `${qty(r.unitsSold)} sold${r.marginPct !== null ? ` · ${r.marginPct.toFixed(1)}%` : ''}`;
                    return (
                      <TouchableOpacity
                        key={r.itemId}
                        style={[styles.itemRow, i > 0 && styles.itemRule]}
                        activeOpacity={0.6}
                        onPress={() => openItem(r.itemId)}
                        accessibilityRole="button"
                        accessibilityLabel={`${r.itemName}, ${rs(r.value)}. Explore`}
                      >
                        <View style={styles.itemMain}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {r.itemName}
                          </Text>
                          <Text style={styles.itemMeta} numberOfLines={1}>
                            {[r.sku, r.category].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <View style={styles.itemFigures}>
                          <Text style={styles.itemValue}>{rs(r.value)}</Text>
                          <Text
                            style={[
                              styles.itemSub,
                              idle && styles.warn,
                              traded(r) && r.grossProfit < 0 && styles.bad,
                            ]}
                            numberOfLines={1}
                          >
                            {sub}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    );
                  })}

                  {listed.length > shown && (
                    <TouchableOpacity style={styles.more} onPress={() => setShown(s => s + PAGE)} accessibilityRole="button">
                      <Text style={styles.link}>
                        Show more ({shown} of {listed.length})
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* The rows SHOWING, so a filtered list foots to itself. */}
                  <View style={styles.total}>
                    <Text style={styles.totalLabel}>
                      {narrowed ? `${listed.length} of ${rows.length} items` : `${rows.length} items`}
                    </Text>
                    <View style={styles.itemFigures}>
                      <Text style={styles.totalValue}>{rs(listTotals.value)}</Text>
                      {showSales && (
                        <Text style={[styles.itemSub, listTotals.grossProfit < 0 && styles.bad]}>
                          GP {rs(listTotals.grossProfit)}
                          {listTotals.marginPct !== null ? ` · ${listTotals.marginPct.toFixed(1)}%` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </SectionCard>

            {perf && rows.some(traded) && perf.reconciliation.items.length > 0 && (
              // Why this report does not equal the Profit & Loss, named rather
              // than left to be discovered as a discrepancy. It foots exactly:
              // goods sold plus every line below equals the P&L figure.
              <SectionCard title="How this ties to Profit & Loss" subtitle={period} icon="git-merge">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={tableStyles.head}>
                      <TCell width={210} head>Source</TCell>
                      <TCell width={130} head align="right">Revenue</TCell>
                      <TCell width={130} head align="right">Cost of sales</TCell>
                    </View>
                    <View style={tableStyles.row}>
                      <TCell width={210}>Goods sold (this report)</TCell>
                      <TCell width={130} align="right">{rs(perf.reconciliation.itemRevenue)}</TCell>
                      <TCell width={130} align="right">{rs(perf.reconciliation.itemCogs)}</TCell>
                    </View>
                    {perf.reconciliation.items.map((it, i) => (
                      <View key={it.label} style={[tableStyles.row, i % 2 === 0 && tableStyles.rowAlt]}>
                        <TCell width={210}>{it.label}</TCell>
                        <TCell width={130} align="right">{it.revenue === 0 ? '—' : rs(it.revenue)}</TCell>
                        <TCell width={130} align="right">{it.cogs === 0 ? '—' : rs(it.cogs)}</TCell>
                      </View>
                    ))}
                    <View style={tableStyles.totalRow}>
                      <TCell width={210} strong>Profit &amp; Loss</TCell>
                      <TCell width={130} align="right" strong>{rs(perf.reconciliation.glRevenue)}</TCell>
                      <TCell width={130} align="right" strong>{rs(perf.reconciliation.glCogs)}</TCell>
                    </View>
                  </View>
                </ScrollView>
                <Text style={styles.note}>{perf.reconciliation.note}</Text>
                {perf.estimatedCogsShare > 0.33 && (
                  <Text style={styles.reason}>
                    {Math.round(perf.estimatedCogsShare * 100)}% of the cost above was split across items
                    that shared an invoice. Each invoice&apos;s total is exact; how it divides between items
                    on it is an estimate.
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
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  dateCell: { flex: 1 },
  note: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
  reason: { ...typography.overline, color: colors.textTertiary, marginTop: spacing.xxs },
  warn: { color: colors.warning },
  bad: { color: colors.danger },
  link: { ...typography.labelSm, color: colors.primary },
  gapTop: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.labelSm, color: colors.textSecondary },
  chipTextOn: { color: colors.textInverse },
  readout: { marginBottom: spacing.xs },
  readoutLabel: { ...typography.labelSm, color: colors.textTertiary },
  readoutValue: { ...typography.h4, color: colors.textPrimary },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    height: 40,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { ...typography.bodySm, color: colors.textPrimary, flex: 1, paddingVertical: 0 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  itemRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  itemMain: { flex: 1, gap: 2 },
  itemName: { ...typography.bodySm, color: colors.textPrimary },
  itemMeta: { ...typography.caption, color: colors.textTertiary },
  itemFigures: { alignItems: 'flex-end', gap: 2, maxWidth: '50%' },
  itemValue: { ...typography.labelMd, color: colors.textPrimary },
  itemSub: { ...typography.caption, color: colors.textSecondary },
  more: { alignItems: 'center', paddingVertical: spacing.sm },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.textPrimary,
  },
  totalLabel: { ...typography.labelSm, color: colors.textPrimary },
  totalValue: { ...typography.labelLg, color: colors.textPrimary },
});

export default InventoryValuationScreen;
