import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import { chartOfAccountsData } from '../../../dummy-data/chartOfAccounts';
import {
  type AnnualBudget,
  type BudgetAccountLine,
  type BudgetMonthlyAmounts,
  MONTH_KEYS,
  calculateLineTotal,
  distributeEvenly,
} from '../../../models/budgetModel';
import { copyBudgetFromLastYearAPI, getBudgetByIdAPI, saveBudgetAPI } from '../../../network/budgetNetwork';
import {
  budgetCopySerializer,
  budgetSingleSerializer,
} from '../../../serializers/budgetSerializer';

interface BudgetFormState {
  budget: AnnualBudget | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
}

const initialState: BudgetFormState = {
  budget: null,
  isLoading: false,
  isSaving: false,
  error: '',
};

const withTotals = (budget: AnnualBudget): AnnualBudget => ({
  ...budget,
  lines: budget.lines.map(line => ({
    ...line,
    total: calculateLineTotal(line.monthly),
  })),
});

export const budgetFormSlice = createAppSlice({
  name: 'budgetForm',
  initialState,
  reducers: create => ({
    setBudgetLineMonthAmount: create.reducer(
      (
        state,
        action: PayloadAction<{ lineId: string; month: keyof BudgetMonthlyAmounts; value: number }>,
      ) => {
        if (!state.budget) return;
        const line = state.budget.lines.find(item => item.id === action.payload.lineId);
        if (!line) return;
        line.monthly[action.payload.month] = action.payload.value;
        line.total = calculateLineTotal(line.monthly);
      },
    ),
    distributeBudgetLineEvenly: create.reducer(
      (state, action: PayloadAction<{ lineId: string; annualAmount: number }>) => {
        if (!state.budget) return;
        const line = state.budget.lines.find(item => item.id === action.payload.lineId);
        if (!line) return;
        line.monthly = distributeEvenly(action.payload.annualAmount);
        line.total = calculateLineTotal(line.monthly);
      },
    ),
    addBudgetLineByAccount: create.reducer((state, action: PayloadAction<{ accountId: string }>) => {
      if (!state.budget) return;
      const account = chartOfAccountsData.find(item => item.id === action.payload.accountId);
      if (!account) return;
      if (state.budget.lines.some(line => line.accountId === account.id)) return;

      const monthly = {
        jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
        jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
      };

      const line: BudgetAccountLine = {
        id: `line_${Date.now()}_${account.code}`,
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        monthly,
        total: 0,
      };

      state.budget.lines.push(line);
    }),
    loadBudgetForEdit: create.asyncThunk(async (budgetId: string) => budgetSingleSerializer(await getBudgetByIdAPI(budgetId)), {
      pending: state => {
        state.isLoading = true;
        state.error = '';
      },
      fulfilled: (state, action) => {
        state.isLoading = false;
        state.budget = action.payload ? withTotals(action.payload) : null;
      },
      rejected: (state, action) => {
        state.isLoading = false;
        state.error = action.error?.message ?? 'Failed to load budget';
      },
    }),
    copyFromLastYear: create.asyncThunk(async (fiscalYear: number) => budgetCopySerializer(await copyBudgetFromLastYearAPI(fiscalYear)), {
      fulfilled: (state, action) => {
        if (!state.budget || !action.payload) return;

        const priorByAccount = new Map(action.payload.lines.map(line => [line.accountId, line]));
        state.budget.lines = state.budget.lines.map(line => {
          const prior = priorByAccount.get(line.accountId);
          if (!prior) return line;
          const monthly = { ...prior.monthly };
          return {
            ...line,
            monthly,
            total: calculateLineTotal(monthly),
          };
        });
      },
    }),
    saveBudget: create.asyncThunk(async (budget: AnnualBudget) => budgetSingleSerializer(await saveBudgetAPI(withTotals(budget))), {
      pending: state => {
        state.isSaving = true;
        state.error = '';
      },
      fulfilled: (state, action) => {
        state.isSaving = false;
        if (action.payload) {
          state.budget = withTotals(action.payload);
        }
      },
      rejected: (state, action) => {
        state.isSaving = false;
        state.error = action.error?.message ?? 'Failed to save budget';
      },
    }),
    initializeBudgetDraft: create.reducer((state, action: PayloadAction<{ fiscalYear: number }>) => {
      const fiscalYear = action.payload.fiscalYear;
      const now = new Date().toISOString();
      const lines = chartOfAccountsData
        .filter(account => account.type === 'revenue' || account.type === 'expense')
        .slice(0, 6)
        .map(account => {
          const monthly = {
            jan: 0,
            feb: 0,
            mar: 0,
            apr: 0,
            may: 0,
            jun: 0,
            jul: 0,
            aug: 0,
            sep: 0,
            oct: 0,
            nov: 0,
            dec: 0,
          };

          return {
            id: `line_${fiscalYear}_${account.code}`,
            accountId: account.id,
            accountCode: account.code,
            accountName: account.name,
            monthly,
            total: 0,
          };
        });

      state.budget = {
        id: `budget_${fiscalYear}_${Date.now()}`,
        companyId: 'comp_001',
        fiscalYear,
        name: `FY ${fiscalYear} Budget`,
        notes: '',
        lines,
        createdAt: now,
        updatedAt: now,
      };
    }),
  }),
  selectors: {
    selectBudgetFormState: state => state,
    selectBudgetFormMonths: () => MONTH_KEYS,
  },
});

export const {
  setBudgetLineMonthAmount,
  distributeBudgetLineEvenly,
  addBudgetLineByAccount,
  loadBudgetForEdit,
  copyFromLastYear,
  saveBudget,
  initializeBudgetDraft,
} = budgetFormSlice.actions;

export const { selectBudgetFormState, selectBudgetFormMonths } = budgetFormSlice.selectors;
