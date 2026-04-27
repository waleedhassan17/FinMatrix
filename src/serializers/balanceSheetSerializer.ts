import type { BalanceSheetReport, BalanceSheetReportResponse } from '../models/balanceSheetModel';
import { unwrapEnvelope } from '../network/_reportHelpers';

export const balanceSheetSerializer = (
  payload: BalanceSheetReportResponse,
): BalanceSheetReport | null => unwrapEnvelope<BalanceSheetReport>(payload);
