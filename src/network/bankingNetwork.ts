// ═══════════════════════════════════════════════════════
// FinMatrix — Banking Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export const getBankAccountsAPI = async (params: any = {}): Promise<any> => {
  try {
    const queryParams = { page: 1, limit: 50, ...params };
    const response = await api.get('/banking/accounts', { params: queryParams });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createBankAccountAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/banking/accounts', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getBankRegisterAPI = async (id: string, params: any = {}): Promise<any> => {
  try {
    const response = await api.get(`/banking/accounts/${id}/transactions`, { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const addBankTransactionAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/banking/transactions', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const bankTransferAPI = async (data: { fromAccountId: string; toAccountId: string; amount: number; date: string; memo?: string }): Promise<any> => {
  try {
    const response = await api.post('/banking/transfers', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const startReconciliationAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/banking/reconciliations', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getUnreconciledTransactionsAPI = async (bankAccountId: string, statementDate?: string): Promise<any> => {
  try {
    const params: any = { bankAccountId };
    if (statementDate) params.statementDate = statementDate;
    const response = await api.get('/banking/reconciliations/unreconciled', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getReconciliationHistoryAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/banking/accounts/${id}/reconciliations`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export interface CreateBankTransactionPayload {
  bankAccountId: string;
  type: string;
  date: string;
  payee?: string;
  amount: number;
  accountId?: string;
  reference?: string;
  memo?: string;
  description?: string;
  [key: string]: any;
}

export const createBankTransactionAPI = async (data: CreateBankTransactionPayload): Promise<any> => {
  return addBankTransactionAPI(data);
};

export interface TransferFundsPayload {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  memo?: string;
}

export const transferFundsAPI = async (data: TransferFundsPayload): Promise<any> => {
  return bankTransferAPI(data);
};

export const createBankReconciliationAPI = async (data: any): Promise<any> => {
  return startReconciliationAPI(data);
};

export const getBankTransactionsAPI = async (bankAccountId: string, params: any = {}): Promise<any> => {
  return getBankRegisterAPI(bankAccountId, params);
};
