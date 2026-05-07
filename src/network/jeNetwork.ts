// ═══════════════════════════════════════════════════════
// FinMatrix — Journal Entry Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export interface JEQueryParams {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const getJournalEntriesAPI = async (params: JEQueryParams = {}): Promise<any> => {
  try {
    const response = await api.get('/journal-entries', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getJournalEntryByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/journal-entries/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createJournalEntryAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/journal-entries', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateJournalEntryAPI = async (idOrData: string | any, data?: any): Promise<any> => {
  try {
    let id: string;
    let body: any;
    if (typeof idOrData === 'string') {
      id = idOrData;
      body = data;
    } else {
      id = idOrData.id;
      body = idOrData;
    }
    const response = await api.patch(`/journal-entries/${id}`, body);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const postJournalEntryAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.post(`/journal-entries/${id}/post`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const voidJournalEntryAPI = async (id: string, reason?: string): Promise<any> => {
  try {
    const response = await api.post(`/journal-entries/${id}/void`, reason ? { reason } : {});
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const duplicateJournalEntryAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.post(`/journal-entries/${id}/duplicate`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
