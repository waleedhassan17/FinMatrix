// The Day Summary's pure parts: the serializer, the comparisons, where a row
// opens, what needs a look, and the share text and PDF built from them.
jest.mock('../../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), put: jest.fn() },
  extractErrorMessage: jest.fn(),
}));
import {
  attentionItems,
  busiestHour,
  dayBookChips,
  dayChange,
  dayReportDoc,
  dayShareText,
  entryTarget,
  hourLabel,
  hourTick,
  hourWindow,
  relativeDayName,
  shiftDay,
} from '../../../../models/daySummaryModel';
import {
  dayEntriesSerializer,
  daySummarySerializer,
  dayScheduleSerializer,
} from '../../../../serializers/daySummarySerializer';
import { dayEntriesPage, daySummaryOwner, daySummaryStaff } from '../__fixtures__/daySummary';

const owner = daySummarySerializer({ success: true, data: daySummaryOwner });

describe('day summary serializer', () => {
  it('unwraps the envelope and reads decimal strings as numbers', () => {
    expect(owner.date).toBe('2026-11-19');
    expect(owner.headline.sales.total).toBe(245000);
    expect(owner.team).toHaveLength(2);
    expect(owner.attention.voided).toEqual({ count: 1, total: 5000 });
  });

  it('keeps the owner-only parts null for staff, not zero', () => {
    const staff = daySummarySerializer(daySummaryStaff);
    expect(staff.scope.ownOnly).toBe(true);
    expect(staff.team).toBeNull();
    expect(staff.profit).toBeNull();
    expect(staff.attention.voided).toBeNull();
  });

  it('reads the Day Book and the schedule defensively', () => {
    const page = dayEntriesSerializer({ success: true, data: dayEntriesPage });
    expect(page.items).toHaveLength(2);
    expect(page.items[1].backdated).toBe(true);
    expect(dayScheduleSerializer({ enabled: true, hour: 99 })).toMatchObject({ enabled: true, hour: 21, email: true });
  });
});

describe('days', () => {
  it('steps calendar days in local time', () => {
    expect(shiftDay('2026-11-01', -1)).toBe('2026-10-31');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('names the day relative to today', () => {
    expect(relativeDayName('2026-11-19', '2026-11-19')).toBe('Today');
    expect(relativeDayName('2026-11-18', '2026-11-19')).toBe('Yesterday');
    expect(relativeDayName('2026-11-16', '2026-11-19')).toBe('Monday');
  });
});

describe('dayChange', () => {
  it('is the % move against the comparison day', () => {
    expect(dayChange(245000, 200000)).toEqual({ text: '+23%', up: true });
    expect(dayChange(50, 100)).toEqual({ text: '−50%', up: false });
  });
  it('says New after an empty day, and nothing after two', () => {
    expect(dayChange(100, 0)).toEqual({ text: 'New', up: true });
    expect(dayChange(0, 0)).toBeNull();
  });
});

describe('entryTarget', () => {
  const row = { id: 'x1', deleted: false, partyId: 'p1' };
  it('opens each document’s own shared record screen', () => {
    expect(entryTarget({ ...row, kind: 'invoice' })).toEqual({ screen: 'InvoiceDetail', params: { invoiceId: 'x1' } });
    expect(entryTarget({ ...row, kind: 'sales_order' })).toEqual({
      screen: 'SalesOrderDetail',
      params: { salesOrderId: 'x1' },
    });
    expect(entryTarget({ ...row, kind: 'purchase_order' })).toEqual({ screen: 'PODetail', params: { poId: 'x1' } });
  });
  it('opens the party for a receipt or vendor payment, which have no screen of their own', () => {
    expect(entryTarget({ ...row, kind: 'receipt' })).toEqual({ screen: 'CustomerDetail', params: { customerId: 'p1' } });
    expect(entryTarget({ ...row, kind: 'vendor_payment' })).toEqual({ screen: 'VendorDetail', params: { vendorId: 'p1' } });
  });
  it('opens nothing for a deleted document', () => {
    expect(entryTarget({ ...row, kind: 'invoice', deleted: true })).toBeNull();
  });
});

describe('attention', () => {
  it('lists only checks with something in them, each with its Day Book filter', () => {
    expect(attentionItems(owner).map(a => a.filter)).toEqual(['backdated', 'drafts', 'voided']);
  });
});

describe('sharing', () => {
  it('writes the WhatsApp text from the same figures', () => {
    const text = dayShareText(owner, 'Acme Traders');
    expect(text).toContain('*Acme Traders — Thu 19 Nov*');
    expect(text).toContain('Sales: Rs 245,000.00 (12 invoices)');
    expect(text).toContain('Orders booked: Rs 70,000.00 (3 sales orders)');
    expect(text).toContain('⚠ 2 back-dated entries');
  });

  it('builds the PDF: headline, documents, money, then the Day Book', () => {
    const entries = dayEntriesSerializer(dayEntriesPage).items;
    const doc = dayReportDoc(owner, entries);
    expect(doc.title).toBe('Day Summary');
    expect(doc.periodLabel).toBe('Thursday, 19 November 2026');
    const headings = doc.rows.filter(r => r.kind === 'heading').map(r => r.label);
    expect(headings).toEqual(['Headline', 'Documents created', 'Money in (received)', 'Money out (paid)', 'Day Book']);
    expect(doc.rows.find(r => r.label === 'Net')?.values[1]).toBe(155000);
    expect(doc.rows[doc.rows.length - 1].label).toContain('dated 2026-11-16');
  });

  it('labels digest hours', () => {
    expect(hourLabel(21)).toBe('9:00 PM');
    expect(hourLabel(8)).toBe('8:00 AM');
  });
});

describe('activity by hour', () => {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    sales: hour === 16 ? 2800 : hour === 22 ? 500 : 0,
    salesCount: 0,
    received: hour === 10 ? 400 : 0,
    receivedCount: 0,
  }));
  it('reads 24 hours, filling those the server left out', () => {
    const s = daySummarySerializer({ ...daySummaryOwner, hourly: [{ hour: 16, sales: '2800.0000', salesCount: 3 }] });
    expect(s.hourly).toHaveLength(24);
    expect(s.hourly[16]).toMatchObject({ sales: 2800, salesCount: 3, received: 0 });
  });
  it('draws the working day, widened to any busy hour, and names the busiest', () => {
    const w = hourWindow(hours);
    expect([w[0].hour, w[w.length - 1].hour]).toEqual([8, 22]);
    expect(busiestHour(hours)?.hour).toBe(16);
    expect(hourTick(16)).toBe('4 PM');
  });
});

describe('Day Book chips', () => {
  it('lists types with something in them, then the groups that need a look', () => {
    const labels = dayBookChips(owner, 'all').map(c => c.label);
    expect(labels).toEqual(['All', 'Invoices', 'Sales orders', 'Receipts', 'Bills', 'Vendor payments', 'Back-dated', 'Drafts', 'Voided']);
  });
  it('keeps the chosen type even when it is empty', () => {
    expect(dayBookChips(owner, 'estimate').map(c => c.filter)).toContain('estimate');
  });
});
