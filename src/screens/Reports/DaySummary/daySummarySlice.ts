import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type {
  CompareKey,
  DayEntry,
  DayEntryFilter,
  DaySummary,
  DaySummarySchedule,
} from '../../../models/daySummaryModel';
import { toIsoDate } from '../../../models/reportModel';
import {
  getDayEntriesAPI,
  getDaySummaryAPI,
  getDaySummaryScheduleAPI,
  saveDaySummaryScheduleAPI,
} from '../../../networks/reports/daySummaryNetwork';
import {
  dayEntriesSerializer,
  daySummarySerializer,
  dayScheduleSerializer,
} from '../../../serializers/daySummarySerializer';

/** Rows per Day Book page; a normal day fits one. */
export const DAY_BOOK_PAGE = 50;

interface DaySummaryState {
  date: string;
  /** True once the user picked a day — focus no longer resets it to today. */
  isCustomDate: boolean;
  /** Owner only: one member's documents. */
  createdBy: string | null;
  compare: CompareKey;
  filter: DayEntryFilter;
  /** The Day Book search (document number or party). */
  query: string;

  summary: DaySummary | null;
  isLoading: boolean;
  error: string;

  entries: DayEntry[];
  entriesTotal: number;
  entriesPage: number;
  /** What the whole view (every page) counts, and leaves out. */
  entriesCounted: number;
  entriesExcluded: number;
  entriesLoading: boolean;
  entriesLoadingMore: boolean;
  entriesError: string;

  /** The dashboard's "Today" card — today, everyone (or own, for staff). */
  today: DaySummary | null;
  todayLoading: boolean;
  todayError: string;

  schedule: DaySummarySchedule | null;
  scheduleSaving: boolean;
  scheduleError: string;
}

const initialState: DaySummaryState = {
  date: toIsoDate(new Date()),
  isCustomDate: false,
  createdBy: null,
  compare: 'yesterday',
  filter: 'all',
  query: '',
  summary: null,
  isLoading: false,
  error: '',
  entries: [],
  entriesTotal: 0,
  entriesPage: 0,
  entriesCounted: 0,
  entriesExcluded: 0,
  entriesLoading: false,
  entriesLoadingMore: false,
  entriesError: '',
  today: null,
  todayLoading: false,
  todayError: '',
  schedule: null,
  scheduleSaving: false,
  scheduleError: '',
};

type SummaryArg = { date: string; createdBy: string | null };
type EntriesArg = { date: string; createdBy: string | null; filter: DayEntryFilter; query: string; page: number };

export const daySummarySlice = createAppSlice({
  name: 'daySummary',
  initialState,
  reducers: create => ({
    setDayDate: create.reducer((state, action: PayloadAction<string>) => {
      state.date = action.payload;
      state.isCustomDate = action.payload !== toIsoDate(new Date());
      // A filter or search chosen on one day means nothing on the next.
      state.filter = 'all';
      state.query = '';
    }),
    /**
     * Back to today unless the user chose a day. initialState is evaluated
     * once at bundle startup, so without this a phone left open overnight
     * keeps showing yesterday as "today". Screens dispatch it on focus.
     */
    refreshDayDate: create.reducer(state => {
      if (!state.isCustomDate) state.date = toIsoDate(new Date());
    }),
    /** Open a particular day — a notification, a deep link. */
    openDay: create.reducer((state, action: PayloadAction<string>) => {
      state.date = action.payload;
      state.isCustomDate = action.payload !== toIsoDate(new Date());
      state.filter = 'all';
      state.query = '';
    }),
    setDayFilter: create.reducer((state, action: PayloadAction<DayEntryFilter>) => {
      state.filter = action.payload;
    }),
    setDayCreatedBy: create.reducer((state, action: PayloadAction<string | null>) => {
      state.createdBy = action.payload;
      state.filter = 'all';
    }),
    setDayCompare: create.reducer((state, action: PayloadAction<CompareKey>) => {
      state.compare = action.payload;
    }),
    setDayQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.query = action.payload.trim().slice(0, 100);
    }),

    fetchDaySummary: create.asyncThunk(
      async (arg: SummaryArg) => daySummarySerializer(await getDaySummaryAPI(arg)),
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          // A slow answer for a day the user has already stepped away from
          // must not overwrite the day on screen.
          if (action.meta.arg.date !== state.date || action.meta.arg.createdBy !== state.createdBy) return;
          state.isLoading = false;
          state.summary = action.payload;
        },
        rejected: (state, action) => {
          if (action.meta.arg.date !== state.date) return;
          state.isLoading = false;
          state.error = action.error?.message ?? 'The day summary could not be loaded';
        },
      },
    ),

    fetchDayEntries: create.asyncThunk(
      async (arg: EntriesArg) =>
        dayEntriesSerializer(
          await getDayEntriesAPI({
            date: arg.date,
            type: arg.filter,
            createdBy: arg.createdBy,
            q: arg.query,
            page: arg.page,
            limit: DAY_BOOK_PAGE,
          }),
        ),
      {
        pending: (state, action) => {
          if (action.meta.arg.page > 1) state.entriesLoadingMore = true;
          else state.entriesLoading = true;
          state.entriesError = '';
        },
        fulfilled: (state, action) => {
          const a = action.meta.arg;
          // An answer for a view the user has left never replaces the one on screen.
          if (
            a.date !== state.date ||
            a.filter !== state.filter ||
            a.createdBy !== state.createdBy ||
            a.query !== state.query
          ) {
            return;
          }
          state.entriesLoading = false;
          state.entriesLoadingMore = false;
          state.entries = a.page > 1 ? [...state.entries, ...action.payload.items] : action.payload.items;
          state.entriesTotal = action.payload.total;
          state.entriesPage = a.page;
          state.entriesCounted = action.payload.countedTotal;
          state.entriesExcluded = action.payload.excludedTotal;
        },
        rejected: (state, action) => {
          state.entriesLoading = false;
          state.entriesLoadingMore = false;
          if (action.meta.arg.date === state.date) {
            state.entriesError = action.error?.message ?? 'The Day Book could not be loaded';
          }
        },
      },
    ),

    fetchDayToday: create.asyncThunk(async () => daySummarySerializer(await getDaySummaryAPI({})), {
      pending: state => {
        state.todayLoading = true;
        state.todayError = '';
      },
      fulfilled: (state, action) => {
        state.todayLoading = false;
        state.today = action.payload;
      },
      rejected: (state, action) => {
        state.todayLoading = false;
        state.todayError = action.error?.message ?? 'Could not load today';
      },
    }),

    fetchDaySchedule: create.asyncThunk(async () => dayScheduleSerializer(await getDaySummaryScheduleAPI()), {
      fulfilled: (state, action) => {
        state.schedule = action.payload;
      },
    }),

    saveDaySchedule: create.asyncThunk(
      async (patch: Partial<Pick<DaySummarySchedule, 'enabled' | 'hour' | 'email'>>) =>
        dayScheduleSerializer(await saveDaySummaryScheduleAPI(patch)),
      {
        pending: state => {
          state.scheduleSaving = true;
          state.scheduleError = '';
        },
        fulfilled: (state, action) => {
          state.scheduleSaving = false;
          state.schedule = action.payload;
        },
        rejected: (state, action) => {
          state.scheduleSaving = false;
          state.scheduleError = action.error?.message ?? 'Could not save the daily summary';
        },
      },
    ),
  }),
  selectors: {
    selectDaySummaryState: state => state,
  },
});

export const {
  setDayDate,
  refreshDayDate,
  openDay,
  setDayFilter,
  setDayCreatedBy,
  setDayCompare,
  setDayQuery,
  fetchDaySummary,
  fetchDayEntries,
  fetchDayToday,
  fetchDaySchedule,
  saveDaySchedule,
} = daySummarySlice.actions;

export const selectDaySummaryState = (rootState: { daySummary?: DaySummaryState }) =>
  rootState.daySummary ?? initialState;
