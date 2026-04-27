import type { ARAgingReport, ARAgingReportResponse } from '../models/arAgingModel';
import { unwrapEnvelope } from '../network/_reportHelpers';

export const arAgingSerializer = (
  payload: ARAgingReportResponse,
): ARAgingReport | null => unwrapEnvelope<ARAgingReport>(payload);
