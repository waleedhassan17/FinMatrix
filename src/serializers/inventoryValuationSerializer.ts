import type {
  InventoryValuationReport,
  InventoryValuationReportResponse,
} from '../models/inventoryValuationModel';
import { unwrapEnvelope } from '../network/_reportHelpers';

export const inventoryValuationSerializer = (
  payload: InventoryValuationReportResponse,
): InventoryValuationReport | null => unwrapEnvelope<InventoryValuationReport>(payload);
