// The trial balance as a document. The working trial balance's six columns
// fit a landscape page; on the phone they are one tap away under each row.

import { rangeLabel } from '../../../components/reports/reportFormat';
import {
  trialBalanceSections,
  type TbPairs,
  type TrialBalanceMode,
  type TrialBalanceReport,
} from '../../../models/trialBalanceModel';
import type { ReportDoc, ReportDocRow } from '../../../utils/reportHtml';
import dayjs from 'dayjs';

const six = (p: TbPairs | null): (number | null)[] =>
  p
    ? [p.openingDebit, p.openingCredit, p.periodDebit, p.periodCredit, p.closingDebit, p.closingCredit]
    : [null, null, null, null, null, null];

const blank = (n: number) => (n === 0 ? null : n);

export const trialBalanceDoc = (report: TrialBalanceReport, mode: TrialBalanceMode): ReportDoc => {
  const working = mode === 'working';
  const columns = working
    ? ['Opening Dr', 'Opening Cr', 'Period Dr', 'Period Cr', 'Closing Dr', 'Closing Cr']
    : ['Debit', 'Credit'];
  const rows: ReportDocRow[] = [];
  for (const s of trialBalanceSections(report)) {
    rows.push({ kind: 'heading', label: s.title, values: [] });
    for (const r of s.data) {
      rows.push({
        label: r.accountCode ? `${r.accountCode}  ${r.accountName}` : r.accountName,
        depth: 1,
        values: working ? six(r.pairs).map(v => (v === null ? null : blank(v))) : [blank(r.debit), blank(r.credit)],
      });
    }
    if (s.subtotal) {
      rows.push({
        kind: 'subtotal',
        label: `Total ${s.title}`,
        values: working ? six(s.subtotal.pairs) : [s.subtotal.debit, s.subtotal.credit],
      });
    }
  }
  rows.push({
    kind: 'grand',
    label: 'TOTAL',
    values: working && report.totals ? six(report.totals) : [report.totalDebits, report.totalCredits],
  });

  const period =
    mode === 'closing'
      ? `As of ${dayjs(report.asOfDate ?? report.range.endDate).format('MMMM D, YYYY')}`
      : rangeLabel(report.range.startDate, report.range.endDate);
  return {
    title: `Trial Balance — ${mode === 'closing' ? 'Closing' : mode === 'working' ? 'Working' : 'Movement'}`,
    periodLabel: period,
    columns,
    rows,
    notes: [
      report.isBalanced ? 'Debits equal credits.' : 'Debits do not equal credits.',
      ...report.warnings.map(w => w.message),
    ],
  };
};
