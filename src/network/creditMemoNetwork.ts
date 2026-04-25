// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/credit-memos
// Mirrors the GL/Estimate convention: every response is wrapped
// in `{ success, data: { … } }`. When the real NestJS backend is
// wired in, only the function bodies change — signatures stay
// identical.

import { simulateApiCall, API_BASE_URL } from './apiHelpers';
import { creditMemos as seedCreditMemos } from '../dummy-data/creditMemos';
import { updateInvoiceAPI } from './invoiceNetwork';
import type { CreditMemo } from '../types';
import type {
  CreditMemoApiEntity,
  CreditMemoApiPagination,
  CreditMemoQueryParams,
  CreditMemoApplyApiData,
  CreditMemoRefundApiData,
} from '../models/creditMemoModel';

// ─── In-memory store (session-persistent) ────────────
let cmStore: CreditMemoApiEntity[] = seedCreditMemos.map(c => ({
  ...c,
  lines: c.lines.map(l => ({ ...l })),
}));

const cloneEntity = (c: CreditMemoApiEntity): CreditMemoApiEntity => ({
  ...c,
  lines: c.lines.map(l => ({ ...l })),
});

// ─── Standard envelope ───────────────────────────────
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ═══════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/credit-memos
 *
 * ★ REAL API:
 * const r = await axios.get(`${API_BASE_URL}/v1/credit-memos`, { params });
 * return r.data;
 */
export const getCreditMemosAPI = async (
  params: CreditMemoQueryParams = {},
): Promise<any> => {
  let filtered = cmStore.map(cloneEntity);

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      c =>
        c.creditMemoNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        (c.invoiceNumber ?? '').toLowerCase().includes(q),
    );
  }
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter(c => c.status === params.status);
  }
  if (params.customerId) {
    filtered = filtered.filter(c => c.customerId === params.customerId);
  }
  if (params.invoiceId) {
    filtered = filtered.filter(c => c.invoiceId === params.invoiceId);
  }
  if (params.fromDate) {
    filtered = filtered.filter(c => c.issueDate >= params.fromDate!);
  }
  if (params.toDate) {
    filtered = filtered.filter(c => c.issueDate <= params.toDate!);
  }

  // Newest first
  filtered.sort(
    (a, b) =>
      new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime(),
  );

  const page = params.page || 1;
  const limit = params.limit || 200;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  const pagination: CreditMemoApiPagination = {
    page,
    limit,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / limit) || 1,
  };

  const response: ApiEnvelope<{
    creditMemos: CreditMemoApiEntity[];
    pagination: CreditMemoApiPagination;
  }> = {
    success: true,
    data: { creditMemos: paged, pagination },
  };

  return simulateApiCall(response, 800);
};

/**
 * GET /api/v1/credit-memos/:id
 */
export const getCreditMemoByIdAPI = async (id: string): Promise<any> => {
  const cm = cmStore.find(c => c.id === id);
  if (!cm) throw new Error('Credit memo not found');
  return simulateApiCall(
    { success: true, data: { creditMemo: cloneEntity(cm) } },
    400,
  );
};

/**
 * POST /api/v1/credit-memos
 */
export const createCreditMemoAPI = async (
  data: Omit<CreditMemo, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<any> => {
  const newCM: CreditMemoApiEntity = {
    ...data,
    lines: data.lines.map(l => ({ ...l })),
    id: `cm_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  cmStore.push(newCM);
  return simulateApiCall(
    { success: true, data: { creditMemo: cloneEntity(newCM) } },
    600,
  );
};

/**
 * PUT /api/v1/credit-memos/:id
 */
export const updateCreditMemoAPI = async (
  id: string,
  data: Partial<CreditMemo>,
): Promise<any> => {
  const idx = cmStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Credit memo not found');
  cmStore[idx] = {
    ...cmStore[idx],
    ...data,
    lines: (data.lines ?? cmStore[idx].lines).map(l => ({ ...l })),
    updatedAt: new Date().toISOString(),
  } as CreditMemoApiEntity;
  return simulateApiCall(
    { success: true, data: { creditMemo: cloneEntity(cmStore[idx]) } },
    600,
  );
};

/**
 * POST /api/v1/credit-memos/:id/apply
 *
 * Activity diagram: "Apply to other outstanding invoices".
 * The backend (a) reduces the target invoice balance by the
 * applied amount, (b) records the linkage, (c) flips the memo
 * status to 'applied'.
 */
export const applyCreditMemoAPI = async (
  id: string,
  apply: CreditMemoApplyApiData,
): Promise<any> => {
  const idx = cmStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Credit memo not found');

  // Update the invoice's amountPaid (simulated effect on AR)
  try {
    await updateInvoiceAPI(apply.invoiceId, {});
  } catch {
    // Invoice may not exist in the fixture — non-fatal for the dummy backend.
  }

  cmStore[idx] = {
    ...cmStore[idx],
    status: 'applied',
    invoiceId: apply.invoiceId,
    invoiceNumber: apply.invoiceNumber,
    updatedAt: new Date().toISOString(),
  };

  return simulateApiCall(
    { success: true, data: { creditMemo: cloneEntity(cmStore[idx]) } },
    500,
  );
};

/**
 * POST /api/v1/credit-memos/:id/refund
 *
 * Activity diagram: "Refund to customer".
 * The backend records a cash/bank refund and flips status to 'applied'.
 */
export const refundCreditMemoAPI = async (
  id: string,
  refund: CreditMemoRefundApiData,
): Promise<any> => {
  const idx = cmStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Credit memo not found');

  const refundNote = `Refunded ${refund.amount} via ${refund.method}` +
    (refund.reference ? ` (ref: ${refund.reference})` : '') +
    ` on ${refund.date.slice(0, 10)}.`;

  cmStore[idx] = {
    ...cmStore[idx],
    status: 'applied',
    notes: cmStore[idx].notes
      ? `${cmStore[idx].notes}\n${refundNote}`
      : refundNote,
    updatedAt: new Date().toISOString(),
  };

  return simulateApiCall(
    { success: true, data: { creditMemo: cloneEntity(cmStore[idx]) } },
    500,
  );
};

/**
 * POST /api/v1/credit-memos/:id/void
 */
export const voidCreditMemoAPI = async (id: string): Promise<any> => {
  const idx = cmStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Credit memo not found');
  cmStore[idx] = {
    ...cmStore[idx],
    status: 'voided',
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall(
    { success: true, data: { creditMemo: cloneEntity(cmStore[idx]) } },
    400,
  );
};

/**
 * DELETE /api/v1/credit-memos/:id
 */
export const deleteCreditMemoAPI = async (id: string): Promise<any> => {
  const idx = cmStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Credit memo not found');
  cmStore.splice(idx, 1);
  return simulateApiCall({ success: true, data: { id } }, 400);
};

void API_BASE_URL;
