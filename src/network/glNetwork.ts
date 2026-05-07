// ═══════════════════════════════════════════════════════
// FinMatrix — General Ledger Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export interface LedgerQueryParams {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  page?: number;
  limit?: number;
}

export const getLedgerEntriesAPI = async (params: LedgerQueryParams = {}): Promise<any> => {
  try {
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const yearEnd = `${now.getFullYear()}-12-31`;
    const queryParams = {
      startDate: yearStart,
      endDate: yearEnd,
      page: 1,
      limit: 50,
      ...params,
    };
    const response = await api.get('/ledger', { params: queryParams });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
