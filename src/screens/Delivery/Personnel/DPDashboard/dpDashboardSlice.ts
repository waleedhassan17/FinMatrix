// ═══════════════════════════════════════════════════════
// FinMatrix — DP Dashboard Slice (GL pattern)
// ═══════════════════════════════════════════════════════
// Co-located with DPDashboardScreen.tsx. Owns the dashboard's own UI state and
// nothing else.
//
// It used to carry a `startDelivery` thunk as well, which advanced a delivery
// through its own network call and serializer. That went when the dashboard
// stopped nominating a single job: the rider can now act on any delivery from
// either the dashboard or the Deliveries tab, and both go through
// `updateDeliveryExecutionStatus` in dpDeliveryDetailSlice — which accepts
// every status a rider can advance into (this one stopped at in_transit) and
// sends a GPS ping first, so acting on a job also keeps the rider visible on
// the monitor.
//
// Two thunks doing one job is how three copies of the "what is the next legal
// step" logic accumulated, so the duplicate is gone rather than left dormant.

import { createAppSlice } from '@store/createAppSlice';

export interface DPDashboardSliceState {
  highlightNextDelivery: boolean;
}

const initialState: DPDashboardSliceState = {
  highlightNextDelivery: true,
};

export const dpDashboardSlice = createAppSlice({
  name: 'dpDashboard',
  initialState,
  reducers: create => ({
    toggleHighlightNextDelivery: create.reducer(state => {
      state.highlightNextDelivery = !state.highlightNextDelivery;
    }),
    resetDashboardState: create.reducer(() => initialState),
  }),
  selectors: {
    selectHighlightNextDelivery: state => state.highlightNextDelivery,
    selectDPDashboardState: state => state,
  },
});

export const { toggleHighlightNextDelivery, resetDashboardState } = dpDashboardSlice.actions;
export const { selectHighlightNextDelivery, selectDPDashboardState } = dpDashboardSlice.selectors;
