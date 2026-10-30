// The balance sheet as a document: the rows the screen shows, with the
// comparison laid out as COLUMNS — the PDF has the width a phone does not.

import dayjs from 'dayjs';

import {
  formatChangePct,
  formatPct,
  type BalanceSheetMode,
  type BalanceSheetReport,
  type BsDisplaySection,
} from '../../../models/balanceSheetModel';
import { asOfLabel } from '../../../components/reports/reportFormat';
import { docAmount, type ReportDoc, type ReportDocRow } from '../../../utils/reportHtml';

const short = (iso: string) => dayjs(iso).format('D MMM YYYY');

export const balanceSheetDoc = (
  report: BalanceSheetReport,
  sections: BsDisplaySection[],
  mode: BalanceSheetMode,
  compareTo: string | null,
): ReportDoc => {
  const comparing = mode === 'compare' && !!compareTo;
  const columns = comparing
    ? [short(report.asOfDate), short(compareTo!), 'Change', 'Change %']
    : mode === 'common'
      ? ['Amount', '% of assets']
      : ['Amount'];

  const rows: ReportDocRow[] = [];
  for (const s of sections) {
    rows.push({ kind: 'heading', label: s.title, values: [] });
    for (const r of s.data) {
      if (r.kind === 'groupHeading') {
        rows.push({ kind: 'heading', label: r.label, depth: 1, values: [] });
      } else if (r.kind === 'line') {
        const l = r.line;
        const label = l.accountCode ? `${l.accountCode}  ${l.accountName}` : l.accountName;
        rows.push({
          label,
          depth: r.depth + 1,
          values: comparing
            ? [l.amount, l.priorAmount, l.change, formatChangePct(l) || null]
            : mode === 'common'
              ? [l.amount, formatPct(l.pctOfTotalAssets)]
              : [l.amount],
        });
      } else if (r.kind === 'total') {
        rows.push({
          kind: r.grand ? 'grand' : 'total',
          label: r.label,
          values: comparing
            ? [r.amount, r.prior, null, formatChangePct({ amount: r.amount, priorAmount: r.prior, changePct: r.changePct }) || null]
            : mode === 'common'
              ? [r.amount, r.pct === null ? null : formatPct(r.pct)]
              : [r.amount],
        });
      }
    }
  }

  const tie = report.isBalanced
    ? 'Assets = Liabilities + Equity: balanced.'
    : `Assets = Liabilities + Equity: out of balance${report.gap ? ` by ${docAmount(report.gap)}` : ''}.`;

  return {
    title: 'Balance Sheet',
    periodLabel: comparing ? `${asOfLabel(report.asOfDate)} compared with ${short(compareTo!)}` : asOfLabel(report.asOfDate),
    basis: 'Accrual',
    columns,
    rows,
    notes: [tie],
  };
};
