import { fetchReport } from './reportHelpers';
import { type TrialBalanceParams, trialBalanceParams } from '../../models/trialBalanceModel';

/**
 * `mode` (reports v2) — closing, working or movement — adds each row's group
 * and flags and the group subtotals. Left out, the server answers with the
 * period movement exactly as it did before v2. A closing request carries no
 * start date — see trialBalanceParams.
 */
export const getTrialBalanceAPI = async (params: TrialBalanceParams = {}): Promise<any> =>
  fetchReport('/reports/trial-balance', trialBalanceParams(params));

export const getTrialBalanceReportAPI = getTrialBalanceAPI;
