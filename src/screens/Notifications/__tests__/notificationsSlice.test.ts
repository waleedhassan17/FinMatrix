import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../../networks/notifications/notificationsNetwork', () => ({
  getNotificationsAPI: jest.fn(),
  getUnreadCountAPI: jest.fn(),
  markNotificationReadAPI: jest.fn(),
  markAllNotificationsReadAPI: jest.fn(),
}));

import * as net from '../../../networks/notifications/notificationsNetwork';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsSlice,
} from '../notificationsSlice';

const api = net as jest.Mocked<typeof net>;

const row = (id: string, isRead = false) => ({
  id, type: 'delivery_assigned', title: id, message: '', isRead, createdAt: '', data: {},
});

const makeStore = () => configureStore({ reducer: { notifications: notificationsSlice.reducer } });

async function seeded(rows: ReturnType<typeof row>[], unread: number) {
  api.getNotificationsAPI.mockResolvedValueOnce({ success: true, data: rows });
  api.getUnreadCountAPI.mockResolvedValueOnce({ success: true, data: { count: unread } });
  const store = makeStore();
  await store.dispatch(fetchNotifications());
  return store;
}

beforeEach(() => jest.resetAllMocks());

describe('notificationsSlice', () => {
  it('loads the feed and the unread count together', async () => {
    const store = await seeded([row('a'), row('b', true)], 1);
    const st = store.getState().notifications;
    expect(st.items.map(n => n.id)).toEqual(['a', 'b']);
    expect(st.unreadCount).toBe(1);
    expect(st.loaded).toBe(true);
    expect(st.status).toBe('idle');
  });

  it('keeps the last count when the count call fails', async () => {
    const store = await seeded([], 3);
    api.getUnreadCountAPI.mockRejectedValueOnce(new Error('offline'));
    await store.dispatch(fetchUnreadCount());
    expect(store.getState().notifications.unreadCount).toBe(3);
  });

  it('marks a row read at once, and puts it back if the server refuses', async () => {
    const store = await seeded([row('a'), row('b')], 2);

    api.markNotificationReadAPI.mockResolvedValueOnce(undefined);
    await store.dispatch(markNotificationRead('a'));
    expect(store.getState().notifications.items[0].isRead).toBe(true);
    expect(store.getState().notifications.unreadCount).toBe(1);

    api.markNotificationReadAPI.mockRejectedValueOnce(new Error('nope'));
    await store.dispatch(markNotificationRead('b'));
    expect(store.getState().notifications.items[1].isRead).toBe(false);
    expect(store.getState().notifications.unreadCount).toBe(1);
  });

  it('does not double-count a row that was already read', async () => {
    const store = await seeded([row('a', true)], 0);
    api.markNotificationReadAPI.mockResolvedValueOnce(undefined);
    await store.dispatch(markNotificationRead('a'));
    expect(store.getState().notifications.unreadCount).toBe(0);
  });

  it('marks all read, including unread ones beyond the loaded page', async () => {
    const store = await seeded([row('a'), row('b', true)], 40);
    api.markAllNotificationsReadAPI.mockResolvedValueOnce(undefined);
    await store.dispatch(markAllNotificationsRead());
    const st = store.getState().notifications;
    expect(st.items.every(n => n.isRead)).toBe(true);
    expect(st.unreadCount).toBe(0);
  });

  it('restores exactly what mark-all changed when it fails', async () => {
    const store = await seeded([row('a'), row('b', true)], 40);
    api.markAllNotificationsReadAPI.mockRejectedValueOnce(new Error('nope'));
    await store.dispatch(markAllNotificationsRead());
    const st = store.getState().notifications;
    expect(st.items.map(n => n.isRead)).toEqual([false, true]);
    expect(st.unreadCount).toBe(40);
  });

  it('reports a failed feed without losing what was there', async () => {
    const store = await seeded([row('a')], 1);
    api.getNotificationsAPI.mockRejectedValueOnce(new Error('Server down'));
    api.getUnreadCountAPI.mockResolvedValueOnce({ data: { count: 1 } });
    await store.dispatch(fetchNotifications());
    const st = store.getState().notifications;
    expect(st.status).toBe('failed');
    expect(st.error).toBe('Server down');
    expect(st.items).toHaveLength(1);
  });
});
