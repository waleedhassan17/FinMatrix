import { simulateApiCall } from './apiHelpers';
import type {
  ConfirmReceiptPayload,
  ConfirmReceiptResponse,
  ConfirmReceiptResult,
  ReportIssuePayload,
  ReportIssueResponse,
  ReportIssueResult,
} from '../models/dpCustomerConfirmModel';

export const confirmCustomerReceiptAPI = async (
  payload: ConfirmReceiptPayload,
): Promise<ConfirmReceiptResponse> => {
  const result: ConfirmReceiptResult = {
    deliveryId: payload.deliveryId,
    verifiedAt: new Date().toISOString(),
    verifiedBy: payload.verifiedBy,
  };
  return simulateApiCall({ success: true, data: result }, 350);
};

export const reportDeliveryIssueAPI = async (
  payload: ReportIssuePayload,
): Promise<ReportIssueResponse> => {
  const result: ReportIssueResult = {
    deliveryId: payload.deliveryId,
    reportedAt: new Date().toISOString(),
    note: payload.note,
  };
  return simulateApiCall({ success: true, data: result }, 350);
};
