import { createAppSlice } from '@store/createAppSlice';
import {
  confirmContactsConsentAPI,
  getMessagingSettingsAPI,
  getMessagingStatsAPI,
  updateMessagingSettingsAPI,
  type MessagingSettingsPatch,
} from '../../../networks/messaging/messagingNetwork';
import type { MessagingSettings, MessagingStats } from '../../../models/messagingModel';

/**
 * FinMatrix Connect settings for the session. Read by every screen that
 * decides whether to offer server-sent WhatsApp (see useWhatsappConnect), so
 * it is loaded once and kept here; not persisted (it is re-read per session).
 */
interface WhatsAppConnectState {
  settings: MessagingSettings | null;
  /** The settings request finished (even with an error) — stop asking. */
  loaded: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  stats: MessagingStats | null;
  statsLoading: boolean;
}

const initialState: WhatsAppConnectState = {
  settings: null,
  loaded: false,
  isLoading: false,
  isSaving: false,
  error: null,
  stats: null,
  statsLoading: false,
};

export const whatsAppConnectSlice = createAppSlice({
  name: 'whatsAppConnect',
  initialState,
  reducers: create => ({
    fetchMessagingSettings: create.asyncThunk(async () => getMessagingSettingsAPI(), {
      pending: state => {
        state.isLoading = true;
        state.error = null;
      },
      fulfilled: (state, action) => {
        state.isLoading = false;
        state.loaded = true;
        state.settings = action.payload;
      },
      rejected: (state, action) => {
        state.isLoading = false;
        state.loaded = true;
        // A 403 (feature not on this plan) simply means "no Connect".
        state.settings = null;
        state.error = action.error?.message ?? 'Could not load WhatsApp settings';
      },
    }),
    saveMessagingSettings: create.asyncThunk(
      async (patch: MessagingSettingsPatch, thunkAPI) =>
        updateMessagingSettingsAPI(patch).catch((e: any) =>
          thunkAPI.rejectWithValue({ message: e?.message ?? 'Could not save', code: e?.code }),
        ),
      {
        pending: state => {
          state.isSaving = true;
          state.error = null;
        },
        fulfilled: (state, action) => {
          state.isSaving = false;
          state.settings = action.payload;
        },
        rejected: (state, action) => {
          state.isSaving = false;
          state.error = (action.payload as any)?.message ?? action.error?.message ?? 'Could not save';
        },
      },
    ),
    confirmContactsConsent: create.asyncThunk(async () => confirmContactsConsentAPI(), {
      fulfilled: (state, action) => {
        state.settings = action.payload;
      },
    }),
    fetchMessagingStats: create.asyncThunk(async () => getMessagingStatsAPI(), {
      pending: state => {
        state.statsLoading = true;
      },
      fulfilled: (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload;
      },
      rejected: state => {
        state.statsLoading = false;
      },
    }),
  }),
  selectors: {
    selectMessagingSettings: state => state.settings,
    selectMessagingSettingsLoaded: state => state.loaded,
    selectMessagingSettingsLoading: state => state.isLoading,
    selectMessagingSaving: state => state.isSaving,
    selectMessagingError: state => state.error,
    selectMessagingStats: state => state.stats,
    selectMessagingStatsLoading: state => state.statsLoading,
  },
});

export const { fetchMessagingSettings, saveMessagingSettings, confirmContactsConsent, fetchMessagingStats } =
  whatsAppConnectSlice.actions;
export const {
  selectMessagingSettings,
  selectMessagingSettingsLoaded,
  selectMessagingSettingsLoading,
  selectMessagingSaving,
  selectMessagingError,
  selectMessagingStats,
  selectMessagingStatsLoading,
} = whatsAppConnectSlice.selectors;
export default whatsAppConnectSlice.reducer;
