import { buildReportHtml, docAmount, isLandscape, paginate, reportFilename, type ReportDoc } from '../reportHtml';

const company = { name: 'Galaxy & Sons', addressLine1: '' };

const doc = (rows: number, columns = ['Amount']): ReportDoc => ({
  title: 'Balance Sheet',
  periodLabel: 'As of October 26, 2026',
  columns,
  rows: Array.from({ length: rows }, (_, i) => ({
    label: `Account ${i}`,
    values: columns.map((_, c) => (c === 0 ? -1234.5 : 'x')),
  })),
  notes: ['Assets = Liabilities + Equity'],
});

describe('statement PDF', () => {
  it('writes negatives in parentheses, two places, grouped', () => {
    expect(docAmount(-1234.5)).toBe('(1,234.50)');
    expect(docAmount(1000000)).toBe('1,000,000.00');
  });

  it('numbers every page, "n of N"', () => {
    const html = buildReportHtml(doc(70), company, new Date(2026, 9, 26, 9, 30));
    // 30 on the first page, 40 after: 70 rows is exactly 2 pages, 71 is 3.
    expect(buildReportHtml(doc(71), company)).toContain('Page 3 of 3');
    expect(html).toContain('Page 1 of 2');
    expect(html).toContain('Page 2 of 2');
    expect(html).not.toContain('Page 3 of');
    expect(html).toContain('Galaxy &amp; Sons');
    expect(html).toContain('(1,234.50)');
    expect(html).toContain('26 Oct 2026, 9:30 AM');
    // The notes close the statement, on the last page only.
    expect(html.indexOf('Assets = Liabilities + Equity')).toBeGreaterThan(html.indexOf('Page 1 of 2'));
  });

  it('goes landscape for a comparison', () => {
    expect(isLandscape({ columns: ['Amount'] })).toBe(false);
    expect(isLandscape({ columns: ['Now', 'Prior', 'Change'] })).toBe(true);
    expect(buildReportHtml(doc(3, ['Now', 'Prior', 'Change']), company)).toContain('A4 landscape');
  });

  it('never leaves a heading alone at the foot of a page', () => {
    const rows = [
      { kind: 'line' as const },
      { kind: 'line' as const },
      { kind: 'heading' as const },
      { kind: 'line' as const },
      { kind: 'line' as const },
    ];
    const pages = paginate(rows, 3, 3);
    expect(pages.map(p => p.length)).toEqual([2, 3]);
    expect(pages[1][0].kind).toBe('heading');
  });

  it('always yields at least one page', () => {
    expect(paginate([], 30, 40)).toEqual([[]]);
    expect(buildReportHtml(doc(0), company)).toContain('Page 1 of 1');
  });

  it('names the file after the report and period', () => {
    expect(reportFilename({ title: 'Balance Sheet', periodLabel: 'As of October 26, 2026' })).toBe(
      'balance-sheet-as-of-october-26-2026.pdf',
    );
  });
});
