import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import { type ReportDateRange, getDefaultReportRange } from '../../../models/reportModel';
import type { GeneralLedgerReport, LedgerAccountsReport } from '../../../models/generalLedgerModel';
import { getGeneralLedgerAPI, getLedgerAccountsAPI } from '../../../networks/reports/generalLedgerNetwork';
import { generalLedgerSerializer, ledgerAccountsSerializer } from '../../../serializers/generalLedgerSerializer';

interface GeneralLedgerState {
  range: ReportDateRange;
  /** True once the user picks their own dates — see getDefaultReportRange. */
  isCustomRange: boolean;
  account: string | null;
  ledger: GeneralLedgerReport | null;
  accounts: LedgerAccountsReport | null;
  isLoading: boolean;
  error: string;
}

const initialState: GeneralLedgerState = {
  range: getDefaultReportRange(),
  isCustomRange: false,
  account: null,
  ledger: null,
  accounts: null,
  isLoading: false,
  error: '',
};

export const generalLedgerSlice = createAppSlice({
  name: 'generalLedger',
  initialState,
  reducers: create => ({
    setLedgerRange: create.reducer((state, action: PayloadAction<ReportDateRange>) => {
      state.range = action.payload;
      state.isCustomRange = true;
    }),
    /**
     * Re-seed the window to today unless the user chose their own.
     *
     * initialState is evaluated once at bundle startup, so without this the
     * range freezes on the day the app launched and the report silently
     * stops including anything newer. Screens dispatch this on focus.
     */
    refreshLedgerRange: create.reducer(state => {
      if (state.isCustomRange) return;
      const next = getDefaultReportRange();
      // Replaced only when the day has actually moved on. Assigning a fresh
      // object with the same dates changed the range's identity on every
      // focus; the screen's focus effect is keyed on it (through `reload`), so
      // it re-ran, dispatched this again, and looped until React gave up with
      // "Maximum update depth exceeded" — the ledger would not open.
      if (next.startDate !== state.range.startDate || next.endDate !== state.range.endDate) {
        state.range = next;
      }
    }),
    setLedgerAccount: create.reducer((state, action: PayloadAction<string | null>) => {
      state.account = action.payload;
    }),
    fetchGeneralLedger: create.asyncThunk(
      async (payload: { range: ReportDateRange; account: string | null }) => {
        const [ledger, accounts] = await Promise.all([
          getGeneralLedgerAPI({ ...payload.range, account: payload.account ?? undefined }),
          getLedgerAccountsAPI(payload.range),
        ]);
        return {
          ledger: generalLedgerSerializer(ledger),
          accounts: ledgerAccountsSerializer(accounts),
        };
      },
      {
        pending: state => { state.isLoading = true; state.error = ''; },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.ledger = action.payload.ledger;
          state.accounts = action.payload.accounts;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load general ledger';
        },
      },
    ),
  }),
  selectors: { selectGeneralLedgerState: state => state },
});

export const { setLedgerRange, refreshLedgerRange, setLedgerAccount, fetchGeneralLedger } = generalLedgerSlice.actions;
export const selectGeneralLedgerState = (rootState: { generalLedger?: GeneralLedgerState }) =>
  rootState.generalLedger ?? initialState;
