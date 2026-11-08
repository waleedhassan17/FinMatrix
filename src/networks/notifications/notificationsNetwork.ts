// ═══════════════════════════════════════════════════════
// FinMatrix — In-app notifications network
// ═══════════════════════════════════════════════════════
// The server's per-user notification centre (backend modules/notifications).
// The user comes from the JWT, so nothing here sends a user id — the old stub
// passed `userId` to unread-count, which the server ignored.
//
// Returns the raw axios body; notificationSerializer turns it into app shapes.

import { api, extractErrorMessage } from '../network/apiHelpers';

export interface NotificationListParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

export const getNotificationsAPI = async (params: NotificationListParams = {}): Promise<unknown> => {
  try {
    const response = await api.get('/notifications', { params });
    return response.data;
  } catch (e: unknown) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getUnreadCountAPI = async (): Promise<unknown> => {
  try {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  } catch (e: unknown) {
    throw new Error(extractErrorMessage(e));
  }
};

export const markNotificationReadAPI = async (id: string): Promise<void> => {
  try {
    await api.patch(`/notifications/${id}/read`);
  } catch (e: unknown) {
    throw new Error(extractErrorMessage(e));
  }
};

// PATCH, as the controller declares it. The stub this replaces sent POST, which
// the server has no route for.
export const markAllNotificationsReadAPI = async (): Promise<void> => {
  try {
    await api.patch('/notifications/read-all');
  } catch (e: unknown) {
    throw new Error(extractErrorMessage(e));
  }
};
