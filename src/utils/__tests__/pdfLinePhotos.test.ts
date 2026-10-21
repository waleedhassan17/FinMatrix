// Item photos on quotation lines: a column only when some line has a photo,
// an empty cell for a line without one, and nothing but our own image data
// URIs ever reaching the HTML.
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn(), printAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: {} }));

import { hasLinePhotos, isSafeImageDataUri, photoCellHtml } from '../pdfLinePhotos';
import { buildEstimateHtml } from '../estimatePdf';
import { buildSalesOrderHtml } from '../salesOrderPdf';
import { estimateForPdf, salesOrderForPdf } from '../documentPdfAdapters';
import type { Estimate as EstimateModel } from '../../models/estimateModel';
import type { SalesOrder as SalesOrderModel } from '../../models/salesOrderModel';

const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';

const estimate: EstimateModel = {
  id: 'e1',
  estimateNumber: 'EST-7',
  customerId: 'c1',
  customerName: 'Ayesha Interiors',
  estimateDate: '2026-10-21',
  expiryDate: null,
  status: 'converted',
  lines: [
    { id: 'l1', itemId: 'sofa', description: 'Three-seater sofa', quantity: 1, unitPrice: 125000, taxRate: 0, lineTotal: 125000 },
    { id: 'l2', itemId: '', description: 'Delivery and fitting', quantity: 1, unitPrice: 5000, taxRate: 0, lineTotal: 5000 },
  ],
  subtotal: 130000,
  discountType: 'none',
  discountValue: 0,
  discountAmount: 0,
  taxAmount: 0,
  total: 130000,
  notes: '',
  convertedToType: 'invoice',
  convertedToId: 'inv1',
};

describe('pdfLinePhotos', () => {
  it('accepts only image data URIs', () => {
    expect(isSafeImageDataUri(JPEG)).toBe(true);
    expect(isSafeImageDataUri('https://evil.test/x.jpg')).toBe(false);
    expect(isSafeImageDataUri('data:image/jpeg;base64,AA"><script>')).toBe(false);
    expect(isSafeImageDataUri('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
  });

  it('renders a cell per line, empty when the line has no photo', () => {
    expect(photoCellHtml({ sofa: JPEG }, 'sofa')).toBe(`<td class="photo"><img src="${JPEG}" alt="" /></td>`);
    expect(photoCellHtml({ sofa: JPEG }, '')).toBe('<td class="photo"></td>');
    expect(photoCellHtml({ sofa: 'javascript:alert(1)' }, 'sofa')).toBe('<td class="photo"></td>');
  });

  it('wants a column only when some line has a usable photo', () => {
    expect(hasLinePhotos({ sofa: JPEG }, ['sofa', ''])).toBe(true);
    expect(hasLinePhotos({}, ['sofa'])).toBe(false);
    expect(hasLinePhotos(undefined, ['sofa'])).toBe(false);
  });
});

describe('estimate PDF with photos', () => {
  it('puts the photo beside its line and leaves the service line blank', () => {
    const html = buildEstimateHtml({ estimate: estimateForPdf(estimate), photos: { sofa: JPEG } });
    expect(html).toContain('<th class="photo"></th>');
    expect(html.match(/<td class="photo">/g)).toHaveLength(2);
    expect(html).toContain(`<img src="${JPEG}"`);
  });

  it('has no photo column when no line has a photo', () => {
    const html = buildEstimateHtml({ estimate: estimateForPdf(estimate) });
    expect(html).not.toContain('class="photo"');
  });

  it('reads a converted estimate as accepted and omits a missing expiry', () => {
    const html = buildEstimateHtml({ estimate: estimateForPdf(estimate) });
    expect(html).toContain('ACCEPTED');
    expect(html).not.toContain('Invalid Date');
    expect(html).not.toContain('valid until');
  });
});

describe('sales order PDF from the screen model', () => {
  const order: SalesOrderModel = {
    id: 'so1',
    orderNumber: 'SO-3',
    customerId: 'c1',
    customerName: 'Ayesha Interiors',
    orderDate: '2026-10-21',
    expectedDate: null,
    status: 'partial',
    lines: [
      { id: 'l1', itemId: 'sofa', description: 'Three-seater sofa', quantity: 2, quantityFulfilled: 1, unitPrice: 125000, taxRate: 0, lineTotal: 250000 },
    ],
    subtotal: 250000,
    discountType: 'none',
    discountValue: 0,
    discountAmount: 0,
    taxAmount: 0,
    total: 250000,
    notes: '',
    invoiceId: null,
  };

  it('maps number, status and fulfilment, and shows the photo', () => {
    const pdf = salesOrderForPdf(order);
    expect(pdf).toMatchObject({ soNumber: 'SO-3', status: 'partially_fulfilled', expectedDate: '' });
    expect(pdf.lines[0]).toMatchObject({ amount: 250000, fulfilledQuantity: 1, itemId: 'sofa' });
    const html = buildSalesOrderHtml({ salesOrder: pdf, photos: { sofa: JPEG } });
    expect(html).toContain('SO-3');
    expect(html).toContain(`<img src="${JPEG}"`);
    expect(html).not.toContain('Invalid Date');
  });
});
