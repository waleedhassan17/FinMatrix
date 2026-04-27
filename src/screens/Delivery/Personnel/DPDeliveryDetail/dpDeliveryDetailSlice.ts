// ═══════════════════════════════════════════════════════
// FinMatrix — DP Delivery Detail Slice (Delivery Execution flow)
// ═══════════════════════════════════════════════════════
// Co-located with DPDeliveryDetailScreen.tsx
// Owns ONLY UI state (items toggle).
// Architecture: feature data flows through the canonical delivery slice
// + models/deliveryModel.ts + network/deliveryNetwork.ts +
// serializers/deliverySerializer.ts (mirrors GL).

import { createAppSlice } from '@store/createAppSlice';

export interface DPDeliveryDetailSliceState {
  showItems: boolean;
}

const initialState: DPDeliveryDetailSliceState = {
  showItems: true,
};

export const dpDeliveryDetailSlice = createAppSlice({
  name: 'dpDeliveryDetail',
  initialState,
  reducers: create => ({
    toggleShowItems: create.reducer(state => {
      state.showItems = !state.showItems;
    }),
  }),
  selectors: {
    selectShowItems: state => state.showItems,
  },
});

export const { toggleShowItems } = dpDeliveryDetailSlice.actions;
export const { selectShowItems } = dpDeliveryDetailSlice.selectors;
