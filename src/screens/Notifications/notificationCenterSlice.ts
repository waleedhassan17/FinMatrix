import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { UserRole } from '../../types';
import type { RootState } from '../../store/store';

export type AdminNotificationCategory =
  | 'delivery_updates'
  | 'inventory_approvals'
  | 'system_alerts';

export type DeliveryNotificationCategory =
  | 'new_assignments'
  | 'approval_results'
  | 'general';

export type NotificationCategory =
  | AdminNotificationCategory
  | DeliveryNotificationCategory;

export interface AppNotification {
  id: string;
  targetRole: UserRole;
  targetUserId?: string;
  category: NotificationCategory;
  title: string;
  message: string;
  routeName?: string;
  routeParams?: Record<string, unknown>;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationCenterState {
  items: AppNotification[];
  lastRefreshedAt: string;
}

const initialState: NotificationCenterState = {
  items: [
    {
      id: 'notif_seed_admin_001',
      targetRole: 'admin',
      category: 'system_alerts',
      title: 'System Check Complete',
      message: 'Daily backup and sync finished successfully.',
      routeName: 'AdminDashboard',
      createdAt: '2026-03-16T06:30:00Z',
      isRead: false,
    },
    {
      id: 'notif_seed_delivery_001',
      targetRole: 'delivery',
      targetUserId: 'dp_002',
      category: 'general',
      title: 'Shift Reminder',
      message: 'Please confirm route readiness before first stop.',
      routeName: 'DPDashboard',
      createdAt: '2026-03-16T06:45:00Z',
      isRead: false,
    },
  ],
  lastRefreshedAt: new Date().toISOString(),
};

export const notificationCenterSlice = createAppSlice({
  name: 'notificationCenter',
  initialState,
  reducers: create => ({
    addRealtimeNotification: create.reducer(
      (
        state,
        action: PayloadAction<{
          targetRole: UserRole;
          targetUserId?: string;
          category: NotificationCategory;
          title: string;
          message: string;
          routeName?: string;
          routeParams?: Record<string, unknown>;
        }>,
      ) => {
        state.items.unshift({
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          targetRole: action.payload.targetRole,
          targetUserId: action.payload.targetUserId,
          category: action.payload.category,
          title: action.payload.title,
          message: action.payload.message,
          routeName: action.payload.routeName,
          routeParams: action.payload.routeParams,
          createdAt: new Date().toISOString(),
          isRead: false,
        });
      },
    ),
    markNotificationRead: create.reducer((state, action: PayloadAction<string>) => {
      const item = state.items.find(n => n.id === action.payload);
      if (item) item.isRead = true;
    }),
    markAllNotificationsRead: create.reducer(
      (state, action: PayloadAction<{ role: UserRole; userId?: string }>) => {
        state.items = state.items.map(item => {
          const roleMatch = item.targetRole === action.payload.role;
          const userMatch =
            action.payload.role === 'admin'
              ? true
              : !item.targetUserId || item.targetUserId === action.payload.userId;
          if (roleMatch && userMatch) {
            return { ...item, isRead: true };
          }
          return item;
        });
      },
    ),
    refreshNotificationFeed: create.reducer(state => {
      state.lastRefreshedAt = new Date().toISOString();
    }),
  }),
  selectors: {
    selectNotificationCenterState: state => state,
    selectNotificationItems: state => state.items,
    selectNotificationRefreshTimestamp: state => state.lastRefreshedAt,
  },
});

const isVisibleToUser = (item: AppNotification, role: UserRole, userId?: string) => {
  if (item.targetRole !== role) return false;
  if (role === 'admin') return true;
  return !item.targetUserId || item.targetUserId === userId;
};

export const selectVisibleNotificationsForUser = (
  root: RootState,
  role: UserRole,
  userId?: string,
): AppNotification[] => {
  return root.notificationCenter.items.filter(item => isVisibleToUser(item, role, userId));
};

export const selectUnreadNotificationCountForUser = (
  root: RootState,
  role: UserRole,
  userId?: string,
): number => {
  return root.notificationCenter.items.filter(
    item => isVisibleToUser(item, role, userId) && !item.isRead,
  ).length;
};

export const {
  addRealtimeNotification,
  markNotificationRead,
  markAllNotificationsRead,
  refreshNotificationFeed,
} = notificationCenterSlice.actions;

export const {
  selectNotificationCenterState,
  selectNotificationItems,
  selectNotificationRefreshTimestamp,
} = notificationCenterSlice.selectors;
