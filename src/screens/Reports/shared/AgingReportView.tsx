// ═══════════════════════════════════════════════════════
// FinMatrix — Aging report (shared by A/R and A/P)
// ═══════════════════════════════════════════════════════
// The two screens were near-literal copies: identical layout, identical table,
// five hardcoded columns each, and three copy-paste slips on the payables side
// (a thunk exported under the receivables name, a "Aging receivables…" spinner,
// and vendor rows labelled "Customer"). They are one component now, because
// the backend builds both with the same bucketAging() helper — so anything
// true of one is true of the other by construction.

import React from 'react';
import { View, ScrollView } from 'react-native';

import { formatCurrency } from '../../../utils/formatters';
import {
  ReportContainer,
  ReportHeader,
  Card,
  SectionCard,
  KpiGrid,
  LoadingBlock,
  ErrorBlock,
  EmptyBlock,
  TCell,
  tableStyles,
  ACCENT,
  amountColWidth,
  reportContentStyle,
  ReportTitleBlock,
  useStatementCompany,
  asOfLabel,
} from '../../../components/reports/ReportUI';
import {
  notYetDueTotal,
  overdueTotal,
  type AgingPresetKey,
  type ARAgingReport,
} from '../../../models/arAgingModel';
import AgingBucketChart from './AgingBucketChart';
import BucketPresetControl from './BucketPresetControl';

const rs = (n: number) => formatCurrency(n, 'Rs ');

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
}

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
}) => {
  const company = useStatementCompany();
  const totals = report?.totals;
  const buckets = report?.buckets ?? [];
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

  return (
    <ReportContainer>
      <ReportHeader title={title} subtitle={subtitle} onBack={onBack} />

      <ScrollView contentContainerStyle={reportContentStyle} showsVerticalScrollIndicator={false}>
        <Card>
          <BucketPresetControl
            preset={preset}
            customBuckets={customBuckets}
            onPickPreset={onPickPreset}
            onApplyCustom={onApplyCustom}
          />
        </Card>

        {isLoading && <LoadingBlock label={loadingLabel} />}
        {!!error && <ErrorBlock message={error} onRetry={onRetry} />}

        {report && !isLoading && (
          <>
            <ReportTitleBlock
              company={company}
              report={statementTitle}
              periodLabel={asOfLabel(report.asOfDate)}
            />

            <KpiGrid
              items={[
                { label: 'Total Outstanding', value: rs(totals?.total ?? 0), accent: ACCENT.blue, icon: 'inbox' },
                { label: 'Not yet due', value: rs(notDue), accent: ACCENT.green, icon: 'check-circle' },
                { label: 'Overdue', value: rs(overdue), accent: ACCENT.red, icon: 'alert-circle' },
              ]}
            />

            {!hasRows ? (
              <Card>
                <EmptyBlock icon="inbox" title={emptyTitle} hint={emptyHint} />
              </Card>
            ) : (
              <>
                <SectionCard title="How much, by how late" icon="bar-chart-2">
                  <AgingBucketChart buckets={buckets} amounts={totals?.amounts ?? {}} />
                </SectionCard>

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
                            const oldest = bi === buckets.length - 1;
                            const amount = row.amounts[b.key] ?? 0;
                            return (
                              <TCell
                                key={b.key}
                                width={colWidth(b.key)}
                                align="right"
                                color={oldest && amount > 0 ? ACCENT.red : undefined}
                              >
                                {rs(amount)}
                              </TCell>
                            );
                          })}
                          <TCell width={TOTAL_WIDTH} align="right" strong>{rs(row.total)}</TCell>
                        </View>
                      ))}

                      <View style={tableStyles.totalRow}>
                        <TCell width={NAME_WIDTH} strong>TOTAL</TCell>
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
              </>
            )}
          </>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

export default AgingReportView;
