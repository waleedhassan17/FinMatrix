// ═══════════════════════════════════════════════════════
// FinMatrix — Invoice Network (Dummy API)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { invoices as seedInvoices } from '../dummy-data/invoices';
import type { Invoice } from '../types';

let invoiceStore: Invoice[] = [...seedInvoices.map(i => ({ ...i, lines: i.lines.map(l => ({ ...l })) }))];

export const getInvoicesAPI = async (): Promise<Invoice[]> =>
  simulateApiCall(invoiceStore.map(i => ({ ...i, lines: i.lines.map(l => ({ ...l })) })), 800);

export const getInvoiceByIdAPI = async (id: string): Promise<Invoice> => {
  const invoice = invoiceStore.find(i => i.id === id);
  if (!invoice) throw new Error('Invoice not found');
  return simulateApiCall({ ...invoice, lines: invoice.lines.map(l => ({ ...l })) }, 400);
};

export const createInvoiceAPI = async (
  data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Invoice> => {
  const newInvoice: Invoice = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `inv_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  invoiceStore.push(newInvoice);
  return simulateApiCall(newInvoice, 600);
};

export const updateInvoiceAPI = async (
  id: string,
  data: Partial<Invoice>,
): Promise<Invoice> => {
  const idx = invoiceStore.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('Invoice not found');
  invoiceStore[idx] = {
    ...invoiceStore[idx],
    ...data,
    lines: (data.lines ?? invoiceStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ ...invoiceStore[idx], lines: invoiceStore[idx].lines.map(l => ({ ...l })) }, 600);
};

export const deleteInvoiceAPI = async (id: string): Promise<{ success: boolean }> => {
  const idx = invoiceStore.findIndex(i => i.id === id);
  if (idx === -1) throw new Error('Invoice not found');
  invoiceStore.splice(idx, 1);
  return simulateApiCall({ success: true }, 400);
};
