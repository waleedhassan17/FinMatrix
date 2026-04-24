// ═══════════════════════════════════════════════════════
// FinMatrix — Invoice Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/invoices
// When backend (NestJS) is ready, replace dummy logic with
// real axios/fetch calls. Only the function bodies change;
// the exported signatures stay the same.

import { simulateApiCall, API_BASE_URL } from './apiHelpers';
import { invoices as seedInvoices } from '../dummy-data/invoices';
import type {
  InvoiceApiEntity,
  InvoiceApiPagination,
  InvoiceQueryParams,
} from '../models/invoiceModel';
import type { Invoice } from '../types';

// ─── In-memory store (session persistence) ───────────
let invoiceStore: InvoiceApiEntity[] = seedInvoices.map(i => ({
  ...i,
  lines: i.lines.map(l => ({ ...l })),
}));

// ─── Standard API response envelope ──────────────────
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ═══════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/invoices
 *
 * ★ REAL API:
 * const response = await axios.get(`${API_BASE_URL}/v1/invoices`, { params });
 * return response.data;
 */
export const getInvoicesAPI = async (
  params: InvoiceQueryParams = {},
): Promise<any> => {
  let filtered = invoiceStore.map(i => ({ ...i, lines: i.lines.map(l => ({ ...l })) }));

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      i =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q),
    );
  }
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter(i => i.status === params.status);
  }
  if (params.customerId) {
    filtered = filtered.filter(i => i.customerId === params.customerId);
  }
  if (params.fromDate) {
    filtered = filtered.filter(i => i.issueDate >= params.fromDate!);
  }
  if (params.toDate) {
    filtered = filtered.filter(i => i.issueDate <= params.toDate!);
  }

  const page = params.page || 1;
  const limit = params.limit || 200;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  const pagination: InvoiceApiPagination = {
    page,
    limit,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / limit) || 1,
  };

  const response: ApiEnvelope<{
    invoices: InvoiceApiEntity[];
    pagination: InvoiceApiPagination;
  }> = {
    success: true,
    data: { invoices: paged, pagination },
  };

  return simulateApiCall(response, 800);
};

/**
 * GET /api/v1/invoices/:id
 */
export const getInvoiceByIdAPI = async (id: string): Promise<any> => {
  const invoice = invoiceStore.find(i => i.id === id);
  if (!invoice) throw new Error('Invoice not found');
  return simulateApiCall(
    {
      success: true,
      data: { invoice: { ...invoice, lines: invoice.lines.map(l => ({ ...l })) } },
    },
    400,
  );
};

/**
 * POST /api/v1/invoices
 */
export const createInvoiceAPI = async (
  data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<any> => {
  const newInvoice: InvoiceApiEntity = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `inv_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  invoiceStore.push(newInvoice);
  return simulateApiCall(
    { success: true, data: { invoice: { ...newInvoice, lines: newInvoice.lines.map(l => ({ ...l })) } } },
    600,
  );
};

/**
 * PUT /api/v1/invoices/:id
 */
export const updateInvoiceAPI = async (
  id: string,
  data: Partial<Invoice>,
): Promise<any> => {
  const idx = invoiceStore.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('Invoice not found');
  invoiceStore[idx] = {
    ...invoiceStore[idx],
    ...data,
    lines: (data.lines ?? invoiceStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  } as InvoiceApiEntity;
  return simulateApiCall(
    {
      success: true,
      data: {
        invoice: {
          ...invoiceStore[idx],
          lines: invoiceStore[idx].lines.map(l => ({ ...l })),
        },
      },
    },
    600,
  );
};

/**
 * DELETE /api/v1/invoices/:id
 */
export const deleteInvoiceAPI = async (id: string): Promise<any> => {
  const idx = invoiceStore.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('Invoice not found');
  invoiceStore.splice(idx, 1);
  return simulateApiCall({ success: true, data: { id } }, 400);
};

/**
 * POST /api/v1/invoices/:id/send
 *
 * Records that an invoice was sent to the customer (via
 * WhatsApp / email / generic share). The real backend would
 * additionally enqueue a notification / audit log entry.
 *
 * ★ REAL API:
 * const response = await axios.post(
 *   `${API_BASE_URL}/v1/invoices/${id}/send`,
 *   { channel, toPhone },
 * );
 * return response.data;
 */
export const sendInvoiceAPI = async (
  id: string,
  meta: { channel: 'whatsapp' | 'email' | 'share'; toPhone?: string },
): Promise<any> => {
  const idx = invoiceStore.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('Invoice not found');

  // If the invoice is still a draft, transition to "sent" automatically
  // (mirrors what QuickBooks / Zoho do on first share).
  const nextStatus = invoiceStore[idx].status === 'draft'
    ? 'sent'
    : invoiceStore[idx].status;

  invoiceStore[idx] = {
    ...invoiceStore[idx],
    status: nextStatus,
    sentAt: new Date().toISOString(),
    sentChannel: meta.channel,
    sentToPhone: meta.toPhone,
    updatedAt: new Date().toISOString(),
  };

  return simulateApiCall(
    {
      success: true,
      data: {
        invoice: {
          ...invoiceStore[idx],
          lines: invoiceStore[idx].lines.map(l => ({ ...l })),
        },
      },
    },
    400,
  );
};

// Keep reference to silence unused import warning in some configs
void API_BASE_URL;
