import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { PayrollRunRecord } from '../../../models/payrollModel';
import { getPayrollRunByIdAPI, getPayrollRunsAPI } from '../../../network/payrollNetwork';
import {
  payrollRunListSerializer,
  payrollRunSingleSerializer,
} from '../../../serializers/payrollSerializer';

interface PayrollHistoryState {
  runs: PayrollRunRecord[];
  selectedRun: PayrollRunRecord | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string;
}

const initialState: PayrollHistoryState = {
  runs: [],
  selectedRun: null,
  isLoading: false,
  isLoadingDetail: false,
  error: '',
};

export const payrollHistorySlice = createAppSlice({
  name: 'payrollHistory',
  initialState,
  reducers: create => ({
    clearSelectedPayrollRun: create.reducer(state => {
      state.selectedRun = null;
    }),

    setSelectedPayrollRunId: create.reducer((state, action: PayloadAction<string>) => {
      const found = state.runs.find(r => r.id === action.payload);
      if (found) state.selectedRun = found;
    }),

    fetchPayrollHistory: create.asyncThunk(
      async () => {
        const envelope = await getPayrollRunsAPI();
        return payrollRunListSerializer(envelope);
      },
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.runs = action.payload;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load payroll history';
        },
      },
    ),

    fetchPayrollRunDetail: create.asyncThunk(
      async (runId: string) => {
        const envelope = await getPayrollRunByIdAPI(runId);
        return payrollRunSingleSerializer(envelope);
      },
      {
        pending: state => {
          state.isLoadingDetail = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.isLoadingDetail = false;
          state.selectedRun = action.payload;
        },
        rejected: (state, action) => {
          state.isLoadingDetail = false;
          state.error = action.error?.message ?? 'Failed to load payroll run details';
        },
      },
    ),
  }),
  selectors: {
    selectPayrollHistoryState: state => state,
  },
});

export const {
  clearSelectedPayrollRun,
  setSelectedPayrollRunId,
  fetchPayrollHistory,
  fetchPayrollRunDetail,
} = payrollHistorySlice.actions;

export const {
  selectPayrollHistoryState,
} = payrollHistorySlice.selectors;
