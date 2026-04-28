// ═══════════════════════════════════════════════════════
// FinMatrix — Delivery Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/deliveries  +  /api/v1/delivery-personnel
//            /api/v1/inventory-update-requests  +  /api/v1/shadow-inventory
// All endpoints return the standard envelope
// `{ success, data: { ... } }` (mirrors glNetwork / billNetwork).

import { simulateApiCall, api } from './apiHelpers';
import { deliveryRecords as seedDeliveries } from '../dummy-data/deliveries';
import { dummyDeliveryPersonnel as seedPersonnel } from '../dummy-data/deliveryPersonnel';
import { inventoryUpdateRequests as seedRequests } from '../dummy-data/inventoryUpdateRequests';
import { shadowInventoryRecords as seedShadow } from '../dummy-data/shadowInventory';
import type {
  DeliveryApiEntity,
  DeliveryApiPagination,
  DeliveryQueryParams,
  DeliveryPersonApiEntity,
  DeliveryPersonnelQueryParams,
  InventoryUpdateRequestApiEntity,
  ShadowInventoryApiEntity,
  DeliveryRecordStatus,
  DeliveryPriority,
  DeliveryItemLine,
} from '../models/deliveryModel';

// ─── In-memory stores ────────────────────────────────
let deliveryStore: DeliveryApiEntity[] = seedDeliveries.map(d => ({
  ...d,
  items: d.items.map(it => ({ ...it })),
  statusHistory: d.statusHistory ? d.statusHistory.map(s => ({ ...s })) : undefined,
  photos: d.photos ? [...d.photos] : undefined,
}));

let personnelStore: DeliveryPersonApiEntity[] = seedPersonnel.map(p => ({
  ...p,
  zones: [...p.zones],
}));

let inventoryRequestStore: InventoryUpdateRequestApiEntity[] = seedRequests.map(r => ({
  ...r,
  changes: r.changes.map(c => ({ ...c })),
  proof: { ...r.proof },
}));

let shadowInventoryStore: ShadowInventoryApiEntity[] = seedShadow.map(s => ({
  ...s,
  changesToday: s.changesToday.map(c => ({ ...c })),
}));

// ─── Clone helpers ───────────────────────────────────
const cloneDelivery = (d: DeliveryApiEntity): DeliveryApiEntity => ({
  ...d,
  items: d.items.map(it => ({ ...it })),
  statusHistory: d.statusHistory ? d.statusHistory.map(s => ({ ...s })) : undefined,
  photos: d.photos ? [...d.photos] : undefined,
});
const clonePerson = (p: DeliveryPersonApiEntity): DeliveryPersonApiEntity => ({
  ...p,
  zones: [...p.zones],
});
const cloneRequest = (
  r: InventoryUpdateRequestApiEntity,
): InventoryUpdateRequestApiEntity => ({
  ...r,
  changes: r.changes.map(c => ({ ...c })),
  proof: { ...r.proof },
});
const cloneShadow = (s: ShadowInventoryApiEntity): ShadowInventoryApiEntity => ({
  ...s,
  changesToday: s.changesToday.map(c => ({ ...c })),
});

// ─── Standard envelope ───────────────────────────────
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ═══════════════════════════════════════════════════════
// Delivery APIs (envelope-wrapped)
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/deliveries
 *
 * ★ REAL API:
 * const r = await axios.get(`${API_BASE_URL}/v1/deliveries`, { params });
 * return r.data;
 */
export const getDeliveriesAPI = async (
  params: DeliveryQueryParams = {},
): Promise<any> => {
  let filtered = deliveryStore.map(cloneDelivery);

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      d =>
        d.referenceNo.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q) ||
        d.zone.toLowerCase().includes(q),
    );
  }
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter(d => d.status === params.status);
  }
  if (params.priority && params.priority !== 'all') {
    filtered = filtered.filter(d => d.priority === params.priority);
  }
  if (params.zone) filtered = filtered.filter(d => d.zone === params.zone);
  if (params.assignedTo)
    filtered = filtered.filter(d => d.assignedTo === params.assignedTo);

  const page = params.page ?? 1;
  const limit = params.limit ?? 100;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const slice = filtered.slice((page - 1) * limit, page * limit);

  // Status counts (over full store, for tab badges)
  const counts = {
    all: deliveryStore.length,
    unassigned: 0,
    pending: 0,
    picked_up: 0,
    in_transit: 0,
    arrived: 0,
    delivered: 0,
    failed: 0,
    returned: 0,
  } as Record<'all' | DeliveryRecordStatus, number>;
  deliveryStore.forEach(d => {
    counts[d.status]++;
  });

  const envelope: ApiEnvelope<{
    deliveries: DeliveryApiEntity[];
    pagination: DeliveryApiPagination;
    totals: { counts: typeof counts };
  }> = {
    success: true,
    data: {
      deliveries: slice,
      pagination: { page, limit, total, totalPages },
      totals: { counts },
    },
  };
  return simulateApiCall(envelope, 600);
};

/**
 * GET /api/v1/deliveries/:id
 */
export const getDeliveryByIdAPI = async (id: string): Promise<any> => {
  const d = deliveryStore.find(x => x.id === id);
  if (!d) throw new Error('Delivery not found');
  const envelope: ApiEnvelope<{ delivery: DeliveryApiEntity }> = {
    success: true,
    data: { delivery: cloneDelivery(d) },
  };
  return simulateApiCall(envelope, 300);
};

/**
 * POST /api/v1/deliveries
 */
export const createDeliveryAPI = async (data: {
  customerId: string;
  customerName: string;
  zone: string;
  scheduledDate: string;
  priority: DeliveryPriority;
  notes?: string;
  items: DeliveryItemLine[];
}): Promise<any> => {
  const now = new Date().toISOString();
  const nextNumber = deliveryStore.length + 1001;
  const id = `del_${String(deliveryStore.length + 1).padStart(3, '0')}`;
  const newDelivery: DeliveryApiEntity = {
    id,
    referenceNo: `DEL-${nextNumber}`,
    customerId: data.customerId,
    customerName: data.customerName,
    zone: data.zone,
    scheduledDate: data.scheduledDate,
    priority: data.priority,
    status: 'unassigned',
    notes: data.notes,
    items: data.items.map(it => ({ ...it })),
    createdAt: now,
    updatedAt: now,
  };
  deliveryStore.unshift(newDelivery);
  const envelope: ApiEnvelope<{ delivery: DeliveryApiEntity }> = {
    success: true,
    data: { delivery: cloneDelivery(newDelivery) },
  };
  return simulateApiCall(envelope, 500);
};

/**
 * PATCH /api/v1/deliveries/:id
 */
export const updateDeliveryAPI = async (
  id: string,
  data: Partial<DeliveryApiEntity>,
): Promise<any> => {
  const idx = deliveryStore.findIndex(d => d.id === id);
  if (idx === -1) throw new Error('Delivery not found');
  deliveryStore[idx] = {
    ...deliveryStore[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  const envelope: ApiEnvelope<{ delivery: DeliveryApiEntity }> = {
    success: true,
    data: { delivery: cloneDelivery(deliveryStore[idx]) },
  };
  return simulateApiCall(envelope, 500);
};

/**
 * POST /api/v1/deliveries/assign
 * Manually assign one or more deliveries to a personnel.
 */
export const assignDeliveriesAPI = async (
  deliveryIds: string[],
  personnelId: string,
): Promise<any> => {
  const now = new Date().toISOString();
  const assigned: DeliveryApiEntity[] = [];

  for (const d of deliveryStore) {
    if (!deliveryIds.includes(d.id)) continue;
    d.assignedTo = personnelId;
    d.assignedAt = now;
    d.status = 'pending';
    d.updatedAt = now;
    assigned.push(d);
  }

  const envelope: ApiEnvelope<{
    deliveries: DeliveryApiEntity[];
  }> = {
    success: true,
    data: { deliveries: assigned.map(cloneDelivery) },
  };
  return simulateApiCall(envelope, 500);
};

/**
 * POST /api/v1/deliveries/:id/status
 */
export const updateDeliveryStatusAPI = async (
  id: string,
  status: DeliveryRecordStatus,
  note?: string,
): Promise<any> => {
  const idx = deliveryStore.findIndex(d => d.id === id);
  if (idx === -1) throw new Error('Delivery not found');
  const now = new Date().toISOString();
  const target = deliveryStore[idx];
  target.status = status;
  target.updatedAt = now;
  if (note) target.notes = note;
  if (status === 'picked_up') target.pickedUpAt = now;
  if (status === 'in_transit') target.inTransitAt = now;
  if (status === 'arrived') target.arrivedAt = now;
  if (status === 'delivered') target.deliveredAt = now;
  target.statusHistory = [
    ...(target.statusHistory ?? []),
    { status, timestamp: now, note },
  ];

  const envelope: ApiEnvelope<{ delivery: DeliveryApiEntity }> = {
    success: true,
    data: { delivery: cloneDelivery(target) },
  };
  return simulateApiCall(envelope, 400);
};

// ═══════════════════════════════════════════════════════
// Delivery Personnel APIs
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/delivery-personnel
 */
export const getDeliveryPersonnelAPI = async (
  params: DeliveryPersonnelQueryParams = {},
): Promise<any> => {
  let filtered = personnelStore.map(clonePerson);

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      p =>
        p.displayName.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q),
    );
  }
  if (params.status && params.status !== 'all') {
    filtered = filtered.filter(p => p.status === params.status);
  }
  if (params.zone) filtered = filtered.filter(p => p.zones.includes(params.zone!));

  const page = params.page ?? 1;
  const limit = params.limit ?? 100;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const slice = filtered.slice((page - 1) * limit, page * limit);

  const envelope: ApiEnvelope<{
    personnel: DeliveryPersonApiEntity[];
    pagination: DeliveryApiPagination;
  }> = {
    success: true,
    data: {
      personnel: slice,
      pagination: { page, limit, total, totalPages },
    },
  };
  return simulateApiCall(envelope, 500);
};

/**
 * GET /api/v1/delivery-personnel/:id
 */
export const getDeliveryPersonByIdAPI = async (userId: string): Promise<any> => {
  const p = personnelStore.find(x => x.userId === userId);
  if (!p) throw new Error('Personnel not found');
  const envelope: ApiEnvelope<{ personnel: DeliveryPersonApiEntity }> = {
    success: true,
    data: { personnel: clonePerson(p) },
  };
  return simulateApiCall(envelope, 300);
};

// ═══════════════════════════════════════════════════════
// Inventory Update Request APIs
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/inventory-update-requests
 */
export const getInventoryUpdateRequestsAPI = async (
  params?: { status?: string; page?: number; pageSize?: number }
): Promise<any> => {
  const response = await api.get('/inventory-update-requests', { params });
  return response.data;
};

/**
 * POST /api/v1/inventory-update-requests/:id/approve
 */
export const approveInventoryUpdateRequestAPI = async (
  id: string,
  reviewerComment?: string,
): Promise<any> => {
  const response = await api.post(`/inventory-update-requests/${id}/approve`, {
    reviewerComment,
  });
  return response.data;
};

/**
 * POST /api/v1/inventory-update-requests/:id/reject
 */
export const rejectInventoryUpdateRequestAPI = async (
  id: string,
  reviewerComment?: string,
): Promise<any> => {
  const response = await api.post(`/inventory-update-requests/${id}/reject`, {
    reviewerComment,
  });
  return response.data;
};

// ═══════════════════════════════════════════════════════
// Shadow Inventory APIs
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/shadow-inventory?personnelId=...
 */
export const getShadowInventoryAPI = async (
  personnelId?: string,
): Promise<any> => {
  const filtered = personnelId
    ? shadowInventoryStore.filter(s => s.personnelId === personnelId)
    : shadowInventoryStore;
  const envelope: ApiEnvelope<{
    records: ShadowInventoryApiEntity[];
  }> = {
    success: true,
    data: { records: filtered.map(cloneShadow) },
  };
  return simulateApiCall(envelope, 400);
};
