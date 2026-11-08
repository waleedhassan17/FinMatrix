// ═══════════════════════════════════════════════════════
// FinMatrix — Notifications slice
// ═══════════════════════════════════════════════════════
// The server's per-user feed and its unread count. The count drives the bell
// badge on the dashboard header. The feed fills the Notifications screen.
//
// Marking read is optimistic: the row and the badge update at once, and a
// failed call puts them back. The store's sign-out reset clears all of it, so
// one user's notifications never show to the next.

import { createAppSlice } from '@store/createAppSlice';
import {
  getNotificationsAPI,
  getUnreadCountAPI,
  markAllNotificationsReadAPI,
  markNotificationReadAPI,
} from '../../networks/notifications/notificationsNetwork';
import {
  notificationListSerializer,
  unreadCountSerializer,
} from '../../serializers/notificationSerializer';
import type { AppNotification } from '../../models/notificationModel';

/** How many of the most recent notifications the screen shows. */
export const NOTIFICATION_PAGE_SIZE = 30;

export interface NotificationsSliceState {
  items: AppNotification[];
  unreadCount: number;
  /** `idle` covers both "never fetched" and "fetched"; `loaded` tells them apart. */
  status: 'idle' | 'loading' | 'failed';
  loaded: boolean;
  error: string;
  /** What a pending mark-all changed, so a failure can put exactly that back. */
  readAllUndo: { ids: string[]; unreadCount: number } | null;
}

const initialState: NotificationsSliceState = {
  items: [],
  unreadCount: 0,
  status: 'idle',
  loaded: false,
  error: '',
  readAllUndo: null,
};

export const notificationsSlice = createAppSlice({
  name: 'notifications',
  initialState,
  reducers: create => ({
    fetchUnreadCount: create.asyncThunk(
      async () => unreadCountSerializer(await getUnreadCountAPI()),
      {
        fulfilled: (state, action) => {
          state.unreadCount = action.payload;
        },
        // A failed count keeps the last one. The badge is a hint, and wiping
        // it on a flaky network would make it flicker.
      },
    ),

    fetchNotifications: create.asyncThunk(
      async () => {
        const [list, count] = await Promise.all([
          getNotificationsAPI({ page: 1, limit: NOTIFICATION_PAGE_SIZE }),
          getUnreadCountAPI().catch((): null => null),
        ]);
        return {
          items: notificationListSerializer(list),
          unreadCount: count === null ? null : unreadCountSerializer(count),
        };
      },
      {
        pending: state => {
          state.status = 'loading';
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.items = action.payload.items;
          if (action.payload.unreadCount !== null) {
            state.unreadCount = action.payload.unreadCount;
          }
          state.status = 'idle';
          state.loaded = true;
        },
        rejected: (state, action) => {
          state.status = 'failed';
          state.error = action.error?.message ?? 'Could not load notifications';
        },
      },
    ),

    markNotificationRead: create.asyncThunk(
      async (id: string) => {
        await markNotificationReadAPI(id);
        return id;
      },
      {
        pending: (state, action) => {
          const row = state.items.find(n => n.id === action.meta.arg);
          if (row && !row.isRead) {
            row.isRead = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        },
        rejected: (state, action) => {
          const row = state.items.find(n => n.id === action.meta.arg);
          if (row && row.isRead) {
            row.isRead = false;
            state.unreadCount += 1;
          }
        },
      },
    ),

    markAllNotificationsRead: create.asyncThunk(
      async () => {
        await markAllNotificationsReadAPI();
      },
      {
        pending: state => {
          state.readAllUndo = {
            ids: state.items.filter(n => !n.isRead).map(n => n.id),
            unreadCount: state.unreadCount,
          };
          state.items.forEach(n => {
            n.isRead = true;
          });
          // Every unread one, including any older than the page on screen.
          state.unreadCount = 0;
        },
        fulfilled: state => {
          state.readAllUndo = null;
        },
        rejected: state => {
          if (!state.readAllUndo) return;
          const undo = new Set(state.readAllUndo.ids);
          state.items.forEach(n => {
            if (undo.has(n.id)) n.isRead = false;
          });
          state.unreadCount = state.readAllUndo.unreadCount;
          state.readAllUndo = null;
        },
      },
    ),
  }),
  selectors: {
    selectNotifications: state => state.items,
    selectUnreadCount: state => state.unreadCount,
    selectNotificationsStatus: state => state.status,
    selectNotificationsLoaded: state => state.loaded,
    selectNotificationsError: state => state.error,
  },
});

export const {
  fetchUnreadCount,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = notificationsSlice.actions;

export const {
  selectNotifications,
  selectUnreadCount,
  selectNotificationsStatus,
  selectNotificationsLoaded,
  selectNotificationsError,
} = notificationsSlice.selectors;
