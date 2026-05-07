import { createAppSlice } from '@store/createAppSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import { searchAll } from '../../network/auditSearchNetwork';
import type { SearchResult, SearchModule } from '../../models/auditModel';

interface GlobalSearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  recentSearches: string[];
}

const initialState: GlobalSearchState = {
  query: '',
  results: [],
  isSearching: false,
  recentSearches: ['Karachi Electronics', 'INV-1042', 'Copper Wire', 'Pak Steel'],
};

export const globalSearchSlice = createAppSlice({
  name: 'globalSearch',
  initialState,
  reducers: create => ({
    setQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.query = action.payload;
    }),
    clearSearch: create.reducer(state => {
      state.query = '';
      state.results = [];
    }),
    addRecentSearch: create.reducer((state, action: PayloadAction<string>) => {
      state.recentSearches = [
        action.payload,
        ...state.recentSearches.filter(s => s !== action.payload),
      ].slice(0, 8);
    }),
    performSearch: create.asyncThunk(
      async (query: string) => searchAll(query),
      {
        pending: state => { state.isSearching = true; },
        fulfilled: (state, action) => {
          state.isSearching = false;
          state.results = action.payload;
        },
        rejected: state => {
          state.isSearching = false;
          state.results = [];
        },
      },
    ),
  }),
  selectors: {
    selectSearchQuery: state => state.query,
    selectSearchResults: state => state.results,
    selectIsSearching: state => state.isSearching,
    selectRecentSearches: state => state.recentSearches,
  },
});

export const { setQuery, clearSearch, addRecentSearch, performSearch } = globalSearchSlice.actions;
export const { selectSearchQuery, selectSearchResults, selectIsSearching, selectRecentSearches } = globalSearchSlice.selectors;
