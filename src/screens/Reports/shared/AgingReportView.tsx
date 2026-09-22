// ═══════════════════════════════════════════════════════
// FinMatrix — Aging report (shared by A/R and A/P)
// ═══════════════════════════════════════════════════════
// The two screens were near-literal copies: identical layout, identical table,
// five hardcoded columns each, and three copy-paste slips on the payables side
// (a thunk exported under the receivables name, a "Aging receivables…" spinner,
// and vendor rows labelled "Customer"). They are one component now, because
// the backend builds both with the same bucketAging() helper — so anything
// true of one is true of the other by construction.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

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
  Segmented,
  StatementRow,
} from '../../../components/reports/ReportUI';
import {
  agingPartyLabel,
  AGING_SORT_LABELS,
  canDrillParty,
  defaultAgingSort,
  notYetDueTotal,
  overdueTotal,
  resolveSelectedBucket,
  visibleAgingRows,
  type AgingBucketDef,
  type AgingPresetKey,
  type AgingSort,
  type ARAgingReport,
  type ARAgingRow,
  type PartyDocsState,
} from '../../../models/arAgingModel';
import { THEME } from '../../../theme';
import AgingBucketChart from './AgingBucketChart';
import AgingPartyDocuments from './AgingPartyDocuments';
import BucketPresetControl from './BucketPresetControl';

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
});

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
  const visibleRows = useMemo(
    () => visibleAgingRows({ rows: allRows, buckets, selectedBucket, sort }),
    [allRows, buckets, selectedBucket, sort],
  );

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
                <SectionCard
                  title="How much, by how late"
                  subtitle="Tap a bar to see who is in it"
                  icon="bar-chart-2"
                >
                  <AgingBucketChart
                    buckets={buckets}
                    amounts={totals?.amounts ?? {}}
                    rows={allRows}
                    selectedBucketKey={selectedBucket}
                    onSelectBucket={onSelectBucket}
                  />
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

                {/* ── The investigation ────────────────────────────────────
                    A SECOND section rather than expansion inside the matrix
                    above. That matrix lives in a horizontal ScrollView whose
                    content is as wide as its columns (600-900px), so anything
                    rendered inside it inherits that width and a detail panel
                    would start off-screen right. This one does not scroll
                    sideways, which is what lets StatementRow's expand/collapse
                    work here as it does on the P&L. */}
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

                  <Text style={styles.count}>
                    {selectedBucket
                      ? `${visibleRows.length} of ${allRows.length}`
                      : `${allRows.length}`}
                    {' '}
                    {allRows.length === 1 ? partyType : `${partyType}s`}
                  </Text>

                  {visibleRows.length === 0 ? (
                    <Text style={styles.none}>
                      Nobody has anything in {selectedLabel}.
                    </Text>
                  ) : (
                    visibleRows.map(row => {
                      // The figure this panel has to reconcile against.
                      const rowAmount = selectedBucket
                        ? (row.amounts[selectedBucket] ?? 0)
                        : row.total;
                      // No party id, nothing to address the request with — so
                      // no tap target that could only fail.
                      const drillable = canDrillParty(row);
                      const open = !!expanded[row.customerId];
                      return (
                        <StatementRow
                          key={row.customerId || row.customerName}
                          label={agingPartyLabel(row)}
                          amount={rowAmount}
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
                      );
                    })
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

export default AgingReportView;
