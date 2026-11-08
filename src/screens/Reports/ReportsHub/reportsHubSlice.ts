import { createAppSlice } from '@store/createAppSlice';
import { createSelector } from '@reduxjs/toolkit';
import { toIsoDate, type ReportHubCategory } from '../../../models/reportModel';
import { isFeatureVisible } from '../../../utils/featureGates';
import { findKpi } from '../../../models/kpiModel';
import { remoteDone, remoteFailed, remoteIdle, remoteLoading, type Remote } from '../../../models/remoteModel';
import { getFinancialHealthAPI } from '../../../networks/reports/balanceSheetNetwork';
import { getARAgingReportAPI } from '../../../networks/reports/arAgingNetwork';
import { getAPAgingReportAPI } from '../../../networks/reports/apAgingNetwork';
import { getInventoryHealthAPI } from '../../../networks/reports/inventoryValuationNetwork';
import {
  isFinalRejection,
  toReportRejection,
  type ReportRejection,
} from '../../../networks/reports/reportHelpers';
import { financialHealthSerializer } from '../../../serializers/kpiSerializer';
import { arAgingSerializer } from '../../../serializers/arAgingSerializer';
import { inventoryHealthSerializer } from '../../../serializers/inventoryHealthSerializer';

const initialCategories: ReportHubCategory[] = [
  {
    key: 'financial',
    title: 'Financial',
    icon: 'FIN',
    items: [
      // Descriptions follow the website's report subtitles, cut to the one line a
      // hub row has (HUB_SUBTITLE_MAX, components/shared/HubList).
      { key: 'pl', title: 'P&L', description: 'What you earned and what it cost', icon: 'PL', target: 'ProfitLoss' },
      { key: 'bs', title: 'Balance Sheet', description: 'What the business owns and owes', icon: 'BS', target: 'BalanceSheet' },
      { key: 'tb', title: 'Trial Balance', description: 'Debits against credits, by account', icon: 'TB', target: 'TrialBalance' },
      { key: 'cf', title: 'Cash Flow', description: 'Where money came from and went', icon: 'CF', target: 'CashFlow' },
      { key: 'gl', title: 'General Ledger', description: 'Every posting and running balance', icon: 'GL', target: 'GeneralLedger' },
      { key: 'budgets', title: 'Budgets', description: 'Plan and track by fiscal year', icon: 'BUD', target: 'BudgetList', feature: 'budgets' },
      { key: 'analytics', title: 'Analytics', description: 'How the business is doing', icon: 'ANL', target: 'AnalyticsDashboard' },
    ],
  },
  {
    key: 'ar',
    title: 'Accounts Receivable',
    icon: 'AR',
    items: [
      { key: 'ar-aging', title: 'Aging', description: 'Who owes you, and how overdue', icon: 'AG', target: 'ARAging' },
    ],
  },
  {
    key: 'ap',
    title: 'Accounts Payable',
    icon: 'AP',
    items: [
      { key: 'ap-aging', title: 'Aging', description: 'Who you owe, and how late you are', icon: 'AG', target: 'APAging' },
    ],
  },
  {
    key: 'inventory',
    title: 'Inventory',
    icon: 'INV',
    feature: 'inventory',
    items: [
      { key: 'inv-valuation', title: 'Valuation', description: 'Stock at cost, and what it earns', icon: 'VAL', target: 'InventoryValuation' },
    ],
  },
  {
    key: 'delivery',
    title: 'Delivery',
    icon: 'DEL',
    feature: 'delivery',
    items: [
      { key: 'delivery-daily', title: 'Daily Report', description: "The day's delivery operations", icon: 'DR', target: 'DeliveryDailyReport' },
      { key: 'delivery-performance', title: 'Performance', description: 'Rider productivity', icon: 'DP', target: 'DeliveryPerformance' },
    ],
  },
];

/**
 * The hub's "Today" row: four figures an owner looks for before opening any
 * report. Each is fetched on its own and fails on its own — a tile says "—"
 * rather than taking the hub down — and each is the server's: cash from the
 * financial-health KPI, overdue and due-this-week from the aging insights,
 * the reorder count from inventory health.
 */
export interface HubToday {
  cash: Remote<number | null>;
  overdueAr: Remote<{ overdue: number; parties: number }>;
  apDue: Remote<{ dueThisWeek: number; overdue: number }>;
  belowReorder: Remote<number>;
}

interface ReportsHubState {
  categories: ReportHubCategory[];
  today: HubToday;
}

const initialState: ReportsHubState = {
  categories: initialCategories,
  today: {
    cash: remoteIdle(),
    overdueAr: remoteIdle(),
    apDue: remoteIdle(),
    belowReorder: remoteIdle(),
  },
};

type TodayKey = keyof HubToday;

const failed = (
  action: { payload?: unknown; error?: { message?: string } },
): { message: string; final: boolean } => {
  const r = action.payload as ReportRejection | undefined;
  return { message: r?.message ?? action.error?.message ?? 'Unavailable', final: isFinalRejection(r) };
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
    fetchHubToday: create.asyncThunk(
      async (key: TodayKey, thunkAPI) => {
        try {
          switch (key) {
            case 'cash': {
              const h = financialHealthSerializer(await getFinancialHealthAPI(toIsoDate(new Date())));
              return findKpi(h?.kpis ?? [], 'cashAndBank')?.value ?? null;
            }
            case 'overdueAr': {
              const r = arAgingSerializer(await getARAgingReportAPI({}));
              const late = (r?.rows ?? []).filter(row =>
                (r?.buckets ?? []).some(b => b.minDays > 0 && (row.amounts[b.key] ?? 0) > 0),
              ).length;
              return { overdue: r?.insights?.overdue ?? 0, parties: late };
            }
            case 'apDue': {
              const r = arAgingSerializer(await getAPAgingReportAPI({}));
              const slot = (k: string) => r?.insights?.schedule.find(x => x.key === k)?.amount ?? 0;
              return { dueThisWeek: slot('d0_7'), overdue: slot('overdue') };
            }
            case 'belowReorder': {
              const h = inventoryHealthSerializer(await getInventoryHealthAPI(null));
              return h?.belowReorder.length ?? 0;
            }
            default:
              return null;
          }
        } catch (e) {
          return thunkAPI.rejectWithValue(toReportRejection(e));
        }
      },
      {
        pending: (state, action) => {
          const k = action.meta.arg;
          (state.today[k] as Remote<unknown>) = remoteLoading(state.today[k] as Remote<unknown>);
        },
        fulfilled: (state, action) => {
          (state.today[action.meta.arg] as Remote<unknown>) = remoteDone(action.payload);
        },
        rejected: (state, action) => {
          const k = action.meta.arg;
          const f = failed(action);
          (state.today[k] as Remote<unknown>) = remoteFailed(state.today[k] as Remote<unknown>, f.message, f.final);
        },
      },
    ),
  }),
  selectors: {
    selectReportCategories: state => state.categories,
  },
});

export const { setReportCategories, fetchHubToday } = reportsHubSlice.actions;
export const HUB_TODAY_KEYS: TodayKey[] = ['cash', 'overdueAr', 'apDue', 'belowReorder'];
export const selectHubToday = (rootState: { reportsHub?: ReportsHubState }) =>
  (rootState.reportsHub ?? initialState).today;
export const selectReportCategories = (rootState: { reportsHub?: ReportsHubState }) =>
  (rootState.reportsHub ?? initialState).categories;

/**
 * Three-tier model: report categories/items filtered by the company's
 * feature flags (from auth). Legacy sessions (no flags) see everything —
 * matching the server's fully-unlocked fallback for pre-tiering companies.
 * Warehouse-only categories (inventory/delivery) are additionally hard-gated
 * by company type (see featureGates.ts).
 */
type AuthUserState = {
  auth?: {
    user?: {
      features?: Record<string, boolean> | null;
      companyType?: string | null;
    } | null;
  };
};

export const selectVisibleReportCategories = createSelector(
  selectReportCategories,
  (rootState: AuthUserState) => rootState.auth?.user?.features ?? null,
  (rootState: AuthUserState) => rootState.auth?.user?.companyType ?? null,
  (categories, features, companyType): ReportHubCategory[] => {
    return categories
      .filter(c => isFeatureVisible((c as any).feature, features, companyType))
      .map(c => ({
        ...c,
        items: c.items.filter(i => isFeatureVisible((i as any).feature, features, companyType)),
      }))
      .filter(c => c.items.length > 0);
  },
);

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