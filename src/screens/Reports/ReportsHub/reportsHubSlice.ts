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
      { key: 'tb', title: 'Trial Balance', icon: 'TB', target: 'TrialBalance' },
      { key: 'cf', title: 'Cash Flow', icon: 'CF', target: 'CashFlow' },
      { key: 'analytics', title: 'Analytics Dashboard', icon: 'ANL', target: 'AnalyticsDashboard' },
    ],
  },
  {
    key: 'ar',
    title: 'Accounts Receivable',
    icon: 'AR',
    items: [
      { key: 'ar-aging', title: 'Aging', icon: 'AG', target: 'ARAging' },
    ],
  },
  {
    key: 'inventory',
    title: 'Inventory',
    icon: 'INV',
    items: [
      { key: 'inv-valuation', title: 'Valuation', icon: 'VAL', target: 'InventoryValuation' },
    ],
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
export const selectReportCategories = (rootState: { reportsHub?: ReportsHubState }) =>
  (rootState.reportsHub ?? initialState).categories;

/* ── Derived selectors ── */

export const selectReportStats = createSelector(
  selectReportCategories,
  (categories): { total: number; ready: number; categoryCount: number } => {
    let total = 0;
    categories.forEach(c => {
      total += c.items.length;
    });
    return { total, ready: total, categoryCount: categories.length };
  },
);