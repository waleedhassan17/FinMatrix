// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from '../network/apiHelpers';
import type { AdjustmentReason } from '../../models/adjustmentModel';

export interface InventoryQueryParams {
  search?: string;
  category?: string;
  stockStatus?: string;
  agencyId?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export const getInventoryItemsAPI = async (params: InventoryQueryParams = {}): Promise<any> => {
  try {
    const queryParams = { page: 1, limit: 50, ...params };
    const response = await api.get('/inventory/items', { params: queryParams });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getInventoryItemByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/inventory/items/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createInventoryItemAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/inventory/items', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateInventoryItemAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/inventory/items/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// AdjustQuantityDto: newQty is the ABSOLUTE target quantity as a numeric
// string (@IsNumberString), not a delta — the service derives the variance
// itself. The old `number | { newQuantity ... }` union let callers post a bare
// scalar that axios sent as raw JSON, and named the field `newQuantity`, which
// the API has never accepted. Both arms 400'd; the union is what let them
// type-check.
//
// referenceNum is intentionally not sent: the DTO validates it @IsUUID() while
// the column is varchar(64), and adjust() never persists it anyway.
export const adjustStockAPI = async (
  id: string,
  data: { itemId: string; newQty: string; reason: AdjustmentReason; notes?: string },
): Promise<any> => {
  try {
    const response = await api.post(`/inventory/items/${id}/adjust`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// CreatePhysicalCountDto wants `lines`, not `counts`, and CountLineDto.countedQty
// is @IsNumberString. Both were wrong here — the field name 400'd as "lines must
// be an array" and a numeric countedQty was rejected by the ValidationPipe. This
// function had no caller until now, so nothing surfaced it.
export const physicalCountAPI = async (data: { countDate: string; lines: Array<{ itemId: string; countedQty: string }>; notes?: string }): Promise<any> => {
  try {
    const response = await api.post('/inventory/physical-counts', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const stockTransferAPI = async (data: { fromLocationId: string; toLocationId: string; transferDate: string; items: Array<{ itemId: string; quantity: number }>; reference?: string }): Promise<any> => {
  try {
    const response = await api.post('/inventory/transfers', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getStockMovementsAPI = async (id: string, params: any = {}): Promise<any> => {
  try {
    const response = await api.get(`/inventory/items/${id}/movements`, { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const toggleInventoryItemAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.patch(`/inventory/items/${id}`, { isActive: true });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};
