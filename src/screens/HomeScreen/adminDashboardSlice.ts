// ═══════════════════════════════════════════════════════
// FinMatrix — Admin Dashboard Slice (Real API)
// ═══════════════════════════════════════════════════════

import { createAppSlice } from '@store/createAppSlice';
import {
  getAdminDashboardSummaryAPI,
  getRecentInvoicesAPI,
  getDeliveryStatsAPI,
} from '../../network/adminDashboardNetwork';
import type {
  DashboardStat,
  RecentTransaction,
  DeliveryOverviewData,
  DashboardAlert,
} from '../../models/dashboardModel';

// ── Currency: compact, sign-aware, finite-safe ────────
const fmtCurrency = (n: number): string => {
  if (!Number.isFinite(n)) return 'Rs 0';
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}Rs ${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}Rs ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}Rs ${Math.round(abs / 1_000)}K`;
  if (abs >= 1_000) return `${sign}Rs ${(abs / 1_000).toFixed(1)}K`;
  return `${sign}Rs ${Math.round(abs).toLocaleString()}`;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

// ── Stat metadata (id stays in sync with KPI_META on screen) ──
function buildStats(data: AdminDashboardData): DashboardStat[] {
  return [
    {
      id: 'revenue',
      label: "This month's revenue",
      value: fmtCurrency(data.totalRevenue),
      borderColor: '#059669',
    },
    {
      id: 'ar',
      label: 'Outstanding receivables',
      value: fmtCurrency(data.outstandingAR),
      borderColor: '#1D4ED8',
    },
    {
      id: 'expenses',
      label: "This month's expenses",
      value: fmtCurrency(data.totalExpenses),
      borderColor: '#7C3AED',
    },
    {
      id: 'ap',
      label: 'Pending payables',
      value: fmtCurrency(data.pendingAP),
      borderColor: '#D97706',
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

// Keep "assigned" and "pending" as distinct buckets so the
// segmented bar and chips don't double-count.
function buildDelivery(data: AdminDashboardData): DeliveryOverviewData {
  const d = data.deliveryBreakdown;
  return {
    assigned: d.assigned ?? 0,
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

    const deliveryBreakdown = {
      pending: 0, assigned: 0, in_transit: 0, delivered: 0, failed: 0, cancelled: 0,
    };
    for (const d of deliveryList) {
      const st = d.status as keyof typeof deliveryBreakdown;
      if (st in deliveryBreakdown) deliveryBreakdown[st]++;
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
      outstandingAR: summary?.outstandingAR ?? 0,
      pendingAP: summary?.pendingAP ?? 0,
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