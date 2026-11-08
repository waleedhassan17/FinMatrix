import { attentionItems, overdueInvoiceCount, toAttentionItem } from '../attentionItems';
import type { DashboardAlert } from '../../../models/dashboardModel';

const overdue = (count?: number, amount?: number): DashboardAlert => ({
  id: 'overdue', severity: 'red', message: 'x', count, amount,
});
const delivery = (count?: number): DashboardAlert => ({
  id: 'pending_delivery', severity: 'blue', message: 'x', count,
});
const bills = (amount?: number): DashboardAlert => ({
  id: 'pending_bills',
  severity: 'amber',
  message: 'You have pending bills totalling Rs 4,000.',
  amount,
});

describe('toAttentionItem', () => {
  it('names one overdue invoice in the singular and links to AR aging', () => {
    const item = toAttentionItem(overdue(1, 12400));
    expect(item.title).toBe('1 overdue invoice');
    expect(item.detail).toBe('Rs 12,400.00 past due');
    expect(item.tone).toBe('neg');
    expect(item.route).toBe('ARAging');
  });

  it('pluralises overdue invoices, and words the detail without an amount', () => {
    const item = toAttentionItem(overdue(3));
    expect(item.title).toBe('3 overdue invoices');
    expect(item.detail).toBe('Past their due date');
  });

  it('still makes a readable row when the count is unknown', () => {
    expect(toAttentionItem(overdue()).title).toBe('Overdue invoices');
    expect(toAttentionItem(delivery()).title).toBe('Deliveries to assign');
  });

  it('words deliveries to assign and links to the delivery monitor', () => {
    expect(toAttentionItem(delivery(1)).title).toBe('1 delivery to assign');
    const item = toAttentionItem(delivery(5));
    expect(item.title).toBe('5 deliveries to assign');
    expect(item.detail).toBe('Waiting for a rider');
    expect(item.tone).toBe('info');
    expect(item.route).toBe('DeliveryMonitor');
  });

  it('shows unpaid bills by amount, falling back to the server sentence', () => {
    expect(toAttentionItem(bills(12400)).detail).toBe('Rs 12,400.00 owed to suppliers');
    expect(toAttentionItem(bills()).detail).toBe('You have pending bills totalling Rs 4,000.');
    expect(toAttentionItem(bills()).route).toBe('APAging');
    expect(toAttentionItem(bills()).tone).toBe('warn');
  });

  it('keeps the server sentence for an id it does not know, with no link', () => {
    const item = toAttentionItem({ id: 'stock_low', severity: 'amber', message: '4 items are low on stock.' });
    expect(item.title).toBe('4 items are low on stock.');
    expect(item.route).toBeUndefined();
  });

  it('never prints "(s)"', () => {
    for (const a of [overdue(1), overdue(2), delivery(1), delivery(9), bills(1)]) {
      expect(toAttentionItem(a).title).not.toMatch(/\(s\)/);
    }
  });
});

describe('attentionItems', () => {
  const all = [overdue(1), bills(10), delivery(5)];

  it('keeps every item, in order, when deliveries are visible', () => {
    expect(attentionItems(all, { showDelivery: true }).map(i => i.id)).toEqual([
      'overdue', 'pending_bills', 'pending_delivery',
    ]);
  });

  it('drops deliveries for a company that cannot see them', () => {
    expect(attentionItems(all, { showDelivery: false }).map(i => i.id)).toEqual(['overdue', 'pending_bills']);
  });
});

describe('overdueInvoiceCount', () => {
  it('reads the overdue alert count, or 0 without one', () => {
    expect(overdueInvoiceCount([bills(1), overdue(4)])).toBe(4);
    expect(overdueInvoiceCount([bills(1)])).toBe(0);
    expect(overdueInvoiceCount([overdue()])).toBe(0);
  });
});
