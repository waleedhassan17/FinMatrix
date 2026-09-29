import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  appendUnique,
  documentListSummaryOf,
  listPaginationOf,
  LIST_PAGE_SIZE,
  type DocumentListSummary,
} from '../models/documentListModel';

export interface PagedList<T> {
  /** The pages loaded so far, in the server's order. */
  rows: T[];
  /** The server's counts over everything the filters match (null from an older server). */
  summary: DocumentListSummary | null;
  /** The summary as sent, for a list's own figures (value on order, …). */
  extras: Record<string, any>;
  /** Rows the filters match in all — may exceed what has loaded. */
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string;
  /** Page one again, with the current filters (pull to refresh, retry). */
  reload: () => void;
  /** The next page, appended — a FlatList's onEndReached or a "Load more". */
  loadMore: () => void;
}

/**
 * A list the SERVER pages, searches and filters — what the invoice list does,
 * for every other list screen.
 *
 * Those screens fetched one page (50, or the server's default 20) and then
 * searched, filtered and counted it on the phone: an older document could not
 * be found, a tab showed only what was among the first 50, and the tab counts
 * stopped at 50. Here the filters go to the server, more loads as the list
 * scrolls, and the counts come from the server's summary.
 *
 * `key` must change with every filter (search, tab) so a change starts over at
 * page one. The list reloads when the screen comes into focus and when `key`
 * changes; an answer for filters no longer on screen is dropped.
 */
export function usePagedList<T>(
  fetchPage: (page: number, limit: number) => Promise<any>,
  serialize: (payload: any) => T[],
  key: string,
  options: { enabled?: boolean; keyOf?: (row: T) => string | undefined; limit?: number } = {},
): PagedList<T> {
  const { enabled = true, keyOf, limit = LIST_PAGE_SIZE } = options;
  const [rows, setRows] = useState<T[]>([]);
  const [summary, setSummary] = useState<DocumentListSummary | null>(null);
  const [extras, setExtras] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // Loading from the start, so an empty list is not shown before the first answer.
  const [isLoading, setIsLoading] = useState(enabled);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // The latest callbacks, so reload/loadMore keep one identity per `key`.
  // Synced before the focus effect below runs (effects run in order).
  const fetchRef = useRef(fetchPage);
  const serializeRef = useRef(serialize);
  const keyOfRef = useRef(keyOf);
  useEffect(() => {
    fetchRef.current = fetchPage;
    serializeRef.current = serialize;
    keyOfRef.current = keyOf;
  });

  /** Bumped by every reload: a page from an older generation is dropped. */
  const generation = useRef(0);
  const moreInFlight = useRef(false);

  const reload = useCallback(() => {
    if (!enabled) return;
    const gen = ++generation.current;
    moreInFlight.current = false;
    setIsLoading(true);
    setIsLoadingMore(false);
    setError('');
    fetchRef.current(1, limit)
      .then(payload => {
        if (gen !== generation.current) return;
        const next = serializeRef.current(payload);
        const p = listPaginationOf(payload, next.length);
        setRows(next);
        setPage(1);
        setTotalPages(p.totalPages);
        setTotal(p.total);
        setSummary(documentListSummaryOf(payload));
        setExtras(payload?.summary && typeof payload.summary === 'object' ? payload.summary : {});
      })
      .catch((e: unknown) => {
        if (gen !== generation.current) return;
        setError(e instanceof Error ? e.message : 'Could not load the list');
      })
      .finally(() => {
        if (gen === generation.current) setIsLoading(false);
      });
    // `key` is what makes a new reload: the filters live in fetchPage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, limit]);

  const loadMore = useCallback(() => {
    if (!enabled || isLoading || moreInFlight.current || page >= totalPages) return;
    const gen = generation.current;
    moreInFlight.current = true;
    setIsLoadingMore(true);
    fetchRef.current(page + 1, limit)
      .then(payload => {
        if (gen !== generation.current) return;
        const next = serializeRef.current(payload);
        const p = listPaginationOf(payload, next.length);
        setRows(prev => appendUnique(prev, next, keyOfRef.current));
        setPage(page + 1);
        setTotalPages(p.totalPages);
        setTotal(p.total);
      })
      .catch(() => { /* the footer stays; scrolling again retries */ })
      .finally(() => {
        if (gen !== generation.current) return;
        moreInFlight.current = false;
        setIsLoadingMore(false);
      });
  }, [enabled, isLoading, page, totalPages, limit]);

  // On focus (coming back from a form) and whenever the filters change.
  useFocusEffect(reload);

  return {
    rows, summary, extras, total,
    hasMore: page < totalPages,
    isLoading, isLoadingMore, error,
    reload, loadMore,
  };
}

/** `value`, once it has stopped changing for `ms` — a search box's query. */
export function useDebouncedValue<T>(value: T, ms = 350): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}
