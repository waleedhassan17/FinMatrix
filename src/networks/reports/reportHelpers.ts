// ═══════════════════════════════════════════════════════
// FinMatrix — Report Helpers (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from '../network/apiHelpers';

export const fetchReport = async (endpoint: string, params: any = {}): Promise<any> => {
  try {
    const response = await api.get(endpoint, { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

/** An Error that still knows what the server answered. */
export interface ReportHttpError extends Error {
  status?: number;
}

/**
 * `fetchReport`, but the HTTP status survives.
 *
 * The plain version collapses everything into `new Error(message)`, which is
 * right for a report that either loads or does not. It is wrong for an endpoint
 * the app can outrun: this build ships to phones and updates when the user lets
 * it, so it WILL meet a server that predates the route. Without the status a
 * 404 is indistinguishable from a network failure, and the screen offers a
 * retry button that can never succeed.
 */
export const fetchReportWithStatus = async (
  endpoint: string,
  params: any = {},
): Promise<any> => {
  try {
    const response = await api.get(endpoint, { params });
    return response.data;
  } catch (e: any) {
    const err: ReportHttpError = new Error(extractErrorMessage(e));
    err.status = e?.response?.status;
    throw err;
  }
};

/**
 * What a slice's `rejectWithValue` carries for a report request. Redux
 * serializes a thrown Error down to its message, so the status has to travel
 * as the payload or a 404 arrives as just another failure.
 */
export interface ReportRejection {
  message: string;
  status?: number;
}

export const toReportRejection = (e: unknown): ReportRejection => {
  const err = e as { message?: string; status?: number } | null;
  return { message: err?.message || 'Request failed', status: err?.status };
};

/** A 404 or 400 is an answer — the route or the record is not there — not a hiccup. */
export const isFinalRejection = (r: ReportRejection | undefined): boolean =>
  r?.status === 404 || r?.status === 400;

export const unwrapEnvelope = <T = any>(response: any): T => {
  if (response?.success && response?.data !== undefined) return response.data;
  if (response?.data?.success && response?.data?.data !== undefined) return response.data.data;
  return response?.data ?? response;
};
