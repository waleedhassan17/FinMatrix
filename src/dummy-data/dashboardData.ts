// ═══════════════════════════════════════════════════════
// FinMatrix — Admin Dashboard Dummy Data
// ═══════════════════════════════════════════════════════

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

// ── Financial Summary Cards ──
export const dashboardStats: DashboardStat[] = [
  {
    id: 'revenue',
    label: 'Total Revenue',
    value: '$48,520',
    trend: '+12.5%',
    trendDirection: 'up',
    trendPositive: true,
    borderColor: '#27AE60',
  },
  {
    id: 'expenses',
    label: 'Total Expenses',
    value: '$22,340',
    trend: '-3.2%',
    trendDirection: 'down',
    trendPositive: true,
    borderColor: '#E74C3C',
  },
  {
    id: 'profit',
    label: 'Net Profit',
    value: '$26,180',
    trend: '+18.7%',
    trendDirection: 'up',
    trendPositive: true,
    borderColor: '#2E75B6',
  },
  {
    id: 'cash',
    label: 'Cash on Hand',
    value: '$34,200',
    borderColor: '#F39C12',
  },
];

// ── Recent Transactions ──
export const recentTransactions: RecentTransaction[] = [
  {
    id: 'txn1',
    type: 'income',
    description: 'Invoice #INV-0042 — Acme Corp',
    date: 'Mar 12, 2026',
    amount: '+$3,200',
  },
  {
    id: 'txn2',
    type: 'expense',
    description: 'Office Supplies — StarMart',
    date: 'Mar 11, 2026',
    amount: '-$148',
  },
  {
    id: 'txn3',
    type: 'income',
    description: 'Invoice #INV-0041 — GlobalTech',
    date: 'Mar 10, 2026',
    amount: '+$5,800',
  },
  {
    id: 'txn4',
    type: 'expense',
    description: 'Fuel — Fleet Account',
    date: 'Mar 10, 2026',
    amount: '-$620',
  },
  {
    id: 'txn5',
    type: 'income',
    description: 'Payment — Delta Services',
    date: 'Mar 9, 2026',
    amount: '+$1,450',
  },
];

// ── Delivery Overview ──
export const deliveryOverview: DeliveryOverviewData = {
  assigned: 12,
  inTransit: 4,
  delivered: 6,
  pending: 2,
  total: 12,
};

// ── Dashboard Alerts ──
export const dashboardAlerts: DashboardAlert[] = [
  {
    id: 'alert1',
    message: '3 items below reorder point',
    severity: 'amber',
  },
  {
    id: 'alert2',
    message: '5 invoices overdue ($4,200)',
    severity: 'red',
  },
  {
    id: 'alert3',
    message: '2 inventory updates pending approval',
    severity: 'blue',
  },
];
