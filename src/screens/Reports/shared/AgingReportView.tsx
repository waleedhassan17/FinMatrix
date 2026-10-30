// ═══════════════════════════════════════════════════════
// FinMatrix — Aging report (shared by A/R and A/P)
// ═══════════════════════════════════════════════════════
// The two screens were near-literal copies: identical layout, identical table,
// five hardcoded columns each, and three copy-paste slips on the payables side
// (a thunk exported under the receivables name, a "Aging receivables…" spinner,
// and vendor rows labelled "Customer"). They are one component now, because
// the backend builds both with the same bucketAging() helper — so anything
// true of one is true of the other by construction.

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, RefreshControl, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import { Feather } from '@expo/vector-icons';

import { formatCurrency } from '../../../utils/formatters';
import {
  ReportContainer,
  ReportHeader,
  Card,
  SectionCard,
  FigureStrip,
  RefreshFade,
  ReportSkeleton,
  ErrorBlock,
  ErrorBanner,
  EmptyBlock,
  Badge,
  ProgressBar,
  FilterChip,
  KpiCard,
  KpiCardGrid,
  parenNegative,
  TCell,
  tableStyles,
  ACCENT,
  amountColWidth,
  reportContentStyle,
  ReportTitleBlock,
  useStatementCompany,
  asOfLabel,
  Segmented,
  StatementRow,
  LoadMoreFooter,
} from '../../../components/reports/ReportUI';
import {
  agingPartyLabel,
  agingStatus,
  AGING_PAGE_SIZE,
  AGING_STATUS_LABEL,
  AGING_ROW_FILTERS,
  AGING_SORT_LABELS,
  filterAgingRows,
  termsText,
  type AgingRowFilter,
  bucketShares,
  canDrillParty,
  defaultAgingSort,
  formatShare,
  notYetDueTotal,
  overdueTotal,
  overduePartyCount,
  resolveSelectedBucket,
  visibleAgingRows,
  type TopAgingParty,
  type AgingBucketDef,
  type AgingPresetKey,
  type AgingSort,
  type ARAgingReport,
  type ARAgingRow,
  type AgingStatus,
  type PartyDocsState,
} from '../../../models/arAgingModel';
import { THEME } from '../../../theme';
import { AGING_RAMP, rampSteps } from '../../../theme/theme';
import AgingAgeBar from './AgingAgeBar';
import AgingBucketChart from './AgingBucketChart';
import DonutChart from './DonutChart';
import AgingPartyDocuments from './AgingPartyDocuments';
import AgingTopParties from './AgingTopParties';
import BucketPresetControl from './BucketPresetControl';
import KpiInfoSheet from './KpiInfoSheet';
import ScheduleBars from './ScheduleBars';
import type { Kpi } from '../../../models/kpiModel';

const { colors, spacing, typography } = THEME;

const rs = (n: number) => formatCurrency(n, 'Rs ');

// Stable empty fallbacks. `?? []` mints a new array on every render, which
// would make the memo below recompute each time precisely when there is
// nothing to compute.
const NO_ROWS: ARAgingRow[] = [];
const NO_BUCKETS: AgingBucketDef[] = [];

/** Widest label a bucket column must fit, so "91 and over" is never clipped. */
const NAME_WIDTH = 170;
const TOTAL_WIDTH = 130;

export interface AgingReportViewProps {
  title: string;
  subtitle: string;
  /** 'Customer' on receivables, 'Vendor' on payables. */
  counterpartyHeader: string;
  /** 'By Customer' / 'By Vendor'. */
  sectionTitle: string;
  sectionIcon: 'users' | 'truck';
  loadingLabel: string;
  emptyTitle: string;
  emptyHint: string;
  statementTitle: string;
  report: ARAgingReport | null;
  isLoading: boolean;
  error: string;
  preset: AgingPresetKey | null;
  customBuckets: string;
  onBack: () => void;
  onRetry: () => void;
  onPickPreset: (key: AgingPresetKey) => void;
  onApplyCustom: (buckets: string) => void;
  /** 'customer' on receivables, 'vendor' on payables. */
  partyType: 'customer' | 'vendor';
  /** What an open document is called here — 'invoices' or 'bills'. */
  documentNoun: string;
  selectedBucket: string | null;
  onSelectBucket: (key: string | null) => void;
  sort: AgingSort | null;
  onChangeSort: (sort: AgingSort) => void;
  expanded: Record<string, boolean>;
  documents: Record<string, PartyDocsState>;
  onToggleParty: (partyId: string) => void;
  onRetryParty: (partyId: string) => void;
  onOpenDocument: (documentType: string, documentId: string) => void;
}

const styles = StyleSheet.create({
  clear: { ...typography.labelSm, color: colors.primary },
  count: {
    ...typography.overline,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.xxs,
  },
  none: { ...typography.caption, color: colors.textTertiary, paddingVertical: spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    height: 40,
    borderRadius: THEME.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { ...typography.bodySm, color: colors.textPrimary, flex: 1, paddingVertical: 0 },
  footnote: { ...typography.caption, color: colors.textTertiary, paddingHorizontal: spacing.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  party: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight, paddingBottom: spacing.xxs },
  partyMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, paddingLeft: 22 },
  partyMetaText: { ...typography.caption, color: colors.textTertiary, flexShrink: 1 },
  limit: { paddingLeft: 22, paddingRight: spacing.xxs, marginTop: 4, gap: 2 },
  limitText: { ...typography.caption, color: colors.textTertiary, fontVariant: ['tabular-nums'] },
  views: { marginTop: spacing.sm },
  matrixToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
  },
  matrixToggleText: { ...typography.labelMd, color: colors.primary },
});

/** The status's colour only repeats what its word says. */
const STATUS_TONE: Record<AgingStatus, 'success' | 'warning' | 'danger'> = {
  current: 'success',
  overdue: 'warning',
  '90plus': 'danger',
};

const pct1 = (v: number | null): string => (v === null ? '—' : `${v.toFixed(1)}%`);
const shortDate = (d: string) => dayjs(d).format('D MMM YYYY');

/**
 * What the row says about the party besides how much: terms, the last
 * payment, the oldest due date, and — for a customer with a limit — how much
 * of it is used. Every figure is the server's; the bar is drawn only from the
 * server's percentage.
 */
const PartyDetails: React.FC<{ row: ARAgingRow; partyType: 'customer' | 'vendor' }> = ({ row, partyType }) => {
  const bits = [
    termsText(row.paymentTerms),
    row.lastPaymentDate
      ? `last ${partyType === 'vendor' ? 'paid' : 'paid you'} ${row.lastPaymentAmount !== null && row.lastPaymentAmount !== undefined ? `${parenNegative(row.lastPaymentAmount, 'Rs ')} ` : ''}on ${shortDate(row.lastPaymentDate)}`
      : row.lastPaymentDate === null
        ? 'no payment yet'
        : null,
    row.oldestDueDate ? `oldest due ${shortDate(row.oldestDueDate)}` : null,
  ].filter(Boolean);
  const hasLimit = partyType === 'customer' && (row.creditLimit ?? 0) > 0;
  if (bits.length === 0 && !hasLimit && !row.overLimit) return null;
  return (
    <>
      {bits.length > 0 || row.overLimit ? (
        <View style={styles.partyMeta}>
          {row.overLimit ? <Badge label="Over limit" color={colors.danger} /> : null}
          {bits.length > 0 ? <Text style={styles.partyMetaText}>{bits.join(' · ')}</Text> : null}
        </View>
      ) : null}
      {hasLimit ? (
        <View style={styles.limit} accessible accessibilityLabel={`Credit limit ${parenNegative(row.creditLimit!, 'Rs ')}${row.creditUsedPct !== null && row.creditUsedPct !== undefined ? `, ${pct1(row.creditUsedPct)} used` : ''}`}>
          {row.creditUsedPct !== null && row.creditUsedPct !== undefined ? (
            <ProgressBar pct={row.creditUsedPct} color={row.overLimit ? colors.danger : row.creditUsedPct >= 80 ? colors.warning : colors.primary} />
          ) : null}
          <Text style={styles.limitText}>
            {row.creditUsedPct !== null && row.creditUsedPct !== undefined ? `${pct1(row.creditUsedPct)} of ` : 'Limit '}
            {parenNegative(row.creditLimit!, 'Rs ')}
            {row.creditUsedPct !== null && row.creditUsedPct !== undefined ? ' limit' : ''}
          </Text>
        </View>
      ) : null}
    </>
  );
};

const AgingReportView: React.FC<AgingReportViewProps> = ({
  title,
  subtitle,
  counterpartyHeader,
  sectionTitle,
  sectionIcon,
  loadingLabel,
  emptyTitle,
  emptyHint,
  statementTitle,
  report,
  isLoading,
  error,
  preset,
  customBuckets,
  onBack,
  onRetry,
  onPickPreset,
  onApplyCustom,
  partyType,
  documentNoun,
  selectedBucket: selectedBucketRaw,
  onSelectBucket,
  sort: sortRaw,
  onChangeSort,
  expanded,
  documents,
  onToggleParty,
  onRetryParty,
  onOpenDocument,
}) => {
  const company = useStatementCompany();
  const investigateTitle = partyType === 'vendor' ? 'Who you owe' : 'Who owes you';
  const totals = report?.totals;
  const buckets = report?.buckets ?? NO_BUCKETS;
  const hasRows = (report?.rows?.length ?? 0) > 0;

  // Columns are sized to the widest figure they must hold rather than to a
  // number typed once and left behind: the count is no longer fixed, so a
  // hand-tuned width per column is not available to us.
  const colWidth = (key: string): number =>
    amountColWidth([
      ...(report?.rows ?? []).map(r => rs(r.amounts[key] ?? 0)),
      rs(totals?.amounts[key] ?? 0),
    ]);

  // "Overdue" follows the bucket set. It used to be hardcoded as the sum of
  // the 31-60, 61-90 and 91+ fields, which under a 3-day preset would quietly
  // report a month's worth of debt as current.
  const overdue = report ? overdueTotal(report) : 0;
  const notDue = report ? notYetDueTotal(report) : 0;

  // A bucket key only means something inside the bucket set that produced it,
  // so a selection made under a previous preset is dropped rather than left to
  // filter the list to nothing under a heading naming a missing column.
  const selectedBucket = resolveSelectedBucket(selectedBucketRaw, buckets);
  const selectedLabel = buckets.find(b => b.key === selectedBucket)?.label;
  const sort = sortRaw ?? defaultAgingSort(selectedBucket);
  const sortIndex = Math.max(0, AGING_SORT_LABELS.findIndex(o => o.key === sort));

  const allRows = report?.rows ?? NO_ROWS;
  const [search, setSearch] = useState('');
  const [rowFilter, setRowFilter] = useState<AgingRowFilter | null>(null);
  const [info, setInfo] = useState<Kpi | null>(null);
  const [chartView, setChartView] = useState<'age' | 'schedule'>('age');
  const [ageChart, setAgeChart] = useState<'donut' | 'bars'>('donut');
  const [showMatrix, setShowMatrix] = useState(false);
  // 25 parties at a time; any change to what is listed starts again at 25.
  const [shown, setShown] = useState(AGING_PAGE_SIZE);
  const listedBy = [search, rowFilter, selectedBucket, sort].join('|');
  const [shownFor, setShownFor] = useState(listedBy);
  if (shownFor !== listedBy) {
    setShownFor(listedBy);
    setShown(AGING_PAGE_SIZE);
  }
  const visibleRows = useMemo(
    () =>
      filterAgingRows(
        visibleAgingRows({ rows: allRows, buckets, selectedBucket, sort, search }),
        rowFilter,
        buckets,
        report?.asOfDate ?? '',
      ),
    [allRows, buckets, selectedBucket, sort, search, rowFilter, report?.asOfDate],
  );
  const narrowed = Boolean(selectedBucket) || search.trim().length > 0 || rowFilter !== null;
  const insights = report?.insights ?? null;
  const daysKpi = partyType === 'vendor' ? insights?.dpo : insights?.dso;
  const hasLimits = allRows.some(r => r.overLimit !== undefined);

  // Pull to refresh: the spinner shows until the reload it started lands.
  const [pulled, setPulled] = useState(false);
  const [wasLoading, setWasLoading] = useState(isLoading);
  if (wasLoading !== isLoading) {
    setWasLoading(isLoading);
    if (!isLoading) setPulled(false);
  }

  // The headline figures. Shares and counts only; every amount is the server's.
  const total = totals?.total ?? 0;
  const shares = bucketShares(buckets, { amounts: totals?.amounts ?? {}, total });
  const oldest = shares[shares.length - 1];
  const lateParties = overduePartyCount(allRows, buckets);
  const plural = (n: number) => `${n} ${partyType}${n === 1 ? '' : 's'}`;

  // Where the list sits in the scroll content, so a tap on a top party can
  // bring it into view: the body's offset plus the list's offset within it.
  const scrollRef = useRef<ScrollView>(null);
  const bodyY = useRef(0);
  const listY = useRef(0);

  const findParty = (party: TopAgingParty) => {
    setSearch(party.name);
    if (party.id && !expanded[party.id]) onToggleParty(party.id);
    // After the list has re-rendered to that one party.
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, bodyY.current + listY.current - 8), animated: true });
    }, 60);
  };

  return (
    <ReportContainer>
      <ReportHeader title={title} subtitle={subtitle} onBack={onBack} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={reportContentStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={pulled && isLoading}
            onRefresh={() => {
              setPulled(true);
              onRetry();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <Card>
          <BucketPresetControl
            preset={preset}
            customBuckets={customBuckets}
            onPickPreset={onPickPreset}
            onApplyCustom={onApplyCustom}
          />
        </Card>

        {/* The spinner is for the first load only. A reload keeps the report
            on screen, dimmed, until the new one lands — see RefreshFade. */}
        {isLoading && !report && <ReportSkeleton variant="list" />}
        {!!error && !report && <ErrorBlock message={error} onRetry={onRetry} />}
        {!!error && report && <ErrorBanner message={error} onRetry={onRetry} />}

        {report && (
          <View onLayout={e => (bodyY.current = e.nativeEvent.layout.y)}>
            <RefreshFade busy={isLoading}>
              <ReportTitleBlock
                company={company}
                report={statementTitle}
                periodLabel={asOfLabel(report.asOfDate)}
              />

              {insights ? (
                <>
                  {/* The server's figures, each judged on the server against
                      its rule of thumb — the website's four cards. */}
                  <KpiCardGrid>
                    <KpiCard
                      kpi={{
                        key: 'totalOpen',
                        label: 'Total outstanding',
                        value: insights.totalOpen,
                        unit: 'money',
                        status: 'ok',
                        assessment: insights.assessments.overduePct,
                      }}
                      context={`${rs(insights.overdue)} overdue${
                        insights.overduePct !== null ? ` (${pct1(insights.overduePct)})` : ''
                      } · ${plural(allRows.length)}`}
                      footer={<AgingAgeBar buckets={buckets} amounts={totals?.amounts ?? {}} total={totals?.total ?? 0} />}
                    />
                    {daysKpi ? <KpiCard kpi={daysKpi} onInfo={() => setInfo(daysKpi)} /> : null}
                    <KpiCard
                      kpi={{
                        key: 'weightedAvgDaysOverdue',
                        label: 'Average days overdue',
                        value: insights.weightedAvgDaysOverdue,
                        unit: 'days',
                        status: 'ok',
                        assessment: insights.assessments.weightedAvgDaysOverdue,
                      }}
                      context={insights.weightedAvgDaysOverdue === null ? 'Nothing is overdue' : 'Weighted by the balance overdue'}
                    />
                    <KpiCard
                      kpi={{
                        key: 'top5SharePct',
                        label: `Top 5 ${partyType}s`,
                        value: insights.top5SharePct,
                        unit: 'percent',
                        status: 'ok',
                        assessment: insights.assessments.top5SharePct,
                      }}
                      context={partyType === 'vendor' ? 'Share of what you owe' : 'Share of what customers owe'}
                    />
                  </KpiCardGrid>
                  <KpiInfoSheet kpi={info} onClose={() => setInfo(null)} />
                </>
              ) : (
                <FigureStrip
                  items={[
                    { label: 'Total outstanding', value: rs(total), caption: plural(allRows.length) },
                    {
                      label: 'Not yet due',
                      value: rs(notDue),
                      caption: `${formatShare(total > 0 ? notDue / total : 0)} of the total`,
                    },
                    {
                      label: 'Overdue',
                      value: rs(overdue),
                      tone: overdue > 0 ? 'warning' : 'default',
                      caption: `${formatShare(total > 0 ? overdue / total : 0)} · ${lateParties} of ${plural(allRows.length)}`,
                    },
                    {
                      label: 'Most overdue',
                      value: rs(oldest?.amount ?? 0),
                      tone: (oldest?.amount ?? 0) > 0 ? 'danger' : 'default',
                      caption: oldest ? `${oldest.label} · ${formatShare(oldest.share)}` : '—',
                    },
                  ]}
                />
              )}

              {!hasRows ? (
                <Card>
                  <EmptyBlock icon="inbox" title={emptyTitle} hint={emptyHint} />
                </Card>
              ) : (
                <>
                  {insights && insights.schedule.length > 0 ? (
                    <View style={styles.views}>
                      <Segmented
                        options={['By age', partyType === 'vendor' ? 'Cash required' : 'Expected collections']}
                        activeIndex={chartView === 'age' ? 0 : 1}
                        onChange={i => setChartView(i === 0 ? 'age' : 'schedule')}
                      />
                    </View>
                  ) : null}
                  {chartView === 'schedule' && insights && insights.schedule.length > 0 ? (
                    <SectionCard
                      title={partyType === 'vendor' ? 'Cash required' : 'Expected collections'}
                      subtitle={
                        partyType === 'vendor'
                          ? 'What you owe suppliers, by when it falls due — overdue first'
                          : 'What customers owe, by when it falls due — overdue first'
                      }
                      icon="calendar"
                    >
                      <ScheduleBars slots={insights.schedule} noun={documentNoun.replace(/s$/, '')} />
                    </SectionCard>
                  ) : (
                    <SectionCard
                      title={selectedLabel ? `Outstanding by age · ${selectedLabel}` : 'Outstanding by age'}
                      subtitle={selectedLabel ? 'The list below shows this period only' : 'Tap a period to filter the list'}
                      icon="pie-chart"
                    >
                      <Segmented
                        options={['Ring', 'Bars']}
                        activeIndex={ageChart === 'donut' ? 0 : 1}
                        onChange={i => setAgeChart(i === 0 ? 'donut' : 'bars')}
                      />
                      {ageChart === 'donut' ? (
                        <DonutChart
                          title={`What ${partyType === 'vendor' ? 'you owe' : 'customers owe'}, by age`}
                          slices={buckets.map(b => ({
                            key: b.key,
                            label: b.label,
                            value: totals?.amounts[b.key] ?? 0,
                            count: allRows.filter(r => (r.amounts[b.key] ?? 0) > 0).length,
                          }))}
                          palette={rampSteps(buckets.length, AGING_RAMP)}
                          total={totals?.total}
                          centerLabel="Outstanding"
                          labelHeader="Age"
                          format={rs}
                          countLabel={plural}
                          selectedKey={selectedBucket}
                          onSelect={key => onSelectBucket(key === selectedBucket ? null : key)}
                          selectVerb="Show only"
                        />
                      ) : (
                        <AgingBucketChart
                          buckets={buckets}
                          amounts={totals?.amounts ?? {}}
                          total={totals?.total}
                          rows={allRows}
                          selectedBucketKey={selectedBucket}
                          onSelectBucket={onSelectBucket}
                        />
                      )}
                    </SectionCard>
                  )}

                  <AgingTopParties
                    buckets={buckets}
                    rows={allRows}
                    selectedBucket={selectedBucket}
                    partyNoun={partyType}
                    onFindParty={findParty}
                  />

                  {/* The full bucket table, one tap away: the list below already
                      names every party, so the matrix is not a third copy of
                      it on the page. */}
                  <TouchableOpacity
                    style={styles.matrixToggle}
                    onPress={() => setShowMatrix(v => !v)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showMatrix }}
                    accessibilityLabel={showMatrix ? 'Hide the bucket table' : 'Show the bucket table'}
                  >
                    <Feather name={showMatrix ? 'chevron-down' : 'chevron-right'} size={15} color={colors.primary} />
                    <Text style={styles.matrixToggleText}>{showMatrix ? 'Hide the bucket table' : 'Show the bucket table'}</Text>
                  </TouchableOpacity>
                  {showMatrix ? (
                  <SectionCard title={sectionTitle} icon={sectionIcon}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View>
                        <View style={tableStyles.head}>
                          <TCell width={NAME_WIDTH} head>{counterpartyHeader}</TCell>
                          {buckets.map(b => (
                            <TCell key={b.key} width={colWidth(b.key)} head align="right">
                              {b.label}
                            </TCell>
                          ))}
                          <TCell width={TOTAL_WIDTH} head align="right">Total</TCell>
                        </View>

                        {report.rows.map((row, i) => (
                          <View
                            key={row.customerId || row.customerName}
                            style={[tableStyles.row, i % 2 === 1 && tableStyles.rowAlt]}
                          >
                            <TCell width={NAME_WIDTH}>{row.customerName}</TCell>
                            {buckets.map((b, bi) => {
                              // The oldest column still reads as a warning, but in
                              // ink rather than in the bar colour — the chart's
                              // ramp encodes position, not severity.
                              const isOldest = bi === buckets.length - 1;
                              const amount = row.amounts[b.key] ?? 0;
                              return (
                                <TCell
                                  key={b.key}
                                  width={colWidth(b.key)}
                                  align="right"
                                  color={
                                    amount === 0
                                      ? colors.textTertiary
                                      : isOldest && amount > 0
                                        ? ACCENT.red
                                        : undefined
                                  }
                                >
                                  {/* A dash, not "Rs 0.00": an empty cell should
                                      read as empty at a glance, as on the web. */}
                                  {amount === 0 ? '—' : rs(amount)}
                                </TCell>
                              );
                            })}
                            <TCell width={TOTAL_WIDTH} align="right" strong>{rs(row.total)}</TCell>
                          </View>
                        ))}

                        <View style={tableStyles.totalRow}>
                          <TCell width={NAME_WIDTH} strong>Total</TCell>
                          {buckets.map(b => (
                            <TCell key={b.key} width={colWidth(b.key)} align="right" strong>
                              {rs(totals?.amounts[b.key] ?? 0)}
                            </TCell>
                          ))}
                          <TCell width={TOTAL_WIDTH} align="right" strong>{rs(totals?.total ?? 0)}</TCell>
                        </View>
                      </View>
                    </ScrollView>
                  </SectionCard>
                  ) : null}

                  {/* ── The investigation ────────────────────────────────────
                      A SECOND section rather than expansion inside the matrix
                      above. That matrix lives in a horizontal ScrollView whose
                      content is as wide as its columns (600-900px), so anything
                      rendered inside it inherits that width and a detail panel
                      would start off-screen right. This one does not scroll
                      sideways, which is what lets StatementRow's expand/collapse
                      work here as it does on the P&L. */}
                  <View onLayout={e => (listY.current = e.nativeEvent.layout.y)}>
                    <SectionCard
                      title={selectedLabel ? `In ${selectedLabel}` : investigateTitle}
                      subtitle={`Tap a ${partyType} for their open ${documentNoun}`}
                      icon="search"
                      right={
                        selectedBucket ? (
                          <Text
                            style={styles.clear}
                            accessibilityRole="button"
                            accessibilityLabel={`Clear the ${selectedLabel} filter`}
                            onPress={() => onSelectBucket(null)}
                          >
                            Clear
                          </Text>
                        ) : undefined
                      }
                    >
                      <Segmented
                        options={AGING_SORT_LABELS.map(o => o.label)}
                        activeIndex={sortIndex}
                        onChange={i => onChangeSort(AGING_SORT_LABELS[i].key)}
                      />

                      <View style={styles.search}>
                        <Feather name="search" size={15} color={colors.textTertiary} />
                        <TextInput
                          value={search}
                          onChangeText={setSearch}
                          placeholder={`Find a ${partyType}`}
                          placeholderTextColor={colors.textTertiary}
                          style={styles.searchInput}
                          autoCorrect={false}
                          autoCapitalize="none"
                          returnKeyType="search"
                          accessibilityLabel={`Find a ${partyType}`}
                        />
                        {search.length > 0 && (
                          <Feather
                            name="x"
                            size={16}
                            color={colors.textTertiary}
                            onPress={() => setSearch('')}
                            accessibilityRole="button"
                            accessibilityLabel="Clear the search"
                          />
                        )}
                      </View>

                      <View style={styles.chips}>
                        {AGING_ROW_FILTERS.filter(f => f.key !== 'overLimit' || (partyType === 'customer' && hasLimits)).map(f => (
                          <FilterChip
                            key={f.key}
                            label={f.label}
                            active={rowFilter === f.key}
                            onPress={() => setRowFilter(cur => (cur === f.key ? null : f.key))}
                          />
                        ))}
                      </View>

                      <Text style={styles.count}>
                        {narrowed
                          ? `${visibleRows.length} of ${plural(allRows.length)}`
                          : plural(allRows.length)}
                      </Text>

                      {visibleRows.length === 0 ? (
                        <Text style={styles.none}>
                          {search.trim()
                            ? `No ${partyType} matches “${search.trim()}”${selectedLabel ? ` in ${selectedLabel}` : ''}.`
                            : selectedLabel
                              ? `Nobody has anything in ${selectedLabel}.`
                              : `No ${partyType} fits that filter.`}
                        </Text>
                      ) : (
                        visibleRows.slice(0, shown).map(row => {
                          // The figure this panel has to reconcile against.
                          const rowAmount = selectedBucket
                            ? (row.amounts[selectedBucket] ?? 0)
                            : row.total;
                          // No party id, nothing to address the request with — so
                          // no tap target that could only fail.
                          const drillable = canDrillParty(row);
                          const status = insights ? agingStatus(row, buckets, report.asOfDate) : null;
                          const open = !!expanded[row.customerId];
                          return (
                            <View key={row.customerId || row.customerName} style={styles.party}>
                            <StatementRow
                              label={agingPartyLabel(row)}
                              amount={rowAmount}
                              // Where the party stands, under its amount — the
                              // website's chip, in the space a phone has.
                              detail={status ? AGING_STATUS_LABEL[status] : undefined}
                              detailTone={status ? STATUS_TONE[status] : undefined}
                              onToggle={
                                drillable ? () => onToggleParty(row.customerId) : undefined
                              }
                              expanded={open}
                            >
                              <AgingPartyDocuments
                                state={documents[row.customerId]}
                                rowAmount={rowAmount}
                                noun={documentNoun}
                                bucketLabel={selectedLabel}
                                onRetry={() => onRetryParty(row.customerId)}
                                onOpenDocument={onOpenDocument}
                              />
                            </StatementRow>
                            <PartyDetails row={row} partyType={partyType} />
                            </View>
                          );
                        })
                      )}
                      <LoadMoreFooter
                        shown={Math.min(shown, visibleRows.length)}
                        total={visibleRows.length}
                        hasMore={visibleRows.length > shown}
                        loading={false}
                        onMore={() => setShown(n => n + AGING_PAGE_SIZE)}
                      />
                    </SectionCard>
                  </View>
                </>
              )}

              <Text style={styles.footnote}>
                Each period counts days past the {partyType === 'vendor' ? 'bill' : 'invoice'}’s own
                due date, as of {asOfLabel(report.asOfDate).replace(/^As of /, '')}. Changing the
                periods re-divides the same total; it never changes it. Drafts are excluded.
              </Text>
            </RefreshFade>
          </View>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

export default AgingReportView;
