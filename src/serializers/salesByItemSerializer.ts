import type {
  SalesByItemReport,
  SalesByItemReportResponse,
} from '../models/salesByItemModel';
import { unwrapEnvelope } from '../network/_reportHelpers';

export const salesByItemSerializer = (
  payload: SalesByItemReportResponse,
): SalesByItemReport | null => unwrapEnvelope<SalesByItemReport>(payload);
