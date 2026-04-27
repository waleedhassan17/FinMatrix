import type { CashFlowReport, CashFlowReportResponse } from '../models/cashFlowModel';
import { unwrapEnvelope } from '../network/_reportHelpers';

export const cashFlowSerializer = (
  payload: CashFlowReportResponse,
): CashFlowReport | null => unwrapEnvelope<CashFlowReport>(payload);
