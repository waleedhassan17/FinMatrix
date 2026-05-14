// ═══════════════════════════════════════════════════════
// FinMatrix — Admin Dashboard Slice (Real API)
// ═══════════════════════════════════════════════════════

import { createAppSlice } from '@store/createAppSlice';
import {
  getAdminDashboardSummaryAPI,
  getRecentInvoicesAPI,
  getDeliveryStatsAPI,
} from '../../network/adminDashboardNetwork';
import type { DashboardStat, RecentTransaction, DeliveryOverviewData, DashboardAlert } from '../../models/dashboardModel';

const fmtCurrency = (n: number) => {
  if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `PKR ${(n / 1_000).toFixed(0)}K`;
  return `PKR ${n.toLocaleString()}`;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export interface AdminDashboardData {
  totalRevenue: number;
  totalExpenses: number;
  outstandingAR: number;
  pendingAP: number;
  inventoryItems: number;
  deliveryBreakdown: {
    pending: number;
    assigned: number;
    in_transit: number;
    delivered: number;
    failed: number;
    cancelled: number;
  };
  deliveryTotal: number;
  recentTransactions: {
    id: string;
    type: 'invoice' | 'bill';
    description: string;
    date: string;
    amount: number;
    status: string;
  }[];
  alerts: { id: string; message: string; severity: 'red' | 'amber' | 'blue' }[];
}

export interface AdminDashboardSliceState {
  rawData: AdminDashboardData | null;
  stats: DashboardStat[];
  transactions: RecentTransaction[];
  delivery: DeliveryOverviewData;
  alerts: DashboardAlert[];
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
  isRefreshing: false,
  status: 'idle',
  error: '',
};

function buildStats(data: AdminDashboardData): DashboardStat[] {
  return [
    {
      id: 'revenue',
      label: "This Month's Revenue",
      value: fmtCurrency(data.totalRevenue),
      trend: '+0%',
      trendDirection: 'up',
      trendPositive: true,
      borderColor: '#00875A',
    },
    {
      id: 'ar',
      label: 'Outstanding AR',
      value: fmtCurrency(data.outstandingAR),
      borderColor: '#0052CC',
    },
    {
      id: 'expenses',
      label: "This Month's Expenses",
      value: fmtCurrency(data.totalExpenses),
      borderColor: '#DE350B',
    },
    {
      id: 'ap',
      label: 'Pending Bills (AP)',
      value: fmtCurrency(data.pendingAP),
      borderColor: '#FF991F',
    },
  ];
}

function buildTransactions(data: AdminDashboardData): RecentTransaction[] {
  return data.recentTransactions.map(t => ({
    id: t.id,
    type: t.type === 'invoice' ? 'income' : 'expense',
    description: t.type === 'invoice' ? `Invoice ${t.description}` : `Bill ${t.description}`,
    date: formatDate(t.date),
    amount: fmtCurrency(t.amount),
  }));
}

function buildDelivery(data: AdminDashboardData): DeliveryOverviewData {
  const d = data.deliveryBreakdown;
  return {
    assigned: (d.assigned ?? 0) + (d.pending ?? 0),
    inTransit: d.in_transit ?? 0,
    delivered: d.delivered ?? 0,
    pending: d.pending ?? 0,
    total: data.deliveryTotal,
  };
}

async function fetchDashboardData(): Promise<{
  rawData: AdminDashboardData;
  stats: DashboardStat[];
  transactions: RecentTransaction[];
  delivery: DeliveryOverviewData;
  alerts: DashboardAlert[];
}> {
  const summaryRaw = await getAdminDashboardSummaryAPI();
  const summary = summaryRaw?.data ?? summaryRaw;

  // If enhanced backend is deployed, it has all fields; otherwise we augment with parallel calls
  let rawData: AdminDashboardData;
  if (summary?.recentTransactions !== undefined) {
    // Enhanced backend response
    rawData = summary as AdminDashboardData;
  } else {
    // Fallback: augment with separate invoice/delivery calls
    const [invoicesRaw, deliveriesRaw] = await Promise.allSettled([
      getRecentInvoicesAPI(),
      getDeliveryStatsAPI(),
    ]);

    const invoiceList: any[] = invoicesRaw.status === 'fulfilled'
      ? (Array.isArray(invoicesRaw.value?.data) ? invoicesRaw.value.data : [])
      : [];

    const deliveryList: any[] = deliveriesRaw.status === 'fulfilled'
      ? (Array.isArray(deliveriesRaw.value?.data) ? deliveriesRaw.value.data : [])
      : [];

    const deliveryBreakdown = { pending: 0, assigned: 0, in_transit: 0, delivered: 0, failed: 0, cancelled: 0 };
    for (const d of deliveryList) {
      const s = d.status as keyof typeof deliveryBreakdown;
      if (s in deliveryBreakdown) deliveryBreakdown[s]++;
    }

    const recentTransactions = invoiceList.slice(0, 8).map((inv: any) => ({
      id: inv.id,
      type: 'invoice' as const,
      description: inv.invoiceNumber ?? inv.id,
      date: inv.invoiceDate ?? inv.issueDate ?? '',
      amount: parseFloat(inv.total ?? '0'),
      status: inv.status ?? 'draft',
    }));

    rawData = {
      totalRevenue: summary?.totalRevenue ?? 0,
      totalExpenses: summary?.totalExpenses ?? 0,
      outstandingAR: 0,
      pendingAP: 0,
      inventoryItems: summary?.inventoryItems ?? 0,
      deliveryBreakdown,
      deliveryTotal: deliveryList.length,
      recentTransactions,
      alerts: [],
    };
  }

  const stats = buildStats(rawData);
  const transactions = buildTransactions(rawData);
  const delivery = buildDelivery(rawData);
  const alerts: DashboardAlert[] = (rawData.alerts ?? []).map(a => ({
    id: a.id,
    message: a.message,
    severity: a.severity,
  }));

  return { rawData, stats, transactions, delivery, alerts };
}

export const adminDashboardSlice = createAppSlice({
  name: 'adminDashboard',
  initialState,
  reducers: create => ({
    refreshDashboard: create.asyncThunk(
      async () => fetchDashboardData(),
      {
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
          state.isRefreshing = false;
          state.status = 'idle';
        },
        rejected: (state, action) => {
          state.isRefreshing = false;
          state.status = 'failed';
          state.error = (action.error as any)?.message ?? 'Failed to load dashboard';
        },
      },
    ),
    loadDashboard: create.asyncThunk(
      async () => fetchDashboardData(),
      {
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
          state.status = 'idle';
        },
        rejected: (state, action) => {
          state.status = 'failed';
          state.error = (action.error as any)?.message ?? 'Failed to load dashboard';
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
    selectDashboardStatus: state => state.status,
    selectDashboardError: state => state.error,
    selectRawDashboardData: state => state.rawData,
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
} = adminDashboardSlice.selectors;
