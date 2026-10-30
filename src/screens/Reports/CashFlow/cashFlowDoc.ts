// The statement of cash flows as a document, by the method on screen.

import { rangeLabel } from '../../../components/reports/reportFormat';
import type { CashFlowMethod, CashFlowReport, CashFlowSection } from '../../../models/cashFlowModel';
import { docAmount, type ReportDoc, type ReportDocRow } from '../../../utils/reportHtml';

const section = (title: string, s: CashFlowSection, totalLabel: string): ReportDocRow[] => [
  { kind: 'heading', label: title, values: [] },
  ...(s.lines.length
    ? s.lines.map(l => ({ label: l.label, depth: 1, values: [l.amount] }))
    : [{ label: 'No activity in this period', depth: 1, values: [null] }]),
  { kind: 'subtotal', label: totalLabel, values: [s.total] },
];

export const cashFlowDoc = (report: CashFlowReport, method: CashFlowMethod): ReportDoc => {
  const indirect = method === 'indirect' && report.operatingIndirect;
  const operating: ReportDocRow[] = indirect
    ? [
        { kind: 'heading', label: 'Cash flows from operating activities', values: [] },
        { label: 'Net income', depth: 1, values: [report.operatingIndirect!.netIncome] },
        ...report.operatingIndirect!.adjustments.map(a => ({ label: a.label, depth: 1, values: [a.amount] })),
        { kind: 'subtotal', label: 'Net cash from operating activities', values: [report.operatingIndirect!.total] },
      ]
    : section('Cash flows from operating activities', report.operating, 'Net cash from operating activities');

  const rows: ReportDocRow[] = [
    ...operating,
    ...section('Cash flows from investing activities', report.investing, 'Net cash from investing activities'),
    ...section('Cash flows from financing activities', report.financing, 'Net cash from financing activities'),
    { kind: 'total', label: 'Net change in cash', values: [report.netChange] },
    { label: 'Cash at beginning of period', values: [report.beginningCash] },
    { kind: 'grand', label: 'Cash at end of period', values: [report.endingCash] },
  ];
  if (report.accounts.length) {
    rows.push({ kind: 'heading', label: 'By cash and bank account (beginning → ending)', values: [] });
    for (const a of report.accounts) {
      rows.push({ label: `${a.accountCode}  ${a.accountName}  ·  from ${docAmount(a.beginning)}`, depth: 1, values: [a.ending] });
    }
  }

  const notes: string[] = [];
  if (report.cashTie) {
    notes.push(
      report.cashTie.ties
        ? 'Ending cash equals the balance sheet’s Cash and Bank at the end date.'
        : `Ending cash does not equal the balance sheet’s Cash and Bank (${docAmount(report.cashTie.balanceSheetCash)}).`,
    );
  }
  return {
    title: `Statement of Cash Flows — ${indirect ? 'Indirect' : 'Direct'} method`,
    periodLabel: rangeLabel(report.range.startDate, report.range.endDate),
    columns: ['Amount'],
    rows,
    notes,
  };
};
