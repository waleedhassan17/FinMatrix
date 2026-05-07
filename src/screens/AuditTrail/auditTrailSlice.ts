import { createAppSlice } from '@store/createAppSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  fetchAuditTrail as apiFetchAudit,
  type AuditFilters,
} from '../../network/auditSearchNetwork';
import type { AuditEntry, AuditModule, AuditAction } from '../../models/auditModel';

interface AuditTrailState {
  entries: AuditEntry[];
  isLoading: boolean;
  error: string | null;
  filterUser: string;
  filterModule: AuditModule | '';
  filterAction: AuditAction | '';
  selectedEntry: AuditEntry | null;
}

const initialState: AuditTrailState = {
  entries: [],
  isLoading: false,
  error: null,
  filterUser: '',
  filterModule: '',
  filterAction: '',
  selectedEntry: null,
};

export const auditTrailSlice = createAppSlice({
  name: 'auditTrail',
  initialState,
  reducers: create => ({
    setFilterUser: create.reducer((state, action: PayloadAction<string>) => {
      state.filterUser = action.payload;
    }),
    setFilterModule: create.reducer((state, action: PayloadAction<AuditModule | ''>) => {
      state.filterModule = action.payload;
    }),
    setFilterAction: create.reducer((state, action: PayloadAction<AuditAction | ''>) => {
      state.filterAction = action.payload;
    }),
    setSelectedEntry: create.reducer<AuditEntry | null>((state, action) => {
      state.selectedEntry = action.payload;
    }),
    clearFilters: create.reducer(state => {
      state.filterUser = '';
      state.filterModule = '';
      state.filterAction = '';
    }),
    fetchAuditTrail: create.asyncThunk(
      async (_: void, { getState }) => {
        const s = (getState() as { auditTrail: AuditTrailState }).auditTrail;
        const filters: AuditFilters = {};
        if (s.filterUser) filters.userId = s.filterUser;
        if (s.filterModule) filters.module = s.filterModule;
        if (s.filterAction) filters.action = s.filterAction;
        return apiFetchAudit(filters);
      },
      {
        pending: state => { state.isLoading = true; state.error = null; },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.entries = action.payload;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to load audit trail';
        },
      },
    ),
  }),
  selectors: {
    selectAuditEntries: state => state.entries,
    selectAuditLoading: state => state.isLoading,
    selectFilterUser: state => state.filterUser,
    selectFilterModule: state => state.filterModule,
    selectFilterAction: state => state.filterAction,
    selectSelectedEntry: state => state.selectedEntry,
  },
});

export const {
  setFilterUser, setFilterModule, setFilterAction,
  setSelectedEntry, clearFilters, fetchAuditTrail,
} = auditTrailSlice.actions;

export const {
  selectAuditEntries, selectAuditLoading,
  selectFilterUser, selectFilterModule, selectFilterAction,
  selectSelectedEntry,
} = auditTrailSlice.selectors;
