// ═══════════════════════════════════════════════════════
// FinMatrix — Delivery Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API envelope and returns a clean,
// UI-ready data structure with inline field mapping.
// Mirrors `glSerializer.ts` / `billSerializer.ts`.

import type {
  DeliveryRecord,
  DeliveryRecordStatus,
  DeliveryItemLine,
  StatusHistoryEntry,
  DummyDeliveryPerson,
  InventoryUpdateRequest,
  InventoryUpdateChange,
  ShadowInventoryRecord,
  ShadowInventoryChange,
} from '../models/deliveryModel';
import type {
  DeliveryApiEntity,
  DeliveryPersonApiEntity,
  InventoryUpdateRequestApiEntity,
  ShadowInventoryApiEntity,
} from '../models/deliveryModel';

// ─── Counts ─────────────────────────────────────────
export type DeliveryStatusCounts = Record<'all' | DeliveryRecordStatus, number>;

// ─── Serialized output for the list slice ────────────
export interface SerializedDeliveryList {
  deliveries: DeliveryRecord[];
  page: number;
  totalPages: number;
  totalDeliveries: number;
  counts: DeliveryStatusCounts;
}

export interface SerializedPersonnelList {
  personnel: DummyDeliveryPerson[];
  page: number;
  totalPages: number;
  totalPersonnel: number;
}

// ─── Raw → UI mappers ────────────────────────────────
const mapItemLine = (
  raw: Partial<DeliveryItemLine>,
): DeliveryItemLine => ({
  itemId: raw.itemId ?? '',
  itemName: raw.itemName ?? '',
  agencyId: raw.agencyId ?? '',
  agencyName: raw.agencyName ?? '',
  orderedQty: raw.orderedQty ?? (typeof raw.quantity === 'number' ? raw.quantity : 0),
  quantity: typeof raw.quantity === 'number' ? raw.quantity : 0,
  deliveredQty: raw.deliveredQty,
  returnedQty: raw.returnedQty,
  unitPrice: raw.unitPrice ?? 0,
});

const mapStatusHistory = (
  raw: Partial<StatusHistoryEntry>,
): StatusHistoryEntry => ({
  status: (raw.status as DeliveryRecordStatus) ?? 'unassigned',
  timestamp: raw.timestamp ?? '',
  note: raw.note,
  updatedBy: raw.updatedBy,
});

export const mapDelivery = (
  raw: Partial<DeliveryApiEntity>,
): DeliveryRecord => ({
  id: raw.id ?? '',
  reference: raw.reference ?? raw.referenceNo ?? '',
  referenceNo: raw.referenceNo ?? raw.reference ?? '',
  customerId: raw.customerId ?? '',
  customerName: raw.customerName ?? '',
  zone: raw.zone ?? '',
  scheduledDate: raw.scheduledDate ?? '',
  priority: raw.priority ?? 'medium',
  status: raw.status ?? 'unassigned',
  assignedTo: raw.assignedTo,
  assignedAt: raw.assignedAt,
  notes: raw.notes,
  items: Array.isArray(raw.items) ? raw.items.map(mapItemLine) : [],
  createdAt: raw.createdAt ?? '',
  updatedAt: raw.updatedAt ?? '',
  address: raw.address,
  customerPhone: raw.customerPhone,
  statusHistory: Array.isArray(raw.statusHistory)
    ? raw.statusHistory.map(mapStatusHistory)
    : [],
  signature: raw.signature,
  signatureBase64: raw.signatureBase64,
  photos: Array.isArray(raw.photos) ? [...raw.photos] : undefined,
  customerVerified: raw.customerVerified,
  pickedUpAt: raw.pickedUpAt,
  inTransitAt: raw.inTransitAt,
  arrivedAt: raw.arrivedAt,
  deliveredAt: raw.deliveredAt,
  issueNote: raw.issueNote,
});

export const mapDeliveryPerson = (
  raw: Partial<DeliveryPersonApiEntity>,
): DummyDeliveryPerson => ({
  userId: raw.userId ?? '',
  displayName: raw.displayName ?? '',
  username: raw.username ?? '',
  email: raw.email ?? '',
  password: raw.password ?? '',
  phone: raw.phone ?? '',
  role: 'delivery',
  companyId: raw.companyId ?? '',
  isAvailable: raw.isAvailable ?? false,
  currentLoad: typeof raw.currentLoad === 'number' ? raw.currentLoad : 0,
  maxLoad: typeof raw.maxLoad === 'number' ? raw.maxLoad : 0,
  rating: typeof raw.rating === 'number' ? raw.rating : 0,
  totalDeliveries:
    typeof raw.totalDeliveries === 'number' ? raw.totalDeliveries : 0,
  onTimeRate: typeof raw.onTimeRate === 'number' ? raw.onTimeRate : 0,
  status: raw.status ?? 'inactive',
  vehicleType: raw.vehicleType ?? 'motorcycle',
  vehicleNumber: raw.vehicleNumber ?? '',
  zones: Array.isArray(raw.zones) ? [...raw.zones] : [],
});

const mapInventoryChange = (
  raw: Partial<InventoryUpdateChange>,
): InventoryUpdateChange => ({
  itemId: raw.itemId ?? '',
  itemName: raw.itemName ?? '',
  beforeQty: typeof raw.beforeQty === 'number' ? raw.beforeQty : 0,
  deliveredQty: typeof raw.deliveredQty === 'number' ? raw.deliveredQty : 0,
  returnedQty: typeof raw.returnedQty === 'number' ? raw.returnedQty : 0,
});

export const mapInventoryUpdateRequest = (
  raw: Partial<InventoryUpdateRequestApiEntity>,
): InventoryUpdateRequest => ({
  id: raw.id ?? '',
  deliveryId: raw.deliveryId ?? '',
  deliveryReference: raw.deliveryReference ?? '',
  personnelId: raw.personnelId ?? '',
  personnelName: raw.personnelName ?? '',
  routeLabel: raw.routeLabel ?? '',
  submittedAt: raw.submittedAt ?? '',
  status: raw.status ?? 'pending',
  shadowStatus: raw.shadowStatus ?? 'pending',
  reviewedAt: raw.reviewedAt,
  reviewedBy: raw.reviewedBy,
  reviewerComment: raw.reviewerComment,
  changes: Array.isArray(raw.changes) ? raw.changes.map(mapInventoryChange) : [],
  proof: raw.proof
    ? {
        signatureBase64: raw.proof.signatureBase64 ?? '',
        signedBy: raw.proof.signedBy ?? '',
        verificationMethod: raw.proof.verificationMethod ?? 'manual',
        verifiedBy: raw.proof.verifiedBy ?? '',
        verifiedAt: raw.proof.verifiedAt ?? '',
      }
    : {
        signatureBase64: '',
        signedBy: '',
        verificationMethod: 'manual',
        verifiedBy: '',
        verifiedAt: '',
      },
});

const mapShadowChange = (
  raw: Partial<ShadowInventoryChange>,
): ShadowInventoryChange => ({
  id: raw.id ?? '',
  timestamp: raw.timestamp ?? '',
  originalQty: typeof raw.originalQty === 'number' ? raw.originalQty : 0,
  currentQty: typeof raw.currentQty === 'number' ? raw.currentQty : 0,
  delta: typeof raw.delta === 'number' ? raw.delta : 0,
  reason: raw.reason ?? '',
  status: raw.status ?? 'pending',
});

export const mapShadowInventory = (
  raw: Partial<ShadowInventoryApiEntity>,
): ShadowInventoryRecord => ({
  id: raw.id ?? '',
  personnelId: raw.personnelId ?? '',
  itemId: raw.itemId ?? '',
  itemName: raw.itemName ?? '',
  originalQty: typeof raw.originalQty === 'number' ? raw.originalQty : 0,
  currentQty: typeof raw.currentQty === 'number' ? raw.currentQty : 0,
  status: raw.status ?? 'pending',
  changesToday: Array.isArray(raw.changesToday)
    ? raw.changesToday.map(mapShadowChange)
    : [],
});

// ─── Envelope serializers ────────────────────────────
export function deliveryListSerializer(payload: any): SerializedDeliveryList {
  const data = payload?.data;
  const raw: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.deliveries)
      ? data.deliveries
      : [];
  const pagination = (data && !Array.isArray(data)) ? (data.pagination || {}) : {};
  const totals = (data && !Array.isArray(data)) ? (data.totals || {}) : {};

  const deliveries = raw.map(mapDelivery);

  const counts: DeliveryStatusCounts = totals.counts || {
    all: deliveries.length,
    unassigned: deliveries.filter(d => d.status === 'unassigned').length,
    pending: deliveries.filter(d => d.status === 'pending').length,
    picked_up: deliveries.filter(d => d.status === 'picked_up').length,
    in_transit: deliveries.filter(d => d.status === 'in_transit').length,
    arrived: deliveries.filter(d => d.status === 'arrived').length,
    delivered: deliveries.filter(d => d.status === 'delivered').length,
    failed: deliveries.filter(d => d.status === 'failed').length,
    returned: deliveries.filter(d => d.status === 'returned').length,
  };

  return {
    deliveries,
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalDeliveries: pagination.total ?? deliveries.length,
    counts,
  };
}

export function deliverySingleSerializer(
  payload: any,
): DeliveryRecord | null {
  const raw = payload?.data?.delivery ?? (payload?.data && !Array.isArray(payload.data) ? payload.data : null);
  if (!raw) return null;
  return mapDelivery(raw);
}

export function deliveryListMutationSerializer(payload: any): DeliveryRecord[] {
  const raw = payload?.data?.deliveries;
  if (!Array.isArray(raw)) return [];
  return raw.map(mapDelivery);
}

export function personnelListSerializer(payload: any): SerializedPersonnelList {
  const data = payload?.data;
  const raw: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.personnel)
      ? data.personnel
      : [];
  const pagination = (data && !Array.isArray(data)) ? (data.pagination || {}) : {};
  const personnel = raw.map(mapDeliveryPerson);
  return {
    personnel,
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalPersonnel: pagination.total ?? personnel.length,
  };
}

export function personnelSingleSerializer(
  payload: any,
): DummyDeliveryPerson | null {
  const raw = payload?.data?.personnel ?? (payload?.data && !Array.isArray(payload.data) ? payload.data : null);
  if (!raw) return null;
  return mapDeliveryPerson(raw);
}

export function inventoryUpdateRequestListSerializer(
  payload: any,
): InventoryUpdateRequest[] {
  const raw = payload?.data?.requests;
  if (!Array.isArray(raw)) return [];
  return raw.map(mapInventoryUpdateRequest);
}

export function inventoryUpdateRequestSingleSerializer(
  payload: any,
): InventoryUpdateRequest | null {
  const raw = payload?.data?.request;
  if (!raw) return null;
  return mapInventoryUpdateRequest(raw);
}

export function shadowInventoryListSerializer(
  payload: any,
): ShadowInventoryRecord[] {
  const raw = payload?.data?.records;
  if (!Array.isArray(raw)) return [];
  return raw.map(mapShadowInventory);
}
