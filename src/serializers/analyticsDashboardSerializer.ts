import type {
  AnalyticsDashboardData,
  AnalyticsDashboardResponse,
} from '../models/analyticsDashboardModel';
import { unwrapEnvelope } from '../network/_reportHelpers';

export const analyticsDashboardSerializer = (
  payload: AnalyticsDashboardResponse,
): AnalyticsDashboardData | null => unwrapEnvelope<AnalyticsDashboardData>(payload);
