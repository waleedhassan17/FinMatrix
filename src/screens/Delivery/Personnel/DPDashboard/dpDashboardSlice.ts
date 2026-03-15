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
  }),
  selectors: {
    selectHighlightNextDelivery: state => state.highlightNextDelivery,
  },
});

export const { toggleHighlightNextDelivery } = dpDashboardSlice.actions;
export const { selectHighlightNextDelivery } = dpDashboardSlice.selectors;
