// ═══════════════════════════════════════════════════════
// FinMatrix — App Container Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════
// Holds app-level state: readiness, network status, current user fetch.
// Lives alongside AppContainer.tsx in components/app-container/

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '../../store/createAppSlice';

export interface AppContainerSliceState {
  error: string;
  status: 'idle' | 'loading' | 'failed';
  isAppReady: boolean;
  networkIsDown: boolean;
}

const initialState: AppContainerSliceState = {
  error: '',
  status: 'idle',
  isAppReady: false,
  networkIsDown: false,
};

export const appContainerSlice = createAppSlice({
  name: 'appContainer',
  initialState,
  reducers: create => ({
    setAppIsReady: create.reducer(
      (state, action: PayloadAction<boolean>) => {
        state.isAppReady = action.payload;
      },
    ),
    setNetworkIsDown: create.reducer(
      (state, action: PayloadAction<boolean>) => {
        state.networkIsDown = action.payload;
      },
    ),
    setAppError: create.reducer(
      (state, action: PayloadAction<string>) => {
        state.error = action.payload;
      },
    ),
    clearAppError: create.reducer(state => {
      state.error = '';
    }),
  }),

  selectors: {
    selectAppStatus: state => state.status,
    selectAppError: state => state.error,
    selectIsAppReady: state => state.isAppReady,
    selectNetworkIsDown: state => state.networkIsDown,
  },
});

export const {
  setAppIsReady,
  setNetworkIsDown,
  setAppError,
  clearAppError,
} = appContainerSlice.actions;

export const {
  selectAppStatus,
  selectAppError,
  selectIsAppReady,
  selectNetworkIsDown,
} = appContainerSlice.selectors;
