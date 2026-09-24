// ═══════════════════════════════════════════════════════
// FinMatrix — Analytics
// ═══════════════════════════════════════════════════════
// Twelve months of trading, laid out the way the web's Analytics report is:
// the headline figures, invoiced against billed by month, receivables by age,
// who the money comes from and goes to, and the table behind the chart.
//
// Every section says what period it covers. The payload mixes them — the
// monthly series are the last twelve months with invoices, the customer and
// supplier rankings are all-time, receivables are today — and a screen that
// lets those sit side by side unlabelled invites someone to add them up. The
// old screen did worse: it called the months "last 6", a list of suppliers
// "Expense Categories", a single snapshot a "Trend", and counted only 31+ days
// as overdue.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { THEME, AGING_RAMP, rampSteps } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { fetchAnalyticsDashboard, selectAnalyticsDashboardState } from './analyticsDashboardSlice';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';
import { formatCurrency } from '../../../utils/formatters';
import {
  analyticsMonths,
  analyticsPeriodLabel,
  analyticsSummary,
  formatChange,
} from '../../../models/analyticsModel';
import { formatShare } from '../../../models/arAgingModel';
import {
  ReportContainer,
  ReportHeader,
  SectionCard,
  FigureStrip,
  RefreshFade,
  LoadingBlock,
  ErrorBlock,
  EmptyBlock,
  Card,
  TCell,
  tableStyles,
  amountColWidth,
  reportContentStyle,
} from '../../../components/reports/ReportUI';
import RankedBars from '../shared/RankedBars';
import InvoicedBilledChart, { ChartLegend, SERIES } from './InvoicedBilledChart';

const { colors, spacing, typography } = THEME;

type AnalyticsDashboardScreenProps = NativeStackScreenProps<ReportsStackParamList, 'AnalyticsDashboard'>;

const rs = (n: number) => formatCurrency(n, 'Rs ');

/** "Rs 1.2M" / "Rs 803K" — for captions, where the full figure is above. */
const rsCompact = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}Rs ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}Rs ${Math.round(abs / 1_000)}K`;
  if (abs >= 1_000) return `${sign}Rs ${(abs / 1_000).toFixed(1)}K`;
  return `${sign}Rs ${Math.round(abs)}`;
};

/** How many customers and suppliers get a bar before the rest fold into "Other". */
const RANK_LIMIT = 5;

const AGE_LABELS = ['Current', '1–30 days', '31–60 days', '61–90 days', '91+ days'];

const MONTH_W = 76;
const CHANGE_W = 76;

const AnalyticsDashboardScreen: React.FC<AnalyticsDashboardScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectAnalyticsDashboardState);

  useEffect(() => {
    dispatch(fetchAnalyticsDashboard());
  }, [dispatch]);

  const data = state.data;

  const months = useMemo(
    () => analyticsMonths(data?.revenueTrend ?? [], data?.cashFlowTrend ?? []),
    [data],
  );
  const summary = useMemo(() => analyticsSummary(months), [months]);
  const period = analyticsPeriodLabel(months);

  // The tapped month, defaulting to the latest.
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked !== null && picked < months.length ? picked : months.length - 1;
  const focus = months[selected];
  const focusChange = formatChange(focus?.change ?? null);

  // Receivables today, in the classic five buckets. Overdue is everything past
  // "current" — the old screen started counting at 31 days.
  const aging = data?.arAgingTrend?.[0];
  const ageValues = aging
    ? [aging.current, aging.bucket1to30, aging.bucket31to60, aging.bucket61to90, aging.bucket90Plus].map(v =>
        Number.isFinite(v) ? Math.max(0, v) : 0,
      )
    : [];
  const outstanding = ageValues.reduce((t, v) => t + v, 0);
  const overdue = outstanding - (ageValues[0] ?? 0);
  const ageRamp = rampSteps(AGE_LABELS.length, AGING_RAMP);

  const latestChange = formatChange(summary.latest?.change ?? null);
  const hasAnything =
    months.length > 0 ||
    (data?.expenseCategories?.length ?? 0) > 0 ||
    (data?.topCustomers?.length ?? 0) > 0;

  const amountW = amountColWidth([
    ...months.flatMap(m => [rs(m.invoiced), rs(m.billed), rs(m.net)]),
    rs(summary.invoiced),
  ]);

  return (
    <ReportContainer>
      <ReportHeader
        title="Analytics"
        subtitle={period ? `${period} · invoice and bill totals` : 'Invoiced and billed, month by month'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
        {state.isLoading && !data && <LoadingBlock label="Loading analytics…" />}
        {!!state.error && (
          <ErrorBlock message={state.error} onRetry={() => dispatch(fetchAnalyticsDashboard())} />
        )}

        {data && !state.error && !hasAnything && (
          <Card>
            <EmptyBlock
              icon="bar-chart-2"
              title="Nothing to analyse yet"
              hint="Trends appear once there are invoices and bills to chart."
            />
          </Card>
        )}

        {data && !state.error && hasAnything && (
          <RefreshFade busy={state.isLoading}>
            <FigureStrip
              items={[
                {
                  label: 'Invoiced',
                  value: rs(summary.invoiced),
                  caption:
                    months.length > 0
                      ? `${months.length} month${months.length === 1 ? '' : 's'} · ${rsCompact(summary.averageInvoiced)} a month`
                      : 'No invoices yet',
                },
                {
                  label: summary.latest ? `Invoiced in ${summary.latest.label}` : 'Latest month',
                  value: rs(summary.latest?.invoiced ?? 0),
                  caption:
                    latestChange && summary.previous ? (
                      <Text>
                        <Text
                          style={{
                            color:
                              (summary.latest?.change?.delta ?? 0) >= 0 ? colors.success : colors.danger,
                          }}
                        >
                          {(summary.latest?.change?.delta ?? 0) >= 0 ? '▲' : '▼'} {latestChange}
                        </Text>
                        {` on ${summary.previous.label}`}
                      </Text>
                    ) : (
                      'No earlier month to compare'
                    ),
                },
                {
                  label: 'Invoiced less billed',
                  value: rs(summary.net),
                  tone: summary.net < 0 ? 'danger' : 'default',
                  caption: `Billed ${rsCompact(summary.billed)} over the same months`,
                },
                {
                  label: 'Overdue receivables',
                  value: rs(overdue),
                  tone: overdue > 0 ? 'warning' : 'default',
                  caption:
                    outstanding > 0
                      ? `${formatShare(overdue / outstanding)} of ${rsCompact(outstanding)} owed today`
                      : 'Nothing owed today',
                },
              ]}
            />

            <SectionCard
              title="Invoiced and billed"
              subtitle={period ? `${period} · months with invoices · tap a month` : undefined}
              icon="bar-chart-2"
            >
              {months.length > 0 ? (
                <>
                  <ChartLegend />
                  <InvoicedBilledChart months={months} selected={selected} onSelect={setPicked} />
                  {focus && (
                    <View style={styles.readout}>
                      <Text style={styles.readoutTitle}>{focus.label}</Text>
                      {(
                        [
                          ['invoiced', focus.invoiced],
                          ['billed', focus.billed],
                          ['net', focus.net],
                        ] as const
                      ).map(([k, v]) => (
                        <View key={k} style={styles.readoutRow}>
                          <View style={[styles.swatch, { backgroundColor: SERIES[k].color }]} />
                          <Text style={styles.readoutLabel}>
                            {k === 'net' ? 'Difference' : SERIES[k].label}
                          </Text>
                          <Text style={[styles.readoutValue, v < 0 && styles.negative]}>{rs(v)}</Text>
                        </View>
                      ))}
                      {focusChange && (
                        <Text style={styles.readoutNote}>
                          Invoiced {focusChange} on the month before
                        </Text>
                      )}
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.empty}>No invoices in the last twelve months.</Text>
              )}
            </SectionCard>

            <SectionCard
              title="Receivables by age"
              subtitle={
                outstanding > 0
                  ? `${rsCompact(outstanding)} outstanding · ${rsCompact(overdue)} overdue`
                  : 'As of today'
              }
              icon="clock"
            >
              {outstanding > 0 ? (
                <>
                  <View style={styles.stack}>
                    {ageValues.map((v, i) =>
                      v > 0 ? (
                        <View
                          key={AGE_LABELS[i]}
                          style={{ width: `${(v / outstanding) * 100}%`, backgroundColor: ageRamp[i] }}
                        />
                      ) : null,
                    )}
                  </View>
                  <View style={styles.ageRows}>
                    {AGE_LABELS.map((label, i) => (
                      <View key={label} style={styles.ageRow}>
                        <View style={[styles.swatch, { backgroundColor: ageRamp[i] }]} />
                        <Text style={styles.ageLabel}>{label}</Text>
                        <Text style={styles.ageValue}>{rs(ageValues[i] ?? 0)}</Text>
                        <Text style={styles.ageShare}>
                          {formatShare((ageValues[i] ?? 0) / outstanding)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.empty}>No receivables outstanding.</Text>
              )}
            </SectionCard>

            <SectionCard title="Top customers" subtitle="All time · invoice totals" icon="award">
              <RankedBars
                points={(data.topCustomers ?? []).map((p, i) => ({
                  key: `${p.label}-${i}`,
                  label: p.label || '(no name)',
                  value: p.value,
                }))}
                limit={RANK_LIMIT}
                format={rs}
                emptyLabel="No customer has been invoiced yet."
              />
            </SectionCard>

            {/* Named for what it is. The API calls this `expenseCategories`, but
                the query groups bills by VENDOR — there is no expense account in
                it. The old pie chart repeated the API's wording. */}
            <SectionCard title="Spend by supplier" subtitle="All time · bill totals" icon="truck">
              <RankedBars
                points={(data.expenseCategories ?? []).map((p, i) => ({
                  key: `${p.label}-${i}`,
                  label: p.label || '(no name)',
                  value: p.value,
                }))}
                limit={RANK_LIMIT}
                format={rs}
                emptyLabel="No supplier has billed yet."
              />
            </SectionCard>

            {months.length > 0 && (
              <SectionCard title="Monthly detail" subtitle="The figures behind the chart" icon="list">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={tableStyles.head}>
                      <TCell width={MONTH_W} head>Month</TCell>
                      <TCell width={amountW} head align="right">Invoiced</TCell>
                      <TCell width={amountW} head align="right">Billed</TCell>
                      <TCell width={amountW} head align="right">Difference</TCell>
                      <TCell width={CHANGE_W} head align="right">vs prior</TCell>
                    </View>
                    {months.map((m, i) => {
                      const c = formatChange(m.change);
                      return (
                        <View key={m.label} style={[tableStyles.row, i % 2 === 1 && tableStyles.rowAlt]}>
                          <TCell width={MONTH_W}>{m.label}</TCell>
                          <TCell width={amountW} align="right">{rs(m.invoiced)}</TCell>
                          <TCell
                            width={amountW}
                            align="right"
                            color={m.billed === 0 ? colors.textTertiary : undefined}
                          >
                            {m.billed === 0 ? '—' : rs(m.billed)}
                          </TCell>
                          <TCell width={amountW} align="right" color={m.net < 0 ? colors.danger : undefined}>
                            {rs(m.net)}
                          </TCell>
                          <TCell
                            width={CHANGE_W}
                            align="right"
                            color={
                              !c
                                ? colors.textTertiary
                                : (m.change?.delta ?? 0) >= 0
                                  ? colors.success
                                  : colors.danger
                            }
                          >
                            {c ?? '—'}
                          </TCell>
                        </View>
                      );
                    })}
                    <View style={tableStyles.totalRow}>
                      <TCell width={MONTH_W} strong>Total</TCell>
                      <TCell width={amountW} align="right" strong>{rs(summary.invoiced)}</TCell>
                      <TCell width={amountW} align="right" strong>{rs(summary.billed)}</TCell>
                      <TCell
                        width={amountW}
                        align="right"
                        strong
                        color={summary.net < 0 ? colors.danger : undefined}
                      >
                        {rs(summary.net)}
                      </TCell>
                      <TCell width={CHANGE_W} align="right">{''}</TCell>
                    </View>
                  </View>
                </ScrollView>
              </SectionCard>
            )}

            <Text style={styles.footnote}>
              Monthly figures are invoice and bill totals by document date, tax included, over the
              last twelve months that have invoices — a month with none is not shown. Invoiced less
              billed is not cash: nothing here says what was collected or paid. Profit &amp; Loss is
              the statement for earned revenue net of tax.
            </Text>
          </RefreshFade>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  empty: { ...typography.bodySm, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.md },
  readout: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    gap: 6,
  },
  readoutTitle: { ...typography.labelMd, color: colors.textPrimary },
  readoutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  readoutLabel: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  readoutValue: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  readoutNote: { ...typography.caption, color: colors.textTertiary },
  negative: { color: colors.danger },
  swatch: { width: 9, height: 9, borderRadius: 2 },
  stack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.neutral100,
    gap: 1,
  },
  ageRows: { marginTop: spacing.md, gap: spacing.xs + 2 },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ageLabel: { ...typography.bodySm, color: colors.textSecondary, flex: 1 },
  ageValue: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  ageShare: {
    ...typography.caption,
    color: colors.textTertiary,
    width: 40,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  footnote: { ...typography.caption, color: colors.textTertiary, paddingHorizontal: spacing.xxs },
});

export default AnalyticsDashboardScreen;
