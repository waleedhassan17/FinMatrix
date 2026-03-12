// ═══════════════════════════════════════════════════════
// FinMatrix — JE Detail Slice (createAppSlice)
// ═══════════════════════════════════════════════════════

import { createAppSlice } from '@store/createAppSlice';

export interface JEDetailSliceState {
  /* placeholder for future tabs / state */
  _placeholder: boolean;
}

const initialState: JEDetailSliceState = { _placeholder: false };

export const jeDetailSlice = createAppSlice({
  name: 'jeDetail',
  initialState,
  reducers: () => ({}),
  selectors: {},
});
