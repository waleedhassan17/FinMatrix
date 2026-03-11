// ═══════════════════════════════════════════════════════
// FinMatrix — Onboarding Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Co-located with OnboardingScreen.tsx

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../store/createAppSlice';

export interface OnboardingSliceState {
  currentPage: number;
  status: 'idle' | 'loading' | 'failed';
  error: string;
}

const initialState: OnboardingSliceState = {
  currentPage: 0,
  status: 'idle',
  error: '',
};

export const onboardingSlice = createAppSlice({
  name: 'onboarding',
  initialState,
  reducers: create => ({
    setCurrentPage: create.reducer(
      (state, action: PayloadAction<number>) => {
        state.currentPage = action.payload;
      },
    ),
    resetOnboarding: create.reducer(state => {
      state.currentPage = 0;
      state.status = 'idle';
      state.error = '';
    }),
  }),

  selectors: {
    selectCurrentPage: state => state.currentPage,
    selectOnboardingStatus: state => state.status,
    selectOnboardingError: state => state.error,
  },
});

export const { setCurrentPage, resetOnboarding } = onboardingSlice.actions;

export const {
  selectCurrentPage,
  selectOnboardingStatus,
  selectOnboardingError,
} = onboardingSlice.selectors;
