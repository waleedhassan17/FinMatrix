// ═══════════════════════════════════════════════════════
// FinMatrix — Admin Dashboard Model
// ═══════════════════════════════════════════════════════
// Raw dashboard payload shapes (moved verbatim from adminDashboardSlice).
// The derived view models (DashboardStat, RecentTransaction, …) live in
// models/dashboardModel.ts.

export interface SetupStatus {
  completed: boolean;
  steps: {
    openingBalance: boolean;
    chartOfAccounts: boolean;
    inventory: boolean;
    customers: boolean;
    vendors: boolean;
    taxRates: boolean;
  };
}

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
  setup?: SetupStatus;
}
