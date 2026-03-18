export interface ReportDateRange {
	startDate: string;
	endDate: string;
}

export interface ProfitLossReport {
	range: ReportDateRange;
	comparisonRange: ReportDateRange | null;
	revenue: number;
	cogs: number;
	grossProfit: number;
	expenses: number;
	netIncome: number;
	comparison?: {
		revenue: number;
		cogs: number;
		grossProfit: number;
		expenses: number;
		netIncome: number;
	};
}

export interface BalanceSheetLine {
	accountId: string;
	accountCode: string;
	accountName: string;
	amount: number;
}

export interface BalanceSheetReport {
	asOfDate: string;
	assets: BalanceSheetLine[];
	liabilities: BalanceSheetLine[];
	equity: BalanceSheetLine[];
	totalAssets: number;
	totalLiabilities: number;
	totalEquity: number;
	isBalanced: boolean;
}

export interface CashFlowLine {
	id: string;
	label: string;
	amount: number;
}

export interface CashFlowReport {
	range: ReportDateRange;
	operating: CashFlowLine[];
	investing: CashFlowLine[];
	financing: CashFlowLine[];
	operatingTotal: number;
	investingTotal: number;
	financingTotal: number;
	netCashFlow: number;
}

export interface TrialBalanceRow {
	accountId: string;
	accountCode: string;
	accountName: string;
	debit: number;
	credit: number;
}

export interface TrialBalanceReport {
	asOfDate: string;
	rows: TrialBalanceRow[];
	totalDebit: number;
	totalCredit: number;
}

export interface AgingBucket {
	current: number;
	bucket1to30: number;
	bucket31to60: number;
	bucket61to90: number;
	bucket90Plus: number;
	total: number;
}

export interface ARAgingRow extends AgingBucket {
	customerId: string;
	customerName: string;
}

export interface ARAgingReport {
	asOfDate: string;
	rows: ARAgingRow[];
	totals: AgingBucket;
}

export interface InventoryValuationRow {
	itemId: string;
	itemName: string;
	sku: string;
	category: string;
	qty: number;
	cost: number;
	value: number;
}

export interface InventoryCategoryValuation {
	category: string;
	totalValue: number;
}

export interface InventoryValuationReport {
	rows: InventoryValuationRow[];
	byCategory: InventoryCategoryValuation[];
	totalValue: number;
}

export interface AnalyticsPoint {
	label: string;
	value: number;
}

export interface AnalyticsStackedPoint {
	label: string;
	current: number;
	bucket1to30: number;
	bucket31to60: number;
	bucket61to90: number;
	bucket90Plus: number;
}

export interface AnalyticsDashboardData {
	revenueTrend: AnalyticsPoint[];
	expenseCategories: AnalyticsPoint[];
	cashFlowTrend: AnalyticsPoint[];
	topCustomers: AnalyticsPoint[];
	arAgingTrend: AnalyticsStackedPoint[];
}

export interface ReportHubItem {
	key: string;
	title: string;
	icon: string;
	target:
		| 'ProfitLoss'
		| 'BalanceSheet'
		| 'CashFlow'
		| 'TrialBalance'
		| 'ARAging'
		| 'InventoryValuation'
		| 'AnalyticsDashboard'
		| 'BudgetList'
		| 'DeliveryDailyReport'
		| 'DeliveryPerformance'
		| 'SalesByCustomer'
		| 'SalesByItem'
		| 'SalesTaxReport'
		| null;
}

export interface ReportHubCategory {
	key: string;
	title: string;
	icon: string;
	items: ReportHubItem[];
}

const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

export const getDefaultReportRange = (): ReportDateRange => {
	const today = new Date();
	const start = new Date(today.getFullYear(), today.getMonth(), 1);
	const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
	return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
};

export const getComparisonRange = (range: ReportDateRange): ReportDateRange => {
	const start = new Date(range.startDate);
	const end = new Date(range.endDate);

	const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
	const comparisonEnd = new Date(start);
	comparisonEnd.setDate(comparisonEnd.getDate() - 1);

	const comparisonStart = new Date(comparisonEnd);
	comparisonStart.setDate(comparisonStart.getDate() - (days - 1));

	return {
		startDate: toIsoDate(comparisonStart),
		endDate: toIsoDate(comparisonEnd),
	};
};

export const withinRange = (date: string, range: ReportDateRange): boolean => {
	const t = new Date(date).getTime();
	const start = new Date(range.startDate).getTime();
	const end = new Date(range.endDate + 'T23:59:59.999Z').getTime();
	return t >= start && t <= end;
};

export const asOf = (date: string, asOfDate: string): boolean => {
	const t = new Date(date).getTime();
	const end = new Date(asOfDate + 'T23:59:59.999Z').getTime();
	return t <= end;
};

export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const getYtdRange = (): ReportDateRange => {
  const today = new Date();
  return { startDate: `${today.getFullYear()}-01-01`, endDate: `${today.getFullYear()}-12-31` };
};

export const getLastNDaysRange = (n: number): ReportDateRange => {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end.getTime() - (n - 1) * 86400000);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
};

// ─── Delivery Daily Report ────────────────────────────────────────────────────
export interface DeliveryPersonnelStat {
  personId: string;
  name: string;
  total: number;
  delivered: number;
  failed: number;
  onTimeRate: number;
}

export interface DeliveryAgencyCount {
  agencyId: string;
  agencyName: string;
  count: number;
}

export interface DeliveryDailyReport {
  date: string;
  total: number;
  completed: number;
  failed: number;
  onTimePercent: number;
  personnelStats: DeliveryPersonnelStat[];
  agencyDistribution: DeliveryAgencyCount[];
}

// ─── Delivery Performance Report ──────────────────────────────────────────────
export interface DeliveryPerformanceRow {
  personId: string;
  name: string;
  total: number;
  delivered: number;
  failed: number;
  onTimeRate: number;
}

export interface DeliveryTrendPoint {
  label: string;
  delivered: number;
  failed: number;
}

export interface DeliveryPerformanceReport {
  rows: DeliveryPerformanceRow[];
  dailyTrend: DeliveryTrendPoint[];
}

// ─── Sales By Customer ────────────────────────────────────────────────────────
export interface SalesByCustomerRow {
  customerId: string;
  customerName: string;
  invoiceCount: number;
  totalSales: number;
  avgOrder: number;
}

export interface SalesByCustomerReport {
  rows: SalesByCustomerRow[];
  totalSales: number;
}

// ─── Sales By Item ────────────────────────────────────────────────────────────
export interface SalesByItemRow {
  itemId: string;
  itemName: string;
  qtySold: number;
  revenue: number;
  profit: number;
  profitMargin: number;
}

export interface SalesByItemReport {
  rows: SalesByItemRow[];
  totalRevenue: number;
  totalProfit: number;
}

// ─── Sales Tax Report ─────────────────────────────────────────────────────────
export interface SalesTaxRow {
  taxRate: number;
  taxName: string;
  collected: number;
  paid: number;
  netLiability: number;
}

export interface SalesTaxReport {
  range: ReportDateRange;
  rows: SalesTaxRow[];
  totalCollected: number;
  totalPaid: number;
  totalNetLiability: number;
}
