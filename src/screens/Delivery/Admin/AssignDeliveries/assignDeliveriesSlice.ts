import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';

type AssignTab = 'assign' | 'monitor' | 'approvals';

export interface AssignDeliveriesSliceState {
  activeTab: AssignTab;
  selectedDate: string;
  showCreateForm: boolean;
  selectedDeliveryIds: string[];
  selectedPersonnelId: string;
}

const today = new Date().toISOString().slice(0, 10);

const initialState: AssignDeliveriesSliceState = {
  activeTab: 'assign',
  selectedDate: today,
  showCreateForm: false,
  selectedDeliveryIds: [],
  selectedPersonnelId: '',
};

export const assignDeliveriesSlice = createAppSlice({
  name: 'assignDeliveries',
  initialState,
  reducers: create => ({
    setActiveTab: create.reducer((state, action: PayloadAction<AssignTab>) => {
      state.activeTab = action.payload;
    }),
    setSelectedDate: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    }),
    toggleCreateForm: create.reducer((state, action: PayloadAction<boolean | undefined>) => {
      state.showCreateForm = action.payload ?? !state.showCreateForm;
    }),
    toggleDeliverySelection: create.reducer((state, action: PayloadAction<string>) => {
      if (state.selectedDeliveryIds.includes(action.payload)) {
        state.selectedDeliveryIds = state.selectedDeliveryIds.filter(id => id !== action.payload);
      } else {
        state.selectedDeliveryIds.push(action.payload);
      }
    }),
    clearSelectedDeliveries: create.reducer(state => {
      state.selectedDeliveryIds = [];
    }),
    setSelectedPersonnelId: create.reducer((state, action: PayloadAction<string>) => {
      state.selectedPersonnelId = action.payload;
    }),
  }),
  selectors: {
    selectActiveTab: state => state.activeTab,
    selectSelectedDate: state => state.selectedDate,
    selectShowCreateForm: state => state.showCreateForm,
    selectSelectedDeliveryIds: state => state.selectedDeliveryIds,
    selectSelectedPersonnelId: state => state.selectedPersonnelId,
  },
});

export const {
  setActiveTab,
  setSelectedDate,
  toggleCreateForm,
  toggleDeliverySelection,
  clearSelectedDeliveries,
  setSelectedPersonnelId,
} = assignDeliveriesSlice.actions;

export const {
  selectActiveTab,
  selectSelectedDate,
  selectShowCreateForm,
  selectSelectedDeliveryIds,
  selectSelectedPersonnelId,
} = assignDeliveriesSlice.selectors;
