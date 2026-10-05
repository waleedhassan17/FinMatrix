// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo Network (Production API)
// ═══════════════════════════════════════════════════════
import { api, extractErrorMessage } from '../network/apiHelpers';

const wrap = async (p: Promise<any>) => {
  try { return (await p).data; } catch (e: any) { throw new Error(extractErrorMessage(e)); }
};

export const getCreditMemosAPI = (params: any = {}) => wrap(api.get('/credit-memos', { params }));
export const getCreditMemoByIdAPI = (id: string) => wrap(api.get(`/credit-memos/${id}`));
export const createCreditMemoAPI = (data: any) => wrap(api.post('/credit-memos', data));
export const applyCreditMemoAPI = (id: string, invoiceId: string, amount: string) =>
  wrap(api.post(`/credit-memos/${id}/apply`, { invoiceId, amount }));
/** Pays the memo's remaining credit back from `bankAccountId` — 1000 Cash when none is given. */
export const refundCreditMemoAPI = (id: string, bankAccountId?: string) =>
  wrap(api.post(`/credit-memos/${id}/refund`, bankAccountId ? { bankAccountId } : {}));
export const voidCreditMemoAPI = (id: string) => wrap(api.post(`/credit-memos/${id}/void`, {}));
export const deleteCreditMemoAPI = (id: string) => wrap(api.delete(`/credit-memos/${id}`));
