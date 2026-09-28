// The document a customer receives. What must hold: it escapes whatever a
// user typed into a name, it foots, and it shows credits and the net figure
// only when there are credits — the same rules as the website's PDF.

import { buildPartySummaryHtml } from '../partySummaryHtml';
import { summaryFixture as fixture } from '../../__fixtures__/partySummary';

const company = { name: 'Warehouse Co', addressLine1: '1 Mall Road', addressLine2: 'Lahore', phone: '042 111', email: 'hello@wh.pk' };
const at = new Date(2026, 8, 28, 16, 27);

describe('buildPartySummaryHtml', () => {
  const html = buildPartySummaryHtml(fixture(), company, at);

  it('is titled for the customer, on the company letterhead, as of the day', () => {
    expect(html).toContain('<h1>Outstanding invoices</h1>');
    expect(html).toContain('As of Sep 28, 2026');
    expect(html).toContain('Warehouse Co');
    expect(html).toContain('Prepared for');
    expect(html).toContain('Acme Traders');
    expect(html).toContain('Net 30');
  });

  it('lists each unpaid invoice with how late it is, and foots', () => {
    expect(html).toContain('INV-1');
    expect(html).toContain('45 days overdue');
    expect(html).toContain('Due in 20 days');
    // Total row: amount 1,500.00, paid 200.00, balance 1,300.00.
    expect(html).toMatch(/2 invoices<\/td>\s*<td class="num">1,500\.00<\/td>\s*<td class="num">200\.00<\/td>\s*<td class="num">1,300\.00<\/td>/);
    // Nothing paid on INV-1 reads as a dash, not 0.00.
    expect(html).toMatch(/<td class="num">1,000\.00<\/td>\s*<td class="num">—<\/td>/);
  });

  it('asks for the total due with no credits block when there are none', () => {
    expect(html).toContain('Total due');
    expect(html).not.toContain('Unapplied credits');
    expect(html).not.toContain('Less credits');
  });

  it('nets credits off when there are some', () => {
    const credited = buildPartySummaryHtml(
      fixture({
        credits: {
          total: 400,
          items: [{ kind: 'payment', id: 'p1', reference: 'RCT-9', date: '2026-09-01', amount: 500, available: 400 }],
        },
        netDue: 900,
      }),
      company,
      at,
    );
    expect(credited).toContain('Unapplied credits');
    expect(credited).toContain('Unapplied payment');
    expect(credited).toContain('Less credits');
    expect(credited).toContain('Rs 900.00');
  });

  it('prints the aging strip, zero buckets as dashes', () => {
    expect(html).toContain('Aging · days overdue');
    expect(html).toMatch(/<td class="num">300\.00<\/td><td class="num">—<\/td><td class="num">1,000\.00<\/td>/);
  });

  it('escapes whatever was typed into a name', () => {
    const hostile = buildPartySummaryHtml(
      fixture({ party: { ...fixture().party, name: '<script>alert(1)</script> & Co' } }),
      company,
      at,
    );
    expect(hostile).not.toContain('<script>alert(1)</script>');
    expect(hostile).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; Co');
  });

  it('speaks of bills and what is payable for a vendor', () => {
    const vendor = buildPartySummaryHtml(fixture({ partyType: 'vendor' }), company, at);
    expect(vendor).toContain('<h1>Payables summary</h1>');
    expect(vendor).toContain('Payable to');
    expect(vendor).toContain('Unpaid bills');
    expect(vendor).toContain('Total payable');
  });
});
