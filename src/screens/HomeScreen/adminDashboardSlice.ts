// ═══════════════════════════════════════════════════════
// FinMatrix — Admin Dashboard Slice (Real API)
// ═══════════════════════════════════════════════════════

import { createAppSlice } from '@store/createAppSlice';
import {
  getAdminDashboardSummaryAPI,
  getRecentInvoicesAPI,
  getDeliveryStatsAPI,
} from '../../networks/dashboards/adminDashboardNetwork';
import type {
  DashboardStat,
  RecentTransaction,
  DeliveryOverviewData,
  DashboardAlert,
} from '../../models/dashboardModel';
import type {
  AdminDashboardData,
  SetupStatus,
} from '../../models/adminDashboardModel';
import {
  dashboardSummarySerializer,
  fallbackDashboardDataSerializer,
  dashboardStatsSerializer,
  recentTransactionsSerializer,
  deliveryOverviewSerializer,
  dashboardAlertsSerializer,
  dashboardSetupSerializer,
} from '../../serializers/adminDashboardSerializer';

// Payload shapes live in models/adminDashboardModel.ts; re-exported so
// existing `import type { … } from './adminDashboardSlice'` keeps working.
export type { AdminDashboardData, SetupStatus };

export interface AdminDashboardSliceState {
  rawData: AdminDashboardData | null;
  stats: DashboardStat[];
  transactions: RecentTransaction[];
  delivery: DeliveryOverviewData;
  alerts: DashboardAlert[];
  setup: SetupStatus | null;
  isRefreshing: boolean;
  status: 'idle' | 'loading' | 'failed';
  error: string;
}

const EMPTY_DELIVERY: DeliveryOverviewData = {
  assigned: 0, inTransit: 0, delivered: 0, pending: 0, total: 0,
};

const initialState: AdminDashboardSliceState = {
  rawData: null,
  stats: [],
  transactions: [],
  delivery: EMPTY_DELIVERY,
  alerts: [],
  setup: null,
  isRefreshing: false,
  status: 'idle',
  error: '',
};

async function fetchDashboardData(): Promise<{
  rawData: AdminDashboardData;
  stats: DashboardStat[];
  transactions: RecentTransaction[];
  delivery: DeliveryOverviewData;
  alerts: DashboardAlert[];
  setup: SetupStatus | null;
}> {
  const summaryRaw = await getAdminDashboardSummaryAPI();
  const summary = dashboardSummarySerializer(summaryRaw);

  let rawData: AdminDashboardData;
  if (summary?.recentTransactions !== undefined) {
    // Enhanced backend response — already complete
    rawData = summary as AdminDashboardData;
  } else {
    // Fallback: augment summary with parallel invoice/delivery calls
    const [invoicesRaw, deliveriesRaw] = await Promise.allSettled([
      getRecentInvoicesAPI(),
      getDeliveryStatsAPI(),
    ]);

    const invoiceList: any[] =
      invoicesRaw.status === 'fulfilled' && Array.isArray(invoicesRaw.value?.data)
        ? invoicesRaw.value.data
        : [];

    const deliveryList: any[] =
      deliveriesRaw.status === 'fulfilled' && Array.isArray(deliveriesRaw.value?.data)
        ? deliveriesRaw.value.data
        : [];

    rawData = fallbackDashboardDataSerializer(summary, invoiceList, deliveryList);
  }

  return {
    rawData,
    stats: dashboardStatsSerializer(rawData),
    transactions: recentTransactionsSerializer(rawData),
    delivery: deliveryOverviewSerializer(rawData),
    alerts: dashboardAlertsSerializer(rawData),
    setup: dashboardSetupSerializer(summary),
  };
}

export const adminDashboardSlice = createAppSlice({
  name: 'adminDashboard',
  initialState,
  reducers: create => ({
    refreshDashboard: create.asyncThunk(async () => fetchDashboardData(), {
      pending: state => {
        state.isRefreshing = true;
        state.error = '';
      },
      fulfilled: (state, action) => {
        state.rawData = action.payload.rawData;
        state.stats = action.payload.stats;
        state.transactions = action.payload.transactions;
        state.delivery = action.payload.delivery;
        state.alerts = action.payload.alerts;
        state.setup = action.payload.setup;
        state.isRefreshing = false;
        state.status = 'idle';
      },
      rejected: (state, action) => {
        state.isRefreshing = false;
        state.status = 'failed';
        state.error = (action.error as any)?.message ?? 'Failed to load dashboard';
      },
    }),
    loadDashboard: create.asyncThunk(async () => fetchDashboardData(), {
      pending: state => {
        state.status = 'loading';
        state.error = '';
      },
      fulfilled: (state, action) => {
        state.rawData = action.payload.rawData;
        state.stats = action.payload.stats;
        state.transactions = action.payload.transactions;
        state.delivery = action.payload.delivery;
        state.alerts = action.payload.alerts;
        state.setup = action.payload.setup;
        state.status = 'idle';
      },
      rejected: (state, action) => {
        state.status = 'failed';
        state.error = (action.error as any)?.message ?? 'Failed to load dashboard';
      },
    }),
  }),
  selectors: {
    selectDashboardStats: state => state.stats,
    selectRecentTransactions: state => state.transactions,
    selectDeliveryOverview: state => state.delivery,
    selectDashboardAlerts: state => state.alerts,
    selectIsRefreshing: state => state.isRefreshing,
    selectDashboardStatus: state => state.status,
    selectDashboardError: state => state.error,
    selectRawDashboardData: state => state.rawData,
    selectDashboardSetup: state => state.setup,
  },
});

export const { refreshDashboard, loadDashboard } = adminDashboardSlice.actions;

export const {
  selectDashboardStats,
  selectRecentTransactions,
  selectDeliveryOverview,
  selectDashboardAlerts,
  selectIsRefreshing,
  selectDashboardStatus,
  selectDashboardError,
  selectRawDashboardData,
  selectDashboardSetup,
} = adminDashboardSlice.selectors;