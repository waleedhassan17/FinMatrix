import type {
  SalesTaxReport,
  SalesTaxReportResponse,
} from '../models/salesTaxReportModel';
import { unwrapEnvelope } from '../network/_reportHelpers';

export const salesTaxReportSerializer = (
  payload: SalesTaxReportResponse,
): SalesTaxReport | null => unwrapEnvelope<SalesTaxReport>(payload);
