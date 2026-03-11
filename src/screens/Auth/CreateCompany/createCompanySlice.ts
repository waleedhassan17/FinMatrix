import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

export interface CreateCompanySliceState {
  currentStep: number;
  status: 'idle' | 'loading' | 'failed';
  error: string;
}

const initialState: CreateCompanySliceState = {
  currentStep: 0,
  status: 'idle',
  error: '',
};

export const createCompanySlice = createAppSlice({
  name: 'createCompany',
  initialState,
  reducers: create => ({
    setStep: create.reducer(
      (state, action: PayloadAction<number>) => {
        state.currentStep = action.payload;
      },
    ),
    nextStep: create.reducer(state => {
      state.currentStep += 1;
    }),
    prevStep: create.reducer(state => {
      if (state.currentStep > 0) state.currentStep -= 1;
    }),
    setCreateCompanyError: create.reducer(
      (state, action: PayloadAction<string>) => {
        state.status = 'failed';
        state.error = action.payload;
      },
    ),
    resetCreateCompany: create.reducer(state => {
      state.currentStep = 0;
      state.status = 'idle';
      state.error = '';
    }),
  }),

  selectors: {
    selectCreateCompanyStep: state => state.currentStep,
    selectCreateCompanyStatus: state => state.status,
    selectCreateCompanyError: state => state.error,
  },
});

export const {
  setStep,
  nextStep,
  prevStep,
  setCreateCompanyError,
  resetCreateCompany,
} = createCompanySlice.actions;

export const {
  selectCreateCompanyStep,
  selectCreateCompanyStatus,
  selectCreateCompanyError,
} = createCompanySlice.selectors;
