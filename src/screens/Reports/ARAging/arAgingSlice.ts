import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import {
  emptyPartyDocs,
  type AgingPresetKey,
  type AgingSort,
  type ARAgingReport,
  type PartyDocsState,
} from '../../../models/arAgingModel';
import {
  getARAgingPartyDocumentsAPI,
  getARAgingReportAPI,
} from '../../../networks/reports/arAgingNetwork';
import type { ReportHttpError } from '../../../networks/reports/reportHelpers';
import { updateSettingsAPI } from '../../../networks/settings/settingsNetwork';
import {
  agingPartyDocumentsSerializer,
  arAgingSerializer,
} from '../../../serializers/arAgingSerializer';

/** How many documents one expanded party pulls. */
export const PARTY_DOCS_LIMIT = 50;

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
  /** The bucket being investigated. Validated against the payload on read. */
  selectedBucket: string | null;
  /** null means "follow whatever the default is for the current selection". */
  sort: AgingSort | null;
  /** Which party rows are open, keyed by party id. */
  expanded: Record<string, boolean>;
  /**
   * The documents behind each opened party, keyed by party id rather than held
   * as a single "open party" — so several can stay open and a party already
   * fetched reopens instantly. Same shape as profitLossSlice.entries.
   */
  documents: Record<string, PartyDocsState>;
}

export const agingInitialState: AgingSliceState = {
  preset: null,
  customBuckets: '3,6,9,12',
  report: null,
  isLoading: false,
  error: '',
  selectedBucket: null,
  sort: null,
  expanded: {},
  documents: {},
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
 * Changing the bucket set invalidates the investigation built on top of it.
 *
 * A `d31to60` selection means nothing under `days3`, the order that selection
 * implied is no longer the right default, and any open panel holds documents
 * labelled with columns that are about to leave the screen. Clearing all four
 * together is the invariant — figures stay right while the rows underneath
 * them come from a different bucket scheme is exactly the kind of wrongness
 * nobody reports because nothing looks broken.
 */
export const clearAgingInvestigation = (state: AgingSliceState): void => {
  state.selectedBucket = null;
  state.sort = null;
  state.expanded = {};
  state.documents = {};
};

/** The drill-down query for a party: the report's spec, plus any bucket filter. */
export const agingDetailQueryFrom = (
  state: AgingSliceState,
): Record<string, string> => ({
  ...agingQueryFrom(state),
  ...(state.selectedBucket ? { bucket: state.selectedBucket } : {}),
  limit: String(PARTY_DOCS_LIMIT),
});

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
      clearAgingInvestigation(state);
    }),
    setARAgingCustomBuckets: create.reducer((state, action: PayloadAction<string>) => {
      state.customBuckets = action.payload;
      state.preset = 'custom';
      clearAgingInvestigation(state);
    }),
    setARAgingBucket: create.reducer((state, action: PayloadAction<string | null>) => {
      state.selectedBucket = action.payload;
      // The open panels were fetched under a different filter, so their
      // contents no longer match the row they sit under.
      state.expanded = {};
      state.documents = {};
    }),
    setARAgingSort: create.reducer((state, action: PayloadAction<AgingSort>) => {
      state.sort = action.payload;
    }),
    toggleARAgingParty: create.reducer((state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.expanded[id] = !state.expanded[id];
    }),
    fetchARAgingPartyDocuments: create.asyncThunk(
      async (payload: { partyId: string; query: Record<string, string> }) =>
        agingPartyDocumentsSerializer(
          await getARAgingPartyDocumentsAPI(payload.partyId, payload.query),
        ),
      {
        pending: (state, action) => {
          state.documents[action.meta.arg.partyId] = {
            ...emptyPartyDocs,
            status: 'loading',
          };
        },
        fulfilled: (state, action) => {
          state.documents[action.meta.arg.partyId] = {
            status: 'succeeded',
            error: '',
            data: action.payload,
          };
        },
        rejected: (state, action) => {
          // A 404 means this build is newer than the server it is talking to,
          // not that anything failed. Retrying cannot fix that, so it gets its
          // own state and the panel offers no retry button.
          const status = (action.error as ReportHttpError)?.status;
          const unavailable =
            status === 404 || /not found/i.test(action.error?.message ?? '');
          state.documents[action.meta.arg.partyId] = {
            status: unavailable ? 'unavailable' : 'failed',
            error: action.error?.message ?? 'Failed to load documents',
            data: null,
          };
        },
      },
    ),
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

export const {
  setARAgingPreset,
  setARAgingCustomBuckets,
  setARAgingBucket,
  setARAgingSort,
  toggleARAgingParty,
  fetchARAgingReport,
  fetchARAgingPartyDocuments,
} = arAgingSlice.actions;
export const selectARAgingState = (rootState: { arAging?: AgingSliceState }) =>
  rootState.arAging ?? agingInitialState;
