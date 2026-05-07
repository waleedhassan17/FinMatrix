// ═══════════════════════════════════════════════════════
// FinMatrix — Audit & Search Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

export const getAuditEntriesAPI = async (params: any = {}): Promise<any> => {
  try {
    const response = await api.get('/audit', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getAuditByResourceAPI = async (type: string, id: string): Promise<any> => {
  try {
    const response = await api.get(`/audit/resource/${type}/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export interface AuditFilters {
  module?: string;
  resourceType?: string;
  userId?: string;
  action?: string;
  page?: number;
  limit?: number;
  [key: string]: any;
}

export const fetchAuditTrail = async (params: AuditFilters = {}): Promise<any> => {
  return getAuditEntriesAPI(params);
};

export const searchAll = async (query: string): Promise<any> => {
  try {
    const response = await api.get('/search', { params: { q: query } });
    return response.data;
  } catch (e: any) {
    // If search endpoint doesn't exist, return empty
    return { success: true, data: [] };
  }
};
