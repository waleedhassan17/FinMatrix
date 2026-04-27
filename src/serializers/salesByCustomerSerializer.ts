import type {
  SalesByCustomerReport,
  SalesByCustomerReportResponse,
} from '../models/salesByCustomerModel';
import { unwrapEnvelope } from '../network/_reportHelpers';

export const salesByCustomerSerializer = (
  payload: SalesByCustomerReportResponse,
): SalesByCustomerReport | null => unwrapEnvelope<SalesByCustomerReport>(payload);
