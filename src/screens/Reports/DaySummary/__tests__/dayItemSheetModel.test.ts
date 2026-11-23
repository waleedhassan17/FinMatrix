// The item-wise sales sheet on the phone: the same grouping, totals and
// comparisons as the website, so the two never show different figures.
jest.mock('../../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), put: jest.fn() },
  extractErrorMessage: (e: { message?: string }) => e?.message ?? 'error',
}));

import {
  groupItemSheet,
  itemSheetDoc,
  itemShareLines,
  qtyCell,
  sheetChange,
  sheetPeriodLabel,
  uncategorizedShare,
} from '../../../../models/dayItemSheetModel';
import { dayItemSheetSerializer, daySummarySerializer } from '../../../../serializers/daySummarySerializer';
import { dayItemSheetOwner, dayItemSheetStaff, daySummaryOwner } from '../__fixtures__/daySummary';

const owner = dayItemSheetSerializer(dayItemSheetOwner);
const staff = dayItemSheetSerializer(dayItemSheetStaff);

describe('item-wise sales — the serializer', () => {
  it('reads decimal strings, owner-only figures and the reorder list', () => {
    expect(owner.rows[0]).toMatchObject({ name: 'Lactogen 1 400G', value: 15000, net: 11, margin: 19.3 });
    expect(owner.rows[4]).toMatchObject({ kind: 'service', itemId: null });
    expect(owner.reorder).toHaveLength(2);
    expect(staff.rows[0]).toMatchObject({ cost: null, profit: null, margin: null });
  });

  it('survives an empty payload, and an older summary without returns', () => {
    const empty = dayItemSheetSerializer({});
    expect(empty.rows).toEqual([]);
    expect(empty.reorder).toBeNull();
    const s = daySummarySerializer(daySummaryOwner);
    expect(s.sales.returns).toBe(0);
    expect(s.sales.net).toBe(s.sales.total);
  });
});

describe('item-wise sales — grouping', () => {
  it('groups by category ignoring case, the uncategorised and services last', () => {
    const { groups } = groupItemSheet(owner, { groupBy: 'category', sort: 'code' });
    expect(groups.map(g => g.label)).toEqual(['MILK PACK', 'NESTLE POWDER', 'Uncategorized', 'Services & other charges']);
    const nestle = groups.find(g => g.label === 'NESTLE POWDER')!;
    expect(nestle.rows.map(r => r.code)).toEqual(['001-004', '001-006']);
    expect(nestle.totals).toMatchObject({ lines: 2, sold: 15, free: 1, returned: 2, net: 14, value: 20340, profit: 3740 });
  });

  it('a group’s comparison includes what sold only in the earlier period', () => {
    const { groups, totals } = groupItemSheet(owner, { groupBy: 'category', sort: 'code' });
    expect(groups.find(g => g.label === 'NESTLE POWDER')!.totals.compareValue).toBe(12900);
    expect(totals.compareValue).toBe(15400);
  });

  it('groups by agency or not at all; sorting by sales orders the groups too', () => {
    expect(groupItemSheet(owner, { groupBy: 'agency', sort: 'code' }).groups.map(g => g.label)).toEqual([
      'Nestle',
      'No agency',
      'Services & other charges',
    ]);
    expect(groupItemSheet(owner, { groupBy: 'category', sort: 'value' }).groups.map(g => g.label)).toEqual([
      'NESTLE POWDER',
      'MILK PACK',
      'Uncategorized',
      'Services & other charges',
    ]);
  });

  it('a search keeps matching lines by name or code, and the totals follow', () => {
    const view = groupItemSheet(owner, { groupBy: 'category', sort: 'code', q: '001-' });
    expect(view.filtered).toBe(true);
    expect(view.totals).toMatchObject({ lines: 2, value: 20340 });
  });

  it('staff totals carry no cost or profit', () => {
    expect(groupItemSheet(staff, { groupBy: 'category', sort: 'code' }).totals).toMatchObject({
      cost: null,
      profit: null,
      margin: null,
    });
  });
});

describe('item-wise sales — words, sharing and the PDF', () => {
  it('names a day or a range, and shows change', () => {
    expect(sheetPeriodLabel('2026-10-25', '2026-10-25')).toBe('Sun 25 Oct 2026');
    expect(sheetPeriodLabel('2026-10-25', '2026-10-26')).toBe('25 Oct – 26 Oct 2026');
    expect(sheetPeriodLabel('2026-12-30', '2027-01-02')).toBe('30 Dec 2026 – 2 Jan 2027');
    expect(sheetChange(15000, 12000)).toEqual({ text: '+25%', up: true });
    expect(sheetChange(1, null)).toBeNull();
    expect(qtyCell(0)).toBe('–');
  });

  it('the shared text lists the top groups; missing categories are spotted', () => {
    expect(itemShareLines(owner)[0]).toBe('Top product groups:');
    expect(itemShareLines(owner)[1]).toMatch(/^• NESTLE POWDER — Rs 20,340\.00 \(14 units\)$/);
    expect(uncategorizedShare(owner)).toBe(0.25);
  });

  it('the PDF has the free and owner columns, a heading and total per group, one grand total', () => {
    const doc = itemSheetDoc(owner, { groupBy: 'category', sort: 'code' }, 'Ali Traders');
    expect(doc.title).toBe('Ali Traders — Item-wise sales');
    expect(doc.columns).toEqual(['Sold', 'Free', 'Returned', 'Net units', 'Net sales', 'Gross profit', 'Margin']);
    expect(doc.rows.filter(r => r.kind === 'heading').map(r => r.label)).toEqual([
      'MILK PACK',
      'NESTLE POWDER',
      'Uncategorized',
      'Services & other charges',
    ]);
    expect(doc.rows.filter(r => r.kind === 'subtotal')).toHaveLength(4);
    const grand = doc.rows[doc.rows.length - 1];
    expect(grand).toMatchObject({ label: 'Grand total', kind: 'grand' });
    expect(grand.values).toEqual(['26', '1', '2', '25', 23110, 4260, '18.6%']);
    // Every row has a value for every column.
    expect(doc.rows.every(r => r.values.length === doc.columns.length)).toBe(true);
    expect(doc.rows.find(r => r.label.startsWith('001-006'))?.label).toBe('001-006  Lactogen 1 400G');
  });

  it('staff get a PDF without cost columns, nor Free when nothing went free', () => {
    expect(itemSheetDoc(staff, { groupBy: 'category', sort: 'code' }).columns).toEqual([
      'Sold',
      'Returned',
      'Net units',
      'Net sales',
    ]);
  });
});
