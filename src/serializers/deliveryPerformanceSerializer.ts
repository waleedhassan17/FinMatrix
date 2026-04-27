import type {
  DeliveryPerformanceReport,
  DeliveryPerformanceReportResponse,
} from '../models/deliveryPerformanceModel';
import { unwrapEnvelope } from '../network/_reportHelpers';

export const deliveryPerformanceSerializer = (
  payload: DeliveryPerformanceReportResponse,
): DeliveryPerformanceReport | null => unwrapEnvelope<DeliveryPerformanceReport>(payload);
