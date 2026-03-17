// ═══════════════════════════════════════════════════════
// FinMatrix — Employee Detail Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

export type EmployeeDetailTab = 'profile' | 'pay' | 'stubs';

export interface EmployeeDetailState {
  activeTab: EmployeeDetailTab;
}

const initialState: EmployeeDetailState = {
  activeTab: 'profile',
};

export const employeeDetailSlice = createAppSlice({
  name: 'employeeDetail',
  initialState,
  reducers: create => ({
    setEmployeeDetailTab: create.reducer((state, action: PayloadAction<EmployeeDetailTab>) => {
      state.activeTab = action.payload;
    }),
    resetEmployeeDetail: create.reducer(() => initialState),
  }),
  selectors: {
    selectEmployeeDetailTab: state => state.activeTab,
  },
});

export const {
  setEmployeeDetailTab,
  resetEmployeeDetail,
} = employeeDetailSlice.actions;

export const {
  selectEmployeeDetailTab,
} = employeeDetailSlice.selectors;
