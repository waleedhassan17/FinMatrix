import { createAppSlice } from '@store/createAppSlice';
import { createSelector } from '@reduxjs/toolkit';
import type { ReportHubCategory } from '../../../models/reportModel';

const initialCategories: ReportHubCategory[] = [
  {
    key: 'financial',
    title: 'Financial',
    icon: 'FIN',
    items: [
      { key: 'pl', title: 'P&L', icon: 'PL', target: 'ProfitLoss' },
      { key: 'bs', title: 'Balance Sheet', icon: 'BS', target: 'BalanceSheet' },
      { key: 'cf', title: 'Cash Flow', icon: 'CF', target: 'CashFlow' },
      { key: 'tb', title: 'Trial Balance', icon: 'TB', target: 'TrialBalance' },
      { key: 'analytics', title: 'Analytics Dashboard', icon: 'ANL', target: 'AnalyticsDashboard' },
      { key: 'budgeting', title: 'Budgets', icon: 'BDG', target: 'BudgetList' },
    ],
  },
  {
    key: 'ar',
    title: 'Accounts Receivable',
    icon: 'AR',
    items: [
      { key: 'ar-aging', title: 'Aging', icon: 'AG', target: 'ARAging' },
      { key: 'ar-balance', title: 'Customer Balance', icon: 'CB', target: null },
    ],
  },
  {
    key: 'ap',
    title: 'Accounts Payable',
    icon: 'AP',
    items: [
      { key: 'ap-aging', title: 'Aging', icon: 'AG', target: null },
      { key: 'ap-balance', title: 'Vendor Balance', icon: 'VB', target: null },
    ],
  },
  {
    key: 'inventory',
    title: 'Inventory',
    icon: 'INV',
    items: [
      { key: 'inv-valuation', title: 'Valuation', icon: 'VAL', target: 'InventoryValuation' },
      { key: 'inv-stock', title: 'Stock Status', icon: 'STK', target: null },
    ],
  },
  {
    key: 'sales',
    title: 'Sales',
    icon: 'SAL',
    items: [
      { key: 'sales-by-customer', title: 'Sales by Customer', icon: 'SC', target: 'SalesByCustomer' },
      { key: 'sales-by-item', title: 'Sales by Item', icon: 'SI', target: 'SalesByItem' },
      { key: 'sales-tax', title: 'Tax Report', icon: 'TAX', target: 'SalesTaxReport' },
    ],
  },
  {
    key: 'payroll',
    title: 'Payroll',
    icon: 'PAY',
    items: [{ key: 'payroll-overview', title: 'Payroll Overview', icon: 'PRO', target: null }],
  },
  {
    key: 'delivery',
    title: 'Delivery',
    icon: 'DEL',
    items: [
      { key: 'delivery-daily', title: 'Daily Report', icon: 'DR', target: 'DeliveryDailyReport' },
      { key: 'delivery-performance', title: 'Performance', icon: 'DP', target: 'DeliveryPerformance' },
    ],
  },
];

interface ReportsHubState {
  categories: ReportHubCategory[];
}

const initialState: ReportsHubState = {
  categories: initialCategories,
};

export const reportsHubSlice = createAppSlice({
  name: 'reportsHub',
  initialState,
  reducers: create => ({
    setReportCategories: create.reducer(
      (state, action: { payload: ReportHubCategory[] }) => {
        state.categories = action.payload;
      },
    ),
  }),
  selectors: {
    selectReportCategories: state => state.categories,
  },
});

export const { setReportCategories } = reportsHubSlice.actions;
export const { selectReportCategories } = reportsHubSlice.selectors;

/* ── Derived selectors ── */

export const selectReportStats = createSelector(
  selectReportCategories,
  (categories): { total: number; ready: number; planned: number; categoryCount: number } => {
    let total = 0;
    let ready = 0;
    categories.forEach(c =>
      c.items.forEach(i => {
        total++;
        if (i.target) ready++;
      }),
    );
    return { total, ready, planned: total - ready, categoryCount: categories.length };
  },
);