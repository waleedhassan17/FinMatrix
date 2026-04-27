import type {
  TrialBalanceReport,
  TrialBalanceReportResponse,
} from '../models/trialBalanceModel';
import { unwrapEnvelope } from '../network/_reportHelpers';

export const trialBalanceSerializer = (
  payload: TrialBalanceReportResponse,
): TrialBalanceReport | null => unwrapEnvelope<TrialBalanceReport>(payload);
