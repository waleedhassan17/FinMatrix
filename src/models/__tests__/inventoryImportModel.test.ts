// The import screen renders straight from these: which tabs show, which rows
// each tab holds, what the button says, and whether the opening-stock date
// can be used. The server owns every rule; these must not invent one.
import {
  appliedSummary,
  commitLabel,
  importTabs,
  openingStockDateError,
  rowsForTab,
  rowsToApply,
  type ImportRow,
  type ImportSummary,
} from '../inventoryImportModel';

const summary = (over: Partial<ImportSummary> = {}): ImportSummary => ({
  totalRows: 5,
  create: 2,
  update: 1,
  unchanged: 0,
  error: 2,
  withWarnings: 1,
  openingStock: { items: 1, quantity: 4, value: 34000, confirmValue: '34000.0000' },
  ...over,
});

const row = (rowNumber: number, action: ImportRow['action']): ImportRow => ({
  rowNumber,
  sku: `S${rowNumber}`,
  name: `Item ${rowNumber}`,
  action,
  itemId: null,
  changes: [],
  openingStock: null,
  errors: [],
  warnings: [],
});

describe('inventoryImportModel', () => {
  it('shows All plus only the tabs that have rows', () => {
    expect(importTabs(summary())).toEqual([
      { key: 'all', label: 'All', count: 5 },
      { key: 'create', label: 'New', count: 2 },
      { key: 'update', label: 'Updates', count: 1 },
      { key: 'error', label: 'Problems', count: 2 },
    ]);
  });

  it('filters rows by tab', () => {
    const rows = [row(2, 'create'), row(3, 'error'), row(4, 'create')];
    expect(rowsForTab(rows, 'all')).toHaveLength(3);
    expect(rowsForTab(rows, 'create').map(r => r.rowNumber)).toEqual([2, 4]);
    expect(rowsForTab(rows, 'unchanged')).toEqual([]);
  });

  it('counts only rows the commit would write', () => {
    expect(rowsToApply(summary())).toBe(3);
    expect(commitLabel(summary())).toBe('Import 3 items');
    expect(commitLabel(summary({ create: 1, update: 0 }))).toBe('Import 1 item');
  });

  describe('openingStockDateError', () => {
    it('accepts today and the past', () => {
      expect(openingStockDateError('2026-10-21', '2026-10-21', null)).toBeNull();
      expect(openingStockDateError('2026-01-01', '2026-10-21', null)).toBeNull();
    });

    it('refuses the future, a closed period and a blank', () => {
      expect(openingStockDateError('2026-10-22', '2026-10-21', null)).toMatch(/future/);
      expect(openingStockDateError('2026-06-30', '2026-10-21', '2026-06-30')).toMatch(/closed through 2026-06-30/);
      expect(openingStockDateError('', '2026-10-21', null)).toBe('Choose a date.');
    });
  });

  it('summarises what a commit did', () => {
    const applied = {
      created: 2,
      updated: 1,
      openingStockItems: 1,
      openingStockValue: 34000,
      openingStockDate: '2026-10-21',
      journalReference: 'JE-9',
    };
    expect(appliedSummary(applied)).toBe('2 added, 1 updated');
    expect(appliedSummary({ ...applied, created: 0, updated: 0 })).toBe('Nothing needed changing');
  });
});
