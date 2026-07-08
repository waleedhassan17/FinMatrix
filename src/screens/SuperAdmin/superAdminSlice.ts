// ═══════════════════════════════════════════════════════
// FinMatrix — Super Admin Slice
// ═══════════════════════════════════════════════════════

import { createAppSlice } from '@store/createAppSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  getSuperAdminStatsAPI,
  getAllCompaniesAPI,
  getSubscriptionPlansAPI,
  createSubscriptionPlanAPI,
  updateSubscriptionPlanAPI,
  deleteSubscriptionPlanAPI,
  updateCompanyStatusAPI,
  assignSubscriptionAPI,
  getAllSubscriptionsAPI,
} from '../../network/superAdminNetwork';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface PlatformStats {
  companies: {
    total: number;
    pending: number;
    active: number;
    suspended: number;
    rejected: number;
    recentWeek: number;
  };
  subscriptions: {
    totalPlans: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
  };
  recentRegistrations: {
    id: string;
    name: string;
    industry: string | null;
    email: string | null;
    status: string;
    createdAt: string;
  }[];
}

export interface CompanyListItem {
  id: string;
  name: string;
  industry: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  rejectionReason: string | null;
  memberCount: number;
  planName: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: string;
  priceYearly: string;
  maxUsers: number;
  maxInvoices: number | null;
  features: string[] | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  // Three-tier model (served from the server's PLAN_CONFIG):
  companyType?: 'small_business' | 'large_org' | 'warehouse' | null;
  durationMonths?: number | null;
  monthlyLabel?: string;
  totalLabel?: string;
  currency?: string;
  deliveryPersonnelLimit?: number;
}

export interface CompanySubscription {
  id: string;
  companyId: string;
  companyName: string;
  companyEmail: string | null;
  planId: string;
  plan: SubscriptionPlan | null;
  status: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SuperAdminState {
  stats: PlatformStats | null;
  statsStatus: 'idle' | 'loading' | 'failed';
  statsError: string;

  companies: CompanyListItem[];
  companiesTotal: number;
  companiesPage: number;
  companiesStatus: 'idle' | 'loading' | 'failed';
  companiesFilter: string;
  companiesError: string;

  plans: SubscriptionPlan[];
  plansStatus: 'idle' | 'loading' | 'failed';
  plansError: string;

  subscriptions: CompanySubscription[];
  subsTotal: number;
  subsStatus: 'idle' | 'loading' | 'failed';
}

const initialState: SuperAdminState = {
  stats: null,
  statsStatus: 'idle',
  statsError: '',

  companies: [],
  companiesTotal: 0,
  companiesPage: 1,
  companiesStatus: 'idle',
  companiesFilter: 'all',
  companiesError: '',

  plans: [],
  plansStatus: 'idle',
  plansError: '',

  subscriptions: [],
  subsTotal: 0,
  subsStatus: 'idle',
};

export const superAdminSlice = createAppSlice({
  name: 'superAdmin',
  initialState,
  reducers: create => ({
    setCompaniesFilter: create.reducer(
      (state, action: PayloadAction<string>) => {
        state.companiesFilter = action.payload;
        state.companiesPage = 1;
        state.companies = [];
      },
    ),

    loadPlatformStats: create.asyncThunk(
      async () => {
        const res = await getSuperAdminStatsAPI();
        return (res?.data ?? res) as PlatformStats;
      },
      {
        pending: state => {
          state.statsStatus = 'loading';
          state.statsError = '';
        },
        fulfilled: (state, action) => {
          state.stats = action.payload;
          state.statsStatus = 'idle';
        },
        rejected: (state, action) => {
          state.statsStatus = 'failed';
          state.statsError = (action.error as any)?.message ?? 'Failed to load stats';
        },
      },
    ),

    loadCompanies: create.asyncThunk(
      async (
        args: { page?: number; filter?: string } | undefined,
        { getState },
      ) => {
        const state = (getState() as { superAdmin: SuperAdminState }).superAdmin;
        const page = args?.page ?? state.companiesPage;
        const filter = args?.filter ?? state.companiesFilter;
        const res = await getAllCompaniesAPI(page, 20, filter === 'all' ? undefined : filter);
        const envelope = res?.data ?? res;
        return {
          data: (envelope?.data ?? []) as CompanyListItem[],
          total: (envelope?.pagination?.total ?? 0) as number,
          page,
        };
      },
      {
        pending: state => {
          state.companiesStatus = 'loading';
          state.companiesError = '';
        },
        fulfilled: (state, action) => {
          if (action.payload.page === 1) {
            state.companies = action.payload.data;
          } else {
            state.companies = [...state.companies, ...action.payload.data];
          }
          state.companiesTotal = action.payload.total;
          state.companiesPage = action.payload.page;
          state.companiesStatus = 'idle';
        },
        rejected: (state, action) => {
          state.companiesStatus = 'failed';
          state.companiesError = (action.error as any)?.message ?? 'Failed to load companies';
        },
      },
    ),

    updateCompanyStatusLocal: create.asyncThunk(
      async (args: { id: string; status: string; rejectionReason?: string }) => {
        const res = await updateCompanyStatusAPI(args.id, args.status, args.rejectionReason);
        return (res?.data ?? res) as { id: string; status: string; rejectionReason: string | null };
      },
      {
        fulfilled: (state, action) => {
          const idx = state.companies.findIndex(c => c.id === action.payload.id);
          if (idx !== -1) {
            state.companies[idx].status = action.payload.status;
            state.companies[idx].rejectionReason = action.payload.rejectionReason;
          }
          if (state.stats) {
            // Recalculate stats optimistically
            state.stats.companies.pending = state.companies.filter(c => c.status === 'pending').length;
            state.stats.companies.active = state.companies.filter(c => c.status === 'active').length;
          }
        },
      },
    ),

    loadPlans: create.asyncThunk(
      async () => {
        const res = await getSubscriptionPlansAPI();
        return (res?.data ?? res) as SubscriptionPlan[];
      },
      {
        pending: state => {
          state.plansStatus = 'loading';
          state.plansError = '';
        },
        fulfilled: (state, action) => {
          state.plans = Array.isArray(action.payload) ? action.payload : [];
          state.plansStatus = 'idle';
        },
        rejected: (state, action) => {
          state.plansStatus = 'failed';
          state.plansError = (action.error as any)?.message ?? 'Failed to load plans';
        },
      },
    ),

    createPlan: create.asyncThunk(
      async (planData: Parameters<typeof createSubscriptionPlanAPI>[0]) => {
        const res = await createSubscriptionPlanAPI(planData);
        return (res?.data ?? res) as SubscriptionPlan;
      },
      {
        fulfilled: (state, action) => {
          state.plans.push(action.payload);
        },
      },
    ),

    updatePlan: create.asyncThunk(
      async (args: { id: string; data: Parameters<typeof updateSubscriptionPlanAPI>[1] }) => {
        const res = await updateSubscriptionPlanAPI(args.id, args.data);
        return (res?.data ?? res) as SubscriptionPlan;
      },
      {
        fulfilled: (state, action) => {
          const idx = state.plans.findIndex(p => p.id === action.payload.id);
          if (idx !== -1) state.plans[idx] = action.payload;
        },
      },
    ),

    deletePlan: create.asyncThunk(
      async (planId: string) => {
        await deleteSubscriptionPlanAPI(planId);
        return planId;
      },
      {
        fulfilled: (state, action) => {
          state.plans = state.plans.filter(p => p.id !== action.payload);
        },
      },
    ),

    loadSubscriptions: create.asyncThunk(
      async () => {
        const res = await getAllSubscriptionsAPI(1, 50);
        const envelope = res?.data ?? res;
        return {
          data: (envelope?.data ?? []) as CompanySubscription[],
          total: (envelope?.pagination?.total ?? 0) as number,
        };
      },
      {
        pending: state => { state.subsStatus = 'loading'; },
        fulfilled: (state, action) => {
          state.subscriptions = action.payload.data;
          state.subsTotal = action.payload.total;
          state.subsStatus = 'idle';
        },
        rejected: state => { state.subsStatus = 'failed'; },
      },
    ),

    assignPlan: create.asyncThunk(
      async (args: Parameters<typeof assignSubscriptionAPI>[0]) => {
        const res = await assignSubscriptionAPI(args);
        return (res?.data ?? res) as CompanySubscription;
      },
      {
        fulfilled: (state, action) => {
          state.subscriptions.unshift(action.payload);
        },
      },
    ),
  }),
  selectors: {
    selectPlatformStats: s => s.stats,
    selectStatsStatus: s => s.statsStatus,
    selectStatsError: s => s.statsError,
    selectCompanies: s => s.companies,
    selectCompaniesTotal: s => s.companiesTotal,
    selectCompaniesStatus: s => s.companiesStatus,
    selectCompaniesFilter: s => s.companiesFilter,
    selectCompaniesError: s => s.companiesError,
    selectPlans: s => s.plans,
    selectPlansStatus: s => s.plansStatus,
    selectSubscriptions: s => s.subscriptions,
    selectSubsStatus: s => s.subsStatus,
  },
});

export const {
  setCompaniesFilter,
  loadPlatformStats,
  loadCompanies,
  updateCompanyStatusLocal,
  loadPlans,
  createPlan,
  updatePlan,
  deletePlan,
  loadSubscriptions,
  assignPlan,
} = superAdminSlice.actions;

export const {
  selectPlatformStats,
  selectStatsStatus,
  selectStatsError,
  selectCompanies,
  selectCompaniesTotal,
  selectCompaniesStatus,
  selectCompaniesFilter,
  selectCompaniesError,
  selectPlans,
  selectPlansStatus,
  selectSubscriptions,
  selectSubsStatus,
} = superAdminSlice.selectors;
