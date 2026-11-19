import {
  billedNotShipped,
  defaultShipping,
  salesOrderActions,
  salesOrderBarPlan,
  shipmentPayload,
  shippedNotInvoiced,
  type SalesOrder,
  type SalesOrderActions,
  type SalesOrderLine,
} from '../salesOrderModel';
import { salesOrderSingleSerializer } from '../../serializers/salesOrderSerializer';

const line = (id: string, quantity: number, shipped = 0, invoiced = 0): SalesOrderLine => ({
  id,
  itemId: 'item',
  description: `Item ${id}`,
  quantity,
  quantityFulfilled: shipped,
  quantityInvoiced: invoiced,
  toInvoice: Math.max(shipped - invoiced, 0),
  toShip: Math.max(quantity - shipped, 0),
  unitPrice: 100,
  taxRate: 0,
  lineTotal: quantity * 100,
});

const order = (
  status: SalesOrder['status'],
  lines: SalesOrderLine[],
  actions: SalesOrderActions | null = null,
): SalesOrder => ({
  id: 'so1',
  orderNumber: 'SO-1',
  customerId: 'c1',
  customerName: 'Buyer',
  orderDate: '2026-11-18',
  expectedDate: null,
  status,
  lines,
  subtotal: 0,
  discountType: 'none',
  discountValue: 0,
  discountAmount: 0,
  taxAmount: 0,
  total: 0,
  notes: '',
  invoiceId: null,
  invoices: [],
  nextInvoice: null,
  totals: null,
  actions,
  deliveryId: null,
  deliveryReference: null,
});

const serverActions = (overrides: Partial<SalesOrderActions>): SalesOrderActions => ({
  ship: false,
  invoice: false,
  close: false,
  reopen: false,
  cancel: false,
  delete: false,
  edit: false,
  editLines: false,
  ...overrides,
});

/**
 * The reported bug: half an order shipped, the invoice raised, and then no
 * button to ship the rest — every action was hidden once the status read
 * 'invoiced'. The bar now follows the server's `actions`.
 */
describe('salesOrderBarPlan', () => {
  it('half shipped, nothing invoiced: invoice the shipped goods first, ship the rest second', () => {
    const o = order('partial', [line('a', 10, 5)], serverActions({ ship: true, invoice: true, edit: true }));
    expect(salesOrderBarPlan(o)).toEqual({ primary: 'invoice', secondary: 'ship' });
  });

  it('half shipped and invoiced: Record Shipment is still offered for the rest', () => {
    const o = order('partial', [line('a', 10, 5, 5)], serverActions({ ship: true, close: true, edit: true }));
    expect(salesOrderBarPlan(o)).toEqual({ primary: 'ship', secondary: 'edit' });
  });

  it('an old order invoiced in full with goods not delivered can still record the shipment', () => {
    const o = order('invoiced', [line('a', 10, 4, 10)], serverActions({ ship: true }));
    expect(salesOrderBarPlan(o).primary).toBe('ship');
  });

  it('an untouched order ships first; editing sits beside it', () => {
    const o = order('open', [line('a', 10)], serverActions({ ship: true, invoice: true, edit: true, editLines: true, cancel: true, delete: true }));
    expect(salesOrderBarPlan(o)).toEqual({ primary: 'ship', secondary: 'edit' });
  });

  it('a fully invoiced and delivered order offers nothing', () => {
    const o = order('invoiced', [line('a', 10, 10, 10)], serverActions({}));
    expect(salesOrderBarPlan(o)).toEqual({ primary: null, secondary: null });
  });
});

describe('salesOrderActions without the server answer (list rows)', () => {
  it('a closed order only reopens', () => {
    expect(salesOrderActions(order('closed', [line('a', 10, 5, 5)]))).toMatchObject({
      ship: false,
      invoice: false,
      reopen: true,
      cancel: false,
    });
  });

  it('only an untouched order cancels', () => {
    expect(salesOrderActions(order('open', [line('a', 10)])).cancel).toBe(true);
    expect(salesOrderActions(order('partial', [line('a', 10, 5)])).cancel).toBe(false);
  });
});

describe('shipmentPayload', () => {
  it('sends the CUMULATIVE total, only for lines shipping something', () => {
    const lines = [line('a', 10, 3, 3), line('b', 5)];
    expect(shipmentPayload(lines, { a: '2', b: '0' })).toEqual({
      lines: [{ lineId: 'a', quantityFulfilled: '5' }],
      over: [],
    });
  });

  it('flags a line shipping more than is left', () => {
    expect(shipmentPayload([line('a', 10, 8)], { a: '5' }).over).toEqual(['a']);
  });

  it('defaults every line to what is left, services included', () => {
    expect(defaultShipping([line('a', 10, 4), line('b', 2, 2)])).toEqual({ a: '6', b: '0' });
  });
});

describe('what is left on the order', () => {
  it('counts goods billed ahead of delivery and goods shipped but not billed', () => {
    const o = order('partial', [line('a', 10, 4, 10), line('b', 6, 6, 2)]);
    expect(billedNotShipped(o)).toBe(6);
    expect(shippedNotInvoiced(o)).toBe(4);
  });
});

describe('salesOrderSingleSerializer', () => {
  it('maps invoiced quantities, the invoices, the next invoice and the actions', () => {
    const o = salesOrderSingleSerializer({
      success: true,
      data: {
        id: 'so1',
        status: 'partial',
        lines: [{ id: 'l1', quantity: '10.0000', quantityFulfilled: '8.0000', quantityInvoiced: '5.0000', toInvoice: '3.0000', toShip: '2.0000' }],
        invoices: [{ id: 'i1', invoiceNumber: 'INV-2026-0001', invoiceDate: '2026-11-18', total: '500.0000', balance: '500.0000', status: 'sent' }],
        nextInvoice: { mode: 'shipped', isFinal: false, lines: [{ salesOrderLineId: 'l1', description: 'Paint', quantity: '3.0000' }], total: '300.0000' },
        totals: { ordered: '10', shipped: '8', invoiced: '5', toInvoice: '3', toShip: '2', billedNotShipped: '0' },
        actions: { ship: true, invoice: true, close: false, reopen: false, cancel: false, delete: false, edit: true, editLines: false },
        deliveryId: null,
      },
    })!;
    expect(o.lines[0]).toMatchObject({ quantityInvoiced: 5, toInvoice: 3, toShip: 2 });
    expect(o.invoices[0]).toMatchObject({ id: 'i1', total: 500 });
    expect(o.nextInvoice).toMatchObject({ mode: 'shipped', isFinal: false, total: 300 });
    expect(o.totals).toMatchObject({ toInvoice: 3, toShip: 2 });
    expect(o.actions).toMatchObject({ ship: true, close: false });
  });

  it('leaves the detail-only fields empty when the server does not send them', () => {
    const o = salesOrderSingleSerializer({ data: { id: 'so1', status: 'closed', lines: [] } })!;
    expect(o.status).toBe('closed');
    expect(o.invoices).toEqual([]);
    expect(o.nextInvoice).toBeNull();
    expect(o.actions).toBeNull();
  });
});
