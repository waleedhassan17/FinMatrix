import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import {
  PAYROLL_PERIOD_OPTIONS,
  calculatePayrollTotals,
  recalculatePayrollRow,
  type PayrollRunRecord,
  type PayrollWorksheetRow,
} from '../../../models/payrollModel';
import { getPayrollWorksheetAPI, processPayrollRunAPI } from '../../../network/payrollNetwork';
import {
  payrollRunSingleSerializer,
  payrollWorksheetSerializer,
} from '../../../serializers/payrollSerializer';

type PayrollStep = 1 | 2 | 3 | 4;

interface RunPayrollState {
  currentStep: PayrollStep;
  selectedPeriodId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  worksheet: PayrollWorksheetRow[];
  isLoadingWorksheet: boolean;
  isProcessing: boolean;
  error: string;
  // Serializer may return null when payload is malformed; UI guards this.
  processedRun: PayrollRunRecord | null;
}

const defaultPeriod = PAYROLL_PERIOD_OPTIONS[3] ?? PAYROLL_PERIOD_OPTIONS[0];

const initialState: RunPayrollState = {
  currentStep: 1,
  selectedPeriodId: defaultPeriod.id,
  periodStart: defaultPeriod.periodStart,
  periodEnd: defaultPeriod.periodEnd,
  payDate: defaultPeriod.payDate,
  worksheet: [],
  isLoadingWorksheet: false,
  isProcessing: false,
  error: '',
  processedRun: null,
};

export const runPayrollSlice = createAppSlice({
  name: 'runPayroll',
  initialState,
  reducers: create => ({
    setPayrollStep: create.reducer((state, action: PayloadAction<PayrollStep>) => {
      state.currentStep = action.payload;
    }),

    setPayrollPeriod: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedPeriodId = action.payload;
      const period = PAYROLL_PERIOD_OPTIONS.find(p => p.id === action.payload);
      if (period) {
        state.periodStart = period.periodStart;
        state.periodEnd = period.periodEnd;
        state.payDate = period.payDate;
      }
    }),

    setPayrollHours: create.reducer(
      (state, action: PayloadAction<{ employeeId: string; hours: number }>) => {
        const idx = state.worksheet.findIndex(r => r.employeeId === action.payload.employeeId);
        if (idx === -1) return;
        state.worksheet[idx] = recalculatePayrollRow(state.worksheet[idx], action.payload.hours);
      },
    ),

    resetRunPayroll: create.reducer(() => initialState),

    loadPayrollWorksheet: create.asyncThunk(
      async ({ periodStart, periodEnd }: { periodStart: string; periodEnd: string }) => {
        const envelope = await getPayrollWorksheetAPI(periodStart, periodEnd);
        return payrollWorksheetSerializer(envelope);
      },
      {
        pending: state => {
          state.isLoadingWorksheet = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.isLoadingWorksheet = false;
          state.worksheet = action.payload;
          state.currentStep = 2;
        },
        rejected: (state, action) => {
          state.isLoadingWorksheet = false;
          state.error = action.error?.message ?? 'Failed to load payroll worksheet';
        },
      },
    ),

    processPayroll: create.asyncThunk(
      async (
        payload: {
          periodStart: string;
          periodEnd: string;
          payDate: string;
          worksheet: Array<{ employeeId: string; hours: number }>;
        },
      ) => {
        const envelope = await processPayrollRunAPI(payload);
        return payrollRunSingleSerializer(envelope);
      },
      {
        pending: state => {
          state.isProcessing = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.isProcessing = false;
          state.processedRun = action.payload;
          state.currentStep = 4;
        },
        rejected: (state, action) => {
          state.isProcessing = false;
          state.error = action.error?.message ?? 'Failed to process payroll';
        },
      },
    ),
  }),
  selectors: {
    selectRunPayrollState: state => state,
    selectPayrollTotals: state => calculatePayrollTotals(state.worksheet),
  },
});

export const {
  setPayrollStep,
  setPayrollPeriod,
  setPayrollHours,
  resetRunPayroll,
  loadPayrollWorksheet,
  processPayroll,
} = runPayrollSlice.actions;

export const {
  selectRunPayrollState,
  selectPayrollTotals,
} = runPayrollSlice.selectors;
