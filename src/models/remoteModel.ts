// One fetched resource inside a slice, beside the report it belongs to — the
// health strip under a balance sheet, a rollforward sheet, a hub tile. Each
// fails on its own: a missing KPI endpoint must not blank the statement.

export type RemoteStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export interface Remote<T> {
  status: RemoteStatus;
  error: string;
  /** The last good value, kept through a refetch and a failed one. */
  data: T | null;
  /** The server answered 404/400: the route is not there. Final, not retried. */
  notFound?: boolean;
}

export const remoteIdle = <T>(): Remote<T> => ({ status: 'idle', error: '', data: null });

export const remoteLoading = <T>(prev: Remote<T> | undefined): Remote<T> => ({
  status: 'loading',
  error: '',
  data: prev?.data ?? null,
});

export const remoteDone = <T>(data: T | null): Remote<T> => ({ status: 'succeeded', error: '', data });

export const remoteFailed = <T>(
  prev: Remote<T> | undefined,
  error: string,
  notFound = false,
): Remote<T> => ({ status: 'failed', error, data: prev?.data ?? null, notFound });
