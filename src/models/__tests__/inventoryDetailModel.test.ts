import {
  canSetOpeningStock,
  itemStockStatus,
  marginAtAverageCost,
  onOrderForItem,
  openingStockQuantity,
  validateOpeningStock,
} from '../inventoryModel';

describe('itemStockStatus', () => {
  it('is out with nothing left, low at or below the reorder point, in otherwise', () => {
    expect(itemStockStatus({ quantityOnHand: 0, reorderPoint: 5 })).toBe('out_of_stock');
    expect(itemStockStatus({ quantityOnHand: -2, reorderPoint: 5 })).toBe('out_of_stock');
    expect(itemStockStatus({ quantityOnHand: 5, reorderPoint: 5 })).toBe('low_stock');
    expect(itemStockStatus({ quantityOnHand: 6, reorderPoint: 5 })).toBe('in_stock');
  });
});

describe('onOrderForItem', () => {
  const line = (itemId: string, quantity: number, receivedQuantity = 0) => ({ itemId, quantity, receivedQuantity });

  it('counts what is still to arrive on open orders, for this item only', () => {
    const orders = [
      { status: 'sent', lines: [line('A', 10), line('B', 99)] },
      { status: 'partially_received', lines: [line('A', 8, 3)] },
    ];
    expect(onOrderForItem(orders, 'A')).toEqual({ quantity: 15, orders: 2 });
  });

  it('ignores drafts, received and closed orders', () => {
    const orders = [
      { status: 'draft', lines: [line('A', 10)] },
      { status: 'fully_received', lines: [line('A', 10, 10)] },
      { status: 'closed', lines: [line('A', 10, 4)] },
    ];
    expect(onOrderForItem(orders, 'A')).toEqual({ quantity: 0, orders: 0 });
  });

  it('does not count an order whose lines for the item are all in', () => {
    expect(onOrderForItem([{ status: 'partially_received', lines: [line('A', 5, 5)] }], 'A')).toEqual({
      quantity: 0,
      orders: 0,
    });
  });

  it('keeps fractional quantities clean', () => {
    const orders = [
      { status: 'sent', lines: [line('A', 0.1)] },
      { status: 'sent', lines: [line('A', 0.2)] },
    ];
    expect(onOrderForItem(orders, 'A').quantity).toBe(0.3);
  });
});

describe('opening stock', () => {
  it('is offered only while the item has never moved', () => {
    expect(canSetOpeningStock({ quantityOnHand: 0 }, 0)).toBe(true);
    expect(canSetOpeningStock({ quantityOnHand: 0 }, 3)).toBe(false);
    expect(canSetOpeningStock({ quantityOnHand: 4 }, 0)).toBe(false);
  });

  it('reads a typed quantity, separators and all', () => {
    expect(openingStockQuantity('1,250')).toBe('1250');
    expect(openingStockQuantity(' 2.5 ')).toBe('2.5');
    expect(openingStockQuantity('2.12345')).toBeNull();
    expect(openingStockQuantity('abc')).toBeNull();
  });

  const today = '2026-11-09';

  it('accepts a positive quantity, a past date and a costed item', () => {
    expect(validateOpeningStock({ quantity: '40', asOfDate: '2026-11-01' }, 2500, today)).toEqual({});
  });

  it('names every problem', () => {
    const errors = validateOpeningStock({ quantity: '0', asOfDate: '2026-12-01' }, 0, today);
    expect(Object.keys(errors).sort()).toEqual(['asOfDate', 'quantity', 'unitCost']);
  });

  it('wants a date', () => {
    expect(validateOpeningStock({ quantity: '1', asOfDate: '' }, 10, today).asOfDate).toBeDefined();
  });
});

describe('marginAtAverageCost', () => {
  // The website's figure: 12,000 against a 10,000 cost keeps 16.7% of the
  // price. The app used to show the markup on cost, 20.0%.
  it('is a share of the price, to one decimal', () => {
    expect(marginAtAverageCost(12000, 10000)).toBe(16.7);
  });

  it('can be negative when selling below cost', () => {
    expect(marginAtAverageCost(800, 1000)).toBe(-25);
  });

  it('is null with no price', () => {
    expect(marginAtAverageCost(0, 1000)).toBeNull();
  });
});
