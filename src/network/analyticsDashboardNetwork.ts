// ═══════════════════════════════════════════════════════
// FinMatrix — Analytics Dashboard Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';
import { fetchReport } from './_reportHelpers';

export const getDashboardSummaryAPI = async (params: any = {}): Promise<any> => {
  return fetchReport('/reports/profit-loss', params);
};

export const getNotificationsAPI = async (params: any = {}): Promise<any> => {
  try {
    const response = await api.get('/notifications', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const markNotificationReadAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const markAllNotificationsReadAPI = async (): Promise<any> => {
  try {
    const response = await api.post('/notifications/read-all');
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getUnreadCountAPI = async (userId: string): Promise<any> => {
  try {
    const response = await api.get('/notifications/unread-count', { params: { userId } });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getAnalyticsDashboardAPI = async (params: any = {}): Promise<any> => {
  return fetchReport('/reports/analytics-dashboard', params);
};
