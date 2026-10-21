// The preview/commit answer as the API sends it (decimals as strings, inside
// the { success, data } envelope) → the screen's ImportResult. The opening
// stock total must survive VERBATIM: the commit sends it back as the owner's
// confirmation and the server compares it exactly.
import { inventoryImportSerializer } from '../inventoryImportSerializer';
import { mapInventoryItem } from '../inventorySerializer';

const envelope: any = {
  success: true,
  data: {
    fileName: 'items.xlsx',
    sheetName: 'Items',
    columns: { recognized: ['SKU', 'Name'], ignored: ['Colour'] },
    role: 'admin',
    openingStockAllowed: true,
    booksLockedUntil: '2026-06-30',
    summary: {
      totalRows: 2,
      create: 1,
      update: 0,
      unchanged: 0,
      error: 1,
      withWarnings: 0,
      openingStock: { items: 1, quantity: '4', value: '34000.1234' },
    },
    rows: [
      {
        rowNumber: 2,
        sku: 'CHR-1',
        name: 'Chair',
        action: 'create',
        itemId: null,
        changes: [{ field: 'name', label: 'Name', from: null, to: 'Chair' }],
        openingStock: { quantity: '4', unitCost: '8500.0309', value: '34000.1234' },
        errors: [],
        warnings: [],
      },
      { rowNumber: 3, sku: '', name: '', action: 'error', errors: ['SKU is required.'] },
    ],
  },
};

describe('inventoryImportSerializer', () => {
  it('maps the envelope to the screen model', () => {
    const r = inventoryImportSerializer(envelope);
    expect(r).toMatchObject({
      fileName: 'items.xlsx',
      ignoredColumns: ['Colour'],
      openingStockAllowed: true,
      booksLockedUntil: '2026-06-30',
      summary: { totalRows: 2, create: 1, error: 1, openingStock: { items: 1, quantity: 4, value: 34000.1234 } },
      applied: null,
    });
    expect(r.rows[0].openingStock).toEqual({ quantity: 4, unitCost: 8500.0309, value: 34000.1234 });
    expect(r.rows[1]).toMatchObject({ action: 'error', errors: ['SKU is required.'], changes: [], warnings: [] });
  });

  it('keeps the opening stock value exactly as the server wrote it', () => {
    expect(inventoryImportSerializer(envelope).summary.openingStock.confirmValue).toBe('34000.1234');
  });

  it('reads the applied block of a commit', () => {
    const r = inventoryImportSerializer({
      data: {
        ...envelope.data,
        applied: { created: 1, updated: 0, openingStockItems: 1, openingStockValue: '34000.1234', openingStockDate: '2026-10-21', journalReference: 'JE-12' },
      },
    });
    expect(r.applied).toEqual({
      created: 1,
      updated: 0,
      openingStockItems: 1,
      openingStockValue: 34000.1234,
      openingStockDate: '2026-10-21',
      journalReference: 'JE-12',
    });
  });

  it('treats an unknown action as a problem, never as a write', () => {
    const r = inventoryImportSerializer({ data: { summary: {}, rows: [{ rowNumber: 2, action: 'delete' }] } });
    expect(r.rows[0].action).toBe('error');
  });
});

describe('mapInventoryItem photo links', () => {
  it('carries both signed links, and empty strings when there is no photo', () => {
    expect(
      mapInventoryItem({ id: 'i1', imageUrl: 'https://api/x/display.jpg?sig=a', thumbnailUrl: 'https://api/x/thumb.jpg?sig=b' }),
    ).toMatchObject({ imageUrl: 'https://api/x/display.jpg?sig=a', thumbnailUrl: 'https://api/x/thumb.jpg?sig=b' });
    expect(mapInventoryItem({ id: 'i1', imageUrl: null, thumbnailUrl: null })).toMatchObject({
      imageUrl: '',
      thumbnailUrl: '',
    });
  });
});
