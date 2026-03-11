import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Company } from '../types';

interface CompanyState {
  company: Company | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CompanyState = {
  company: null,
  isLoading: false,
  error: null,
};

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    setCompany(state, action: PayloadAction<Company>) {
      state.company = action.payload;
      state.error = null;
    },
    clearCompany(state) {
      state.company = null;
    },
    setCompanyLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setCompanyError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  setCompany,
  clearCompany,
  setCompanyLoading,
  setCompanyError,
} = companySlice.actions;

export default companySlice.reducer;
