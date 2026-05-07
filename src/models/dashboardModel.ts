export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down';
  trendPositive?: boolean;
  borderColor: string;
}

export interface RecentTransaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  date: string;
  amount: string;
}

export interface DeliveryOverviewData {
  assigned: number;
  inTransit: number;
  delivered: number;
  pending: number;
  total: number;
}

export interface DashboardAlert {
  id: string;
  message: string;
  severity: 'amber' | 'red' | 'blue';
}

// ─── Empty defaults for initial state ────────────────
export const dashboardStats: DashboardStat[] = [];
export const recentTransactions: RecentTransaction[] = [];
export const deliveryOverview: DeliveryOverviewData = {
  assigned: 0,
  inTransit: 0,
  delivered: 0,
  pending: 0,
  total: 0,
};
export const dashboardAlerts: DashboardAlert[] = [];

