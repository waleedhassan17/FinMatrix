jest.mock('../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

import { datedValuationSerializer, inventoryHealthSerializer } from '../inventoryHealthSerializer';
import { ledgerTies } from '../../models/inventoryHealthModel';
import v2 from './fixtures/inventoryHealth.v2.json';

describe('inventoryHealthSerializer', () => {
  const h = inventoryHealthSerializer(v2)!;

  it('reads reorder, aging, dead stock, locations and totals', () => {
    expect(h.belowReorder[0]).toMatchObject({ qtyOnHand: 4, suggestedOrderQty: 50, stockValue: 40 });
    expect(h.aging.byLastInbound.map(b => b.key)).toEqual(['d0_30', 'd31_90', 'd91_180', 'd180_plus', 'noMovement']);
    expect(h.deadStock).toMatchObject({ thresholdDays: 180, totalValue: 500 });
    expect(h.byLocation[1].location).toBe('Unassigned');
    expect(h.totals?.valuationTotal).toBe(2000);
  });

  it('reads turnover and DIO as KPIs', () => {
    expect(h.turnover).toMatchObject({ key: 'inventoryTurnover', unit: 'ratio', value: 4.2 });
    expect(h.dio).toMatchObject({ key: 'dio12', unit: 'days', value: 86.9 });
  });

  it('is empty, not broken, for a partial payload', () => {
    const p = inventoryHealthSerializer({ success: true, data: { asOfDate: '2026-10-26' } })!;
    expect(p.belowReorder).toEqual([]);
    expect(p.deadStock.items).toEqual([]);
    expect(p.turnover).toBeNull();
    expect(inventoryHealthSerializer(null)).toBeNull();
  });
});

describe('datedValuationSerializer', () => {
  it('keeps an unvalued item unvalued, and reads the tie and coverage', () => {
    const d = datedValuationSerializer({
      asOfDate: '2026-06-30',
      rows: [
        { itemId: 'a', itemName: 'A', sku: 'A', category: 'X', qty: '2', cost: '5', value: '10', valueKnown: true },
        { itemId: 'b', itemName: 'B', sku: 'B', category: 'X', qty: 3, cost: null, value: null, valueKnown: false },
      ],
      byCategory: [{ category: 'X', totalValue: 10 }],
      totalValue: 10,
      coverage: { movements: 10, valued: 8, pct: 80, unvaluedItems: 1 },
      ledgerTie: { gl1200: 12.5, valuation: 10, gap: 2.5, includesGoodsInTransit: false },
    })!;
    expect(d.rows[0]).toMatchObject({ qty: 2, value: 10, valueKnown: true });
    expect(d.rows[1]).toMatchObject({ value: null, cost: null, valueKnown: false });
    expect(d.coverage?.pct).toBe(80);
    expect(ledgerTies(d.ledgerTie)).toBe(false);
    expect(ledgerTies({ gl1200: 10, valuation: 10, gap: 0, includesGoodsInTransit: false })).toBe(true);
    expect(ledgerTies(null)).toBeNull();
  });
});
