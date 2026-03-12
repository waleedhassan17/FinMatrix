// ═══════════════════════════════════════════════════════
// FinMatrix — Admin Dashboard Slice
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import {
  dashboardStats,
  recentTransactions,
  deliveryOverview,
  dashboardAlerts,
} from '../../dummy-data/dashboardData';
import type {
  DashboardStat,
  RecentTransaction,
  DeliveryOverviewData,
  DashboardAlert,
} from '../../dummy-data/dashboardData';

export interface AdminDashboardSliceState {
  stats: DashboardStat[];
  transactions: RecentTransaction[];
  delivery: DeliveryOverviewData;
  alerts: DashboardAlert[];
  isRefreshing: boolean;
  status: 'idle' | 'loading' | 'failed';
  error: string;
}

const initialState: AdminDashboardSliceState = {
  stats: dashboardStats,
  transactions: recentTransactions,
  delivery: deliveryOverview,
  alerts: dashboardAlerts,
  isRefreshing: false,
  status: 'idle',
  error: '',
};

export const adminDashboardSlice = createAppSlice({
  name: 'adminDashboard',
  initialState,
  reducers: create => ({
    setRefreshing: create.reducer(
      (state, action: PayloadAction<boolean>) => {
        state.isRefreshing = action.payload;
      },
    ),
    refreshDashboard: create.asyncThunk(
      async () => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          stats: dashboardStats,
          transactions: recentTransactions,
          delivery: deliveryOverview,
          alerts: dashboardAlerts,
        };
      },
      {
        pending: state => {
          state.isRefreshing = true;
        },
        fulfilled: (state, action) => {
          state.stats = action.payload.stats;
          state.transactions = action.payload.transactions;
          state.delivery = action.payload.delivery;
          state.alerts = action.payload.alerts;
          state.isRefreshing = false;
        },
        rejected: state => {
          state.isRefreshing = false;
        },
      },
    ),
  }),
  selectors: {
    selectDashboardStats: state => state.stats,
    selectRecentTransactions: state => state.transactions,
    selectDeliveryOverview: state => state.delivery,
    selectDashboardAlerts: state => state.alerts,
    selectIsRefreshing: state => state.isRefreshing,
  },
});

export const { setRefreshing, refreshDashboard } =
  adminDashboardSlice.actions;

export const {
  selectDashboardStats,
  selectRecentTransactions,
  selectDeliveryOverview,
  selectDashboardAlerts,
  selectIsRefreshing,
} = adminDashboardSlice.selectors;
