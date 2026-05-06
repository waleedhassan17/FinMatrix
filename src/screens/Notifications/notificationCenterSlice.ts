import type { PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { UserRole } from '../../types';
import type { RootState } from '../../store/store';

export type AdminNotificationCategory =
  | 'delivery_updates'
  | 'inventory_approvals'
  | 'system_alerts'
  | 'invoice_updates'
  | 'payment_updates'
  | 'banking_alerts'
  | 'payroll_updates';

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
      createdAt: '2026-03-18T06:30:00Z',
      isRead: false,
    },
    {
      id: 'notif_seed_admin_002',
      targetRole: 'admin',
      category: 'invoice_updates',
      title: 'Invoice Overdue',
      message: 'INV-1040 for Lahore Traders is now 15 days overdue (Rs 23,500).',
      routeName: 'InvoiceDetail',
      routeParams: { invoiceId: 'inv-003' },
      createdAt: '2026-03-18T08:00:00Z',
      isRead: false,
    },
    {
      id: 'notif_seed_admin_003',
      targetRole: 'admin',
      category: 'payment_updates',
      title: 'Payment Received',
      message: 'Rs 78,000 received from Al-Noor Distributors for INV-1041.',
      routeName: 'CustomerDetail',
      routeParams: { customerId: 'c-003' },
      createdAt: '2026-03-18T09:15:00Z',
      isRead: false,
    },
    {
      id: 'notif_seed_admin_004',
      targetRole: 'admin',
      category: 'delivery_updates',
      title: 'Delivery Completed',
      message: 'DEL-0451 to Faisalabad marked as delivered by Usman Raza.',
      routeName: 'AdminDeliveryDetail',
      routeParams: { deliveryId: 'del-0451' },
      createdAt: '2026-03-18T10:30:00Z',
      isRead: false,
    },
    {
      id: 'notif_seed_admin_005',
      targetRole: 'admin',
      category: 'inventory_approvals',
      title: 'Stock Adjustment Pending',
      message: 'ADJ-089 awaiting approval — 50 units of Copper Wire 2.5mm.',
      routeName: 'InventoryApproval',
      createdAt: '2026-03-18T11:00:00Z',
      isRead: false,
    },
    {
      id: 'notif_seed_admin_006',
      targetRole: 'admin',
      category: 'banking_alerts',
      title: 'Low Balance Alert',
      message: 'HBL Current Account balance dropped below Rs 50,000.',
      routeName: 'BankAccounts',
      createdAt: '2026-03-18T07:45:00Z',
      isRead: true,
    },
    {
      id: 'notif_seed_admin_007',
      targetRole: 'admin',
      category: 'payroll_updates',
      title: 'Payroll Approved',
      message: 'Payroll run PR-2026-03 approved — Rs 485,000 net disbursed.',
      routeName: 'PayrollHistory',
      createdAt: '2026-03-17T14:00:00Z',
      isRead: true,
    },
    {
      id: 'notif_seed_admin_008',
      targetRole: 'admin',
      category: 'system_alerts',
      title: 'New User Joined',
      message: 'Fatima Noor accepted the invite and joined as Admin.',
      routeName: 'UserManagement',
      createdAt: '2026-03-17T11:30:00Z',
      isRead: true,
    },
    {
      id: 'notif_seed_delivery_001',
      targetRole: 'delivery',
      targetUserId: 'dp_002',
      category: 'general',
      title: 'Shift Reminder',
      message: 'Please confirm route readiness before first stop.',
      routeName: 'DPDashboard',
      createdAt: '2026-03-18T06:45:00Z',
      isRead: false,
    },
    {
      id: 'notif_seed_delivery_002',
      targetRole: 'delivery',
      targetUserId: 'dp_002',
      category: 'new_assignments',
      title: 'New Delivery Assigned',
      message: 'DEL-0453 to Rawalpindi — 8 items, priority: High.',
      routeName: 'DPDeliveryDetail',
      routeParams: { deliveryId: 'del-0453' },
      createdAt: '2026-03-18T08:30:00Z',
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

export const selectVisibleNotificationsForUser = createSelector(
  [(root: RootState) => root.notificationCenter.items, (_root: RootState, role: UserRole) => role, (_root: RootState, _role: UserRole, userId?: string) => userId],
  (items, role, userId): AppNotification[] => {
    return items.filter(item => isVisibleToUser(item, role, userId));
  },
);

export const selectUnreadNotificationCountForUser = createSelector(
  [(root: RootState) => root.notificationCenter.items, (_root: RootState, role: UserRole) => role, (_root: RootState, _role: UserRole, userId?: string) => userId],
  (items, role, userId): number => {
    return items.filter(
      item => isVisibleToUser(item, role, userId) && !item.isRead,
    ).length;
  },
);

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
