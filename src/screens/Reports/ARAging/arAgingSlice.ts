import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { AgingPresetKey, ARAgingReport } from '../../../models/arAgingModel';
import { getARAgingReportAPI } from '../../../networks/reports/arAgingNetwork';
import { updateSettingsAPI } from '../../../networks/settings/settingsNetwork';
import { arAgingSerializer } from '../../../serializers/arAgingSerializer';

export interface AgingSliceState {
  /**
   * null means "whatever this company's default is".
   *
   * The server resolves a saved preference when the request names no preset and
   * echoes back what it used, so the screen opens on the company default
   * without a separate settings round trip. It stops being null the moment the
   * first response lands, or the user picks a preset.
   */
  preset: AgingPresetKey | null;
  /** Ascending day boundaries for preset==='custom', e.g. '3,6,9,12'. */
  customBuckets: string;
  report: ARAgingReport | null;
  isLoading: boolean;
  error: string;
}

export const agingInitialState: AgingSliceState = {
  preset: null,
  customBuckets: '3,6,9,12',
  report: null,
  isLoading: false,
  error: '',
};

/**
 * The bucket request for the current state, or {} to mean "company default".
 *
 * A custom preset with no boundaries is not sent — the server rejects it, and
 * the user is mid-edit rather than mistaken.
 */
export const agingQueryFrom = (state: AgingSliceState): Record<string, string> => {
  if (!state.preset) return {};
  if (state.preset === 'custom') {
    return state.customBuckets.trim()
      ? { preset: 'custom', buckets: state.customBuckets.trim() }
      : {};
  }
  return { preset: state.preset };
};

/**
 * Remember the choice as the company default.
 *
 * Fails soft on purpose: PATCH /settings is admin-only, so a staff user gets a
 * 403. Their report is still bucketed the way they asked — only the
 * remembering is refused — and surfacing an error for that would be noise
 * about something they did not ask for.
 */
export const persistAgingPreference = async (
  preset: AgingPresetKey,
  customBuckets: string,
): Promise<void> => {
  try {
    await updateSettingsAPI({
      reportPreferences: {
        aging:
          preset === 'custom'
            ? { preset, buckets: customBuckets.trim() }
            : { preset },
      },
    });
  } catch {
    /* admin-only; a staff user keeps the view, just not the default. */
  }
};

export const arAgingSlice = createAppSlice({
  name: 'arAging',
  initialState: agingInitialState,
  reducers: create => ({
    setARAgingPreset: create.reducer((state, action: PayloadAction<AgingPresetKey>) => {
      state.preset = action.payload;
    }),
    setARAgingCustomBuckets: create.reducer((state, action: PayloadAction<string>) => {
      state.customBuckets = action.payload;
      state.preset = 'custom';
    }),
    fetchARAgingReport: create.asyncThunk(
      async (params: Record<string, string> = {}) =>
        arAgingSerializer(await getARAgingReportAPI(params)),
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.report = action.payload;
          // Adopt whatever the server actually used, so the chips agree with
          // the columns even on the first load, when we asked for nothing.
          if (action.payload?.preset) state.preset = action.payload.preset;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load AR aging';
        },
      },
    ),
  }),
  selectors: {
    selectARAgingState: state => state,
  },
});

export const { setARAgingPreset, setARAgingCustomBuckets, fetchARAgingReport } =
  arAgingSlice.actions;
export const selectARAgingState = (rootState: { arAging?: AgingSliceState }) =>
  rootState.arAging ?? agingInitialState;
