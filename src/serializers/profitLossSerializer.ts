import type { ProfitLossReport, ProfitLossReportResponse } from '../models/profitLossModel';
import { unwrapEnvelope } from '../network/_reportHelpers';

export const profitLossSerializer = (
  payload: ProfitLossReportResponse,
): ProfitLossReport | null => unwrapEnvelope<ProfitLossReport>(payload);
