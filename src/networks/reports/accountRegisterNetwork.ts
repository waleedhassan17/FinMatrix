// ═══════════════════════════════════════════════════════
// FinMatrix — Account register & movement (reports v2)
// ═══════════════════════════════════════════════════════

import { fetchReportWithStatus } from './reportHelpers';
import type { RegisterOrder } from '../../models/accountRegisterModel';

/**
 * Every posting to one account over a period, with the running balance.
 *
 * `accountCode` is the account NUMBER ('1000'), the handle every statement
 * line carries. With status: a phone can meet a server that predates this
 * route, and a 404 must not offer a retry that can never succeed.
 */
export const getAccountRegisterAPI = async (
  accountCode: string,
  params: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    order?: RegisterOrder;
  } = {},
): Promise<any> =>
  fetchReportWithStatus(`/reports/accounts/${encodeURIComponent(accountCode)}/register`, params);

/** Who and what moved an account between two periods. */
export const getAccountMovementAPI = async (
  accountCode: string,
  params: {
    startDate: string;
    endDate: string;
    compareStartDate: string;
    compareEndDate: string;
    limit?: number;
  },
): Promise<any> =>
  fetchReportWithStatus(`/reports/accounts/${encodeURIComponent(accountCode)}/movement`, params);
