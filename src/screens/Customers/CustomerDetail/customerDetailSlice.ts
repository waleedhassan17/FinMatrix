// ═══════════════════════════════════════════════════════
// FinMatrix — Customer Detail Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

export type CustomerDetailTab = 'overview' | 'invoices' | 'payments';

export interface CustomerDetailSliceState {
  activeTab: CustomerDetailTab;
  status: 'idle' | 'loading' | 'failed';
  error: string;
}

const initialState: CustomerDetailSliceState = {
  activeTab: 'overview',
  status: 'idle',
  error: '',
};

export const customerDetailSlice = createAppSlice({
  name: 'customerDetail',
  initialState,
  reducers: create => ({
    setActiveTab: create.reducer((state, action: PayloadAction<CustomerDetailTab>) => {
      state.activeTab = action.payload;
    }),
    resetCustomerDetail: create.reducer(state => {
      state.activeTab = 'overview';
      state.status = 'idle';
      state.error = '';
    }),
  }),

  selectors: {
    selectCustomerDetailTab: state => state.activeTab,
    selectCustomerDetailStatus: state => state.status,
  },
});

export const {
  setActiveTab,
  resetCustomerDetail,
} = customerDetailSlice.actions;

export const {
  selectCustomerDetailTab,
  selectCustomerDetailStatus,
} = customerDetailSlice.selectors;
