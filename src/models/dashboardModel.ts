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
