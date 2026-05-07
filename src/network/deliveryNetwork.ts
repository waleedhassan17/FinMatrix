// ═══════════════════════════════════════════════════════
// FinMatrix — Delivery Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from './apiHelpers';

// ─── Delivery Personnel Management ──────────────────

export const getDeliveryPersonnelAPI = async (params: any = {}): Promise<any> => {
  try {
    const queryParams = { page: 1, limit: 50, ...params };
    const response = await api.get('/delivery-personnel', { params: queryParams });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createDeliveryPersonnelAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/delivery-personnel', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getPersonnelDetailAPI = async (userId: string): Promise<any> => {
  try {
    const response = await api.get(`/delivery-personnel/${userId}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updatePersonnelAPI = async (userId: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/delivery-personnel/${userId}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const togglePersonnelAvailabilityAPI = async (userId: string): Promise<any> => {
  try {
    const response = await api.patch(`/delivery-personnel/${userId}/availability`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const resetPersonnelPasswordAPI = async (userId: string): Promise<any> => {
  try {
    const response = await api.post(`/delivery-personnel/${userId}/reset-password`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Deliveries - Admin ─────────────────────────────

export const getDeliveriesAPI = async (params: any = {}): Promise<any> => {
  try {
    const queryParams = { page: 1, limit: 50, ...params };
    const response = await api.get('/deliveries', { params: queryParams });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createDeliveryAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.post('/deliveries', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const assignDeliveriesAPI = async (data: { deliveryIds: string[]; personnelId: string }): Promise<any> => {
  try {
    const response = await api.post('/deliveries/assign', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const autoAssignDeliveryAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.post(`/deliveries/${id}/auto-assign`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getDeliveryDetailAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/deliveries/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateDeliveryAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/deliveries/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateDeliveryStatusAPI = async (id: string, data: { status: string; notes?: string }): Promise<any> => {
  try {
    const response = await api.patch(`/deliveries/${id}/status`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Deliveries - Personnel ─────────────────────────

export const getMyDeliveriesAPI = async (params: any = {}): Promise<any> => {
  try {
    const queryParams = { page: 1, limit: 50, ...params };
    const response = await api.get('/deliveries/my', { params: queryParams });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getMyDashboardAPI = async (): Promise<any> => {
  try {
    const response = await api.get('/deliveries/my/dashboard');
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const uploadBillPhotoAPI = async (deliveryId: string, formData: FormData): Promise<any> => {
  try {
    const response = await api.post(`/deliveries/${deliveryId}/bill-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const confirmCustomerReceiptAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.post(`/deliveries/${id}/confirm`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const reportDeliveryIssueAPI = async (id: string, data: { issueType: string; notes?: string; photoUrl?: string }): Promise<any> => {
  try {
    const response = await api.post(`/deliveries/${id}/issues`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getMyHistoryAPI = async (params: any = {}): Promise<any> => {
  try {
    const response = await api.get('/deliveries/my/history', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Inventory Approvals ────────────────────────────

export const getInventoryApprovalsAPI = async (params: any = {}): Promise<any> => {
  try {
    const response = await api.get('/inventory-approvals', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getInventoryApprovalDetailAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/inventory-approvals/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const reviewInventoryApprovalAPI = async (id: string, data: { action: 'approved' | 'rejected'; notes?: string }): Promise<any> => {
  try {
    const response = await api.patch(`/inventory-approvals/${id}/review`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Shadow Inventory ───────────────────────────────

export const getShadowInventoryAPI = async (params: any = {}): Promise<any> => {
  try {
    const response = await api.get('/shadow-inventory', { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateShadowEntryAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await api.patch(`/shadow-inventory/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const syncShadowInventoryAPI = async (personnelId: string): Promise<any> => {
  try {
    const response = await api.post(`/shadow-inventory/sync/${personnelId}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── GPS Location Tracking ──────────────────────────

export const updateLocationAPI = async (lat: number, lng: number): Promise<any> => {
  try {
    const response = await api.patch('/delivery-personnel/location', { lat, lng });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getDeliveryMapDataAPI = async (): Promise<any> => {
  try {
    const response = await api.get('/deliveries/map-data');
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Aliases used by inventoryApprovalSlice ─────────
export const getInventoryUpdateRequestsAPI = getInventoryApprovalsAPI;

export const approveInventoryUpdateRequestAPI = async (
  requestId: string,
  reviewerComment?: string,
  reviewedBy?: string,
): Promise<any> =>
  reviewInventoryApprovalAPI(requestId, {
    action: 'approved',
    notes: reviewerComment,
  });

export const rejectInventoryUpdateRequestAPI = async (
  requestId: string,
  reviewerComment?: string,
  reviewedBy?: string,
): Promise<any> =>
  reviewInventoryApprovalAPI(requestId, {
    action: 'rejected',
    notes: reviewerComment,
  });

