import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import { type ReportDateRange, getDefaultReportRange } from '../../../models/reportModel';
import type { GeneralLedgerReport, LedgerAccountsReport } from '../../../models/generalLedgerModel';
import { getGeneralLedgerAPI, getLedgerAccountsAPI } from '../../../networks/reports/generalLedgerNetwork';
import { generalLedgerSerializer, ledgerAccountsSerializer } from '../../../serializers/generalLedgerSerializer';

interface GeneralLedgerState {
  range: ReportDateRange;
  account: string | null;
  ledger: GeneralLedgerReport | null;
  accounts: LedgerAccountsReport | null;
  isLoading: boolean;
  error: string;
}

const initialState: GeneralLedgerState = {
  range: getDefaultReportRange(),
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

export const { setLedgerRange, setLedgerAccount, fetchGeneralLedger } = generalLedgerSlice.actions;
export const selectGeneralLedgerState = (rootState: { generalLedger?: GeneralLedgerState }) =>
  rootState.generalLedger ?? initialState;
