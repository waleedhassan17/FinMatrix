// ═══════════════════════════════════════════════════════
// FinMatrix — Delivery Model & Validation
// ═══════════════════════════════════════════════════════
// Mirrors `glModel.ts` / `billModel.ts`:
//   • API entity types describing the raw backend shape
//   • Pagination envelope
//   • Query params for the list endpoints
// Plus form-validation helpers used by the create/assign screens.

import type {
  DeliveryRecord,
  DeliveryRecordStatus,
  DeliveryPriority,
  DeliveryItemLine,
  StatusHistoryEntry,
} from '../dummy-data/deliveries';
import type { DummyDeliveryPerson } from '../dummy-data/deliveryPersonnel';
import type {
  InventoryUpdateRequest,
  InventoryUpdateChange,
  DeliveryProof,
  InventoryUpdateRequestStatus,
} from '../dummy-data/inventoryUpdateRequests';
import type {
  ShadowInventoryRecord,
  ShadowInventoryStatus,
  ShadowInventoryChange,
} from '../dummy-data/shadowInventory';

// ─── Raw API entity aliases (backend shape) ──────────
// Defined as aliases so future backend-only fields can be added
// without leaking into UI types.
export type DeliveryApiEntity = DeliveryRecord;
export type DeliveryPersonApiEntity = DummyDeliveryPerson;
export type InventoryUpdateRequestApiEntity = InventoryUpdateRequest;
export type ShadowInventoryApiEntity = ShadowInventoryRecord;

// ─── Pagination envelope ─────────────────────────────
export interface DeliveryApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Query params for list endpoints ─────────────────
export interface DeliveryQueryParams {
  search?: string;
  status?: 'all' | DeliveryRecordStatus;
  priority?: 'all' | DeliveryPriority;
  zone?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
}

export interface DeliveryPersonnelQueryParams {
  search?: string;
  status?: 'all' | DummyDeliveryPerson['status'];
  zone?: string;
  page?: number;
  limit?: number;
}

// ─── Re-export canonical UI types for convenience ────
export type {
  DeliveryRecord,
  DeliveryRecordStatus,
  DeliveryPriority,
  DeliveryItemLine,
  StatusHistoryEntry,
  DummyDeliveryPerson,
  InventoryUpdateRequest,
  InventoryUpdateChange,
  DeliveryProof,
  InventoryUpdateRequestStatus,
  ShadowInventoryRecord,
  ShadowInventoryStatus,
  ShadowInventoryChange,
};

// ─── Status / priority labels & colors ───────────────
export const DELIVERY_STATUS_LABELS: Record<DeliveryRecordStatus, string> = {
  unassigned: 'Unassigned',
  pending: 'Pending',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  arrived: 'Arrived',
  delivered: 'Delivered',
  failed: 'Failed',
  returned: 'Returned',
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryRecordStatus, string> = {
  unassigned: '#94A3B8',
  pending: '#F39C12',
  picked_up: '#3B82F6',
  in_transit: '#2E75B6',
  arrived: '#8B5CF6',
  delivered: '#27AE60',
  failed: '#E74C3C',
  returned: '#64748B',
};

export const DELIVERY_PRIORITY_LABELS: Record<DeliveryPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const DELIVERY_PRIORITY_COLORS: Record<DeliveryPriority, string> = {
  high: '#E74C3C',
  medium: '#F39C12',
  low: '#27AE60',
};

// ─── Form types & validation ─────────────────────────
export interface ValidationErrors {
  [key: string]: string;
}

export interface DeliveryFormItem {
  itemId: string;
  itemName: string;
  agencyId: string;
  agencyName: string;
  quantity: string;
}

export interface DeliveryFormData {
  customerId: string;
  customerName: string;
  zone: string;
  scheduledDate: string;
  priority: DeliveryPriority;
  notes: string;
  items: DeliveryFormItem[];
}

export const validateDeliveryForm = (data: DeliveryFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.customerId) errors.customerId = 'Select a customer';
  if (!data.zone.trim()) errors.zone = 'Zone is required';
  if (!data.scheduledDate) errors.scheduledDate = 'Scheduled date is required';

  if (data.items.length === 0) {
    errors.items = 'At least one item is required';
  } else {
    const hasInvalid = data.items.some(
      it => !it.itemId || !(parseFloat(it.quantity) > 0),
    );
    if (hasInvalid) errors.items = 'Every item must have an item and a positive quantity';
  }

  return errors;
};

export interface AssignDeliveryFormData {
  deliveryIds: string[];
  personnelId: string;
}

export const validateAssignment = (
  data: AssignDeliveryFormData,
): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (data.deliveryIds.length === 0) errors.deliveries = 'Select at least one delivery';
  if (!data.personnelId) errors.personnelId = 'Select a personnel';
  return errors;
};
