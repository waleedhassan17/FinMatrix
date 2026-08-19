// ═══════════════════════════════════════════════════════
// FinMatrix — Delivery Network (Production API)
// ═══════════════════════════════════════════════════════

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  api,
  extractErrorMessage,
  postMultipart,
  API_BASE_URL,
  getAccessToken,
  getStoredCompanyId,
} from '../network/apiHelpers';

// ─── Bad-network resilience ─────────────────────────
// Retries a request when it failed at the NETWORK level (no HTTP response —
// timeouts, dropped connections). Server 4xx/5xx responses are never
// retried. Safe for delivery status updates and photo uploads because the
// backend made both idempotent (a replay of an applied update is a no-op /
// 409, never a double-advance).
const RETRY_DELAYS_MS = [1000, 3000];

async function withNetworkRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const isNetworkFailure = !e?.response;
      if (!isNetworkFailure || attempt === RETRY_DELAYS_MS.length) throw e;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw lastError;
}

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
    const response = await withNetworkRetry(() => api.patch(`/deliveries/${id}/status`, data));
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Deliveries - Personnel ─────────────────────────

export const getMyDeliveriesAPI = async (params: any = {}): Promise<any> => {
  try {
    const queryParams = { page: 1, limit: 50, ...params };
    const response = await api.get('/deliveries/my/assigned', { params: queryParams });
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
  // fetch-based multipart (postMultipart) — axios with a manual multipart
  // Content-Type drops the boundary and the server never receives the file.
  // Safe to retry: the backend answers a replayed submission with a 409.
  return withNetworkRetry(() => postMultipart(`/deliveries/${deliveryId}/bill-photo`, formData));
};

export const confirmCustomerReceiptAPI = async (id: string, data: any): Promise<any> => {
  try {
    const response = await withNetworkRetry(() => api.post(`/deliveries/${id}/confirm`, data));
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

export const updateLocationAPI = async (
  lat: number,
  lng: number,
  meta?: { heading?: number | null; speed?: number | null; accuracy?: number | null; timestamp?: number },
): Promise<any> => {
  try {
    const response = await api.patch('/delivery-personnel/location', {
      lat,
      lng,
      heading: meta?.heading ?? null,
      speed: meta?.speed ?? null,
      accuracy: meta?.accuracy ?? null,
      timestamp: meta?.timestamp ?? Date.now(),
    });
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

export const getPersonnelLocationAPI = async (personnelId: string): Promise<any> => {
  try {
    const response = await api.get(`/delivery-personnel/${personnelId}/location`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getDeliveryLocationHistoryAPI = async (deliveryId: string): Promise<any> => {
  try {
    const response = await api.get(`/deliveries/${deliveryId}/location-history`);
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

export const undoInventoryApprovalAPI = async (requestId: string): Promise<any> => {
  try {
    const response = await api.post(`/inventory-update-requests/${requestId}/undo`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

/**
 * Fetch a delivery's proof-of-delivery photo as a LOCAL file:// URI.
 *
 * The stored billPhotoUrl is not a CDN link — the server composes it as a
 * pointer back at its own auth-gated route. React Native's
 * `<Image source={{ uri, headers }} />` does not reliably attach auth headers,
 * so pointing an <Image> straight at that URL yields a 401 and a silent blank
 * render (which read as a BLACK box, because the container behind it is
 * black). Downloading natively with the token and handing <Image> a file://
 * URI always renders. Mirrors downloadSubmissionScreenshot in billingNetwork.
 *
 * The URL is composed here from the request id rather than trusting the stored
 * absolute URL, so a deployed APP_URL that drifts from the app's API base
 * cannot strand every already-uploaded photo.
 */
export const downloadBillPhoto = async (requestId: string): Promise<string> => {
  const token = await getAccessToken();
  const companyId = await getStoredCompanyId();
  const path = `/inventory-update-requests/${requestId}/bill-photo`;
  const headers = {
    Authorization: token ? `Bearer ${token}` : '',
    ...(companyId ? { 'x-company-id': companyId } : {}),
  };

  if (Platform.OS === 'web') {
    // expo-file-system has no web implementation.
    const res = await fetch(`${API_BASE_URL}${path}`, { headers });
    if (!res.ok) {
      throw new Error(
        res.status === 404
          ? 'This delivery has no proof photo.'
          : `Could not load the photo (${res.status}).`,
      );
    }
    return URL.createObjectURL(await res.blob());
  }

  const dest = `${FileSystem.cacheDirectory}bill-photo-${requestId}-${Date.now()}.img`;
  const result = await FileSystem.downloadAsync(`${API_BASE_URL}${path}`, dest, { headers });
  if (result.status >= 400) {
    throw new Error(
      result.status === 404
        ? 'This delivery has no proof photo.'
        : `Could not load the photo (${result.status}).`,
    );
  }
  return result.uri;
};
