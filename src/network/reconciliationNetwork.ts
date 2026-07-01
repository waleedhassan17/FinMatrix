// ═══════════════════════════════════════════════════════
// FinMatrix — Bank Reconciliation Network (FinMatrix.md §27)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

const wrap = async (p: Promise<any>) => {
  try { return (await p).data; } catch (e: any) { throw new Error(extractErrorMessage(e)); }
};

export const getReconcilableAccountsAPI = () =>
  wrap(api.get('/reconciliations/accounts'));

export const getUnreconciledAPI = (accountId: string, endDate?: string) =>
  wrap(api.get('/reconciliations/unreconciled', { params: { accountId, ...(endDate ? { endDate } : {}) } }));

export const getReconciliationsAPI = (accountId?: string) =>
  wrap(api.get('/reconciliations', { params: accountId ? { accountId } : {} }));

export const getReconciliationByIdAPI = (id: string) =>
  wrap(api.get(`/reconciliations/${id}`));

export const createReconciliationAPI = (data: {
  accountId: string;
  statementDate: string;
  statementEndingBalance: string;
  clearedEntryIds: string[];
  notes?: string;
}) => wrap(api.post('/reconciliations', data));

export const deleteReconciliationAPI = (id: string) =>
  wrap(api.delete(`/reconciliations/${id}`));
