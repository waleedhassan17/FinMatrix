// The outstanding-invoices / payables summary: its words and figures. The
// screen, the PDF and the WhatsApp message all read these, and the website
// says the same — so the wording is pinned, not just the arithmetic.

import {
  MESSAGE_DOCUMENT_LIMIT,
  countLabel,
  hasAnythingOpen,
  headlineFigure,
  lateness,
  normalizeWhatsappPhone,
  summaryFilename,
  summaryMessage,
  summaryMessageLines,
} from '../partySummaryModel';
import { summaryDoc as doc, summaryFixture as fixture } from '../../__fixtures__/partySummary';

const withCredits = (total: number, netDue: number) =>
  fixture({
    credits: {
      total,
      items: [{ kind: 'payment', id: 'p1', reference: 'RCT-9', date: '2026-09-01', amount: total, available: total }],
    },
    netDue,
  });

describe('lateness', () => {
  it('reads the signed days the way a person would say them', () => {
    expect(lateness(45)).toBe('45 days overdue');
    expect(lateness(1)).toBe('1 day overdue');
    expect(lateness(0)).toBe('Due today');
    expect(lateness(-1)).toBe('Due in 1 day');
    expect(lateness(-20)).toBe('Due in 20 days');
  });
});

describe('countLabel', () => {
  it('names invoices for a customer and bills for a vendor', () => {
    expect(countLabel(1, 'customer')).toBe('1 invoice');
    expect(countLabel(3, 'vendor')).toBe('3 bills');
  });
});

describe('headlineFigure', () => {
  it('asks for everything open when there are no credits', () => {
    expect(headlineFigure(fixture())).toEqual({ label: 'Total due', value: 1300 });
  });

  it('asks for the net figure once credits come off', () => {
    expect(headlineFigure(withCredits(400, 900))).toEqual({ label: 'Total due', value: 900 });
  });

  it('turns around rather than printing a negative amount due', () => {
    expect(headlineFigure(withCredits(1500, -200))).toEqual({ label: 'Credit in your favour', value: 200 });
  });

  it('speaks of what is payable on the vendor side', () => {
    expect(headlineFigure(fixture({ partyType: 'vendor' })).label).toBe('Total payable');
  });
});

describe('hasAnythingOpen', () => {
  it('is false only when there is neither a document nor a credit', () => {
    expect(hasAnythingOpen(fixture())).toBe(true);
    expect(hasAnythingOpen(fixture({ documents: [] }))).toBe(false);
    expect(hasAnythingOpen({ ...withCredits(50, -50), documents: [] })).toBe(true);
  });
});

describe('the WhatsApp message', () => {
  it('stands on its own: every document, what is due, what is overdue', () => {
    expect(summaryMessage(fixture(), 'Warehouse Co')).toBe(
      [
        'Dear Acme Traders,',
        '',
        'Here is a summary of your unpaid invoices with Warehouse Co as of Sep 28, 2026:',
        '',
        'INV-1 · due Aug 14, 2026 · Rs 1,000.00 · 45 days overdue',
        'INV-2 · due Aug 14, 2026 · Rs 300.00',
        '',
        'Total due: Rs 1,300.00',
        'Overdue: Rs 1,000.00',
        '',
        'The full summary is attached as a PDF.',
        '',
        'Regards,',
        'Warehouse Co',
      ].join('\n'),
    );
  });

  it('shows credits coming off before the figure to pay', () => {
    const text = summaryMessage(withCredits(400, 900), 'Warehouse Co');
    expect(text).toContain('Total outstanding: Rs 1,300.00\nLess credits: Rs 400.00\nTotal due: Rs 900.00');
  });

  it('lists ten documents, then points to the PDF for the rest', () => {
    const many = Array.from({ length: 13 }, (_, i) => doc(i + 1, 10, 100));
    const lines = summaryMessageLines(fixture({ documents: many }));
    expect(lines).toHaveLength(MESSAGE_DOCUMENT_LIMIT + 1);
    expect(lines[lines.length - 1]).toBe('…and 3 more in the attached PDF');
  });

  it('writes to a vendor as the one who owes', () => {
    const text = summaryMessage(fixture({ partyType: 'vendor' }), 'Warehouse Co');
    expect(text).toContain('Here is a summary of the bills we have open with you as of Sep 28, 2026:');
    expect(text).toContain('Total payable: Rs 1,300.00');
  });
});

describe('normalizeWhatsappPhone', () => {
  it('puts Pakistani local numbers into country-code form', () => {
    expect(normalizeWhatsappPhone('0300 1234567')).toBe('923001234567');
    expect(normalizeWhatsappPhone('0300-1234567')).toBe('923001234567');
    expect(normalizeWhatsappPhone('3001234567')).toBe('923001234567');
    expect(normalizeWhatsappPhone('+92 300 1234567')).toBe('923001234567');
    expect(normalizeWhatsappPhone('0092 300 1234567')).toBe('923001234567');
  });

  it('drops what cannot be a number rather than guessing', () => {
    expect(normalizeWhatsappPhone('')).toBeNull();
    expect(normalizeWhatsappPhone(undefined)).toBeNull();
    expect(normalizeWhatsappPhone('12345')).toBeNull();
  });
});

describe('summaryFilename', () => {
  it('names the file for what it is, safely', () => {
    expect(summaryFilename(fixture())).toBe('Outstanding_invoices_Acme_Traders_2026-09-28.pdf');
    expect(summaryFilename(fixture({ partyType: 'vendor', party: { ...fixture().party, name: 'Habib / Oil: Mills' } }))).toBe(
      'Payables_summary_Habib_Oil_Mills_2026-09-28.pdf',
    );
  });
});
