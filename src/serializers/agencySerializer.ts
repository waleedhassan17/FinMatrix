// ═══════════════════════════════════════════════════════
// FinMatrix — Agency Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN agencyNetwork and the Agency slices.
// Takes raw API envelopes and returns clean, UI-ready
// agency entities with inline field mapping. Mirrors
// `glSerializer.ts`, `bankingSerializer.ts`.

import type { AgencyApi, AgencyInventoryItemApi } from '../models/agencyModel';

const num = (v: any, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

// ─── Sub-mapper ──────────────────────────────────────
export const mapAgencyInventoryItem = (raw: any): AgencyInventoryItemApi => ({
  id: raw?.id ?? '',
  sku: raw?.sku ?? '',
  name: raw?.name ?? '',
  description: raw?.description ?? '',
  category: raw?.category ?? '',
  unitOfMeasure: raw?.unitOfMeasure ?? '',
  costPrice: num(raw?.costPrice),
  sellingPrice: num(raw?.sellingPrice),
  quantityOnHand: num(raw?.quantityOnHand),
  reorderLevel: num(raw?.reorderLevel),
});

// ─── Raw → UI mapper ─────────────────────────────────
export const mapAgency = (raw: any): AgencyApi => ({
  id: raw?.id ?? '',
  name: raw?.name ?? '',
  type: (raw?.type as AgencyApi['type']) ?? 'Supply',
  typeBadgeColor: raw?.typeBadgeColor ?? '',
  description: raw?.description ?? '',
  productCount: num(raw?.productCount, Array.isArray(raw?.inventory) ? raw.inventory.length : 0),
  city: raw?.city ?? '',
  province: raw?.province ?? '',
  address: raw?.address ?? '',
  contactPhone: raw?.contactPhone ?? '',
  contactEmail: raw?.contactEmail ?? '',
  inventory: Array.isArray(raw?.inventory)
    ? raw.inventory.map(mapAgencyInventoryItem)
    : [],
});

// ─── Envelope serializers ────────────────────────────
export function agencyListSerializer(payload: any): AgencyApi[] {
  const list = payload?.data?.agencies ?? payload?.data ?? [];
  return Array.isArray(list) ? list.map(mapAgency) : [];
}

export function agencySingleSerializer(payload: any): AgencyApi | null {
  const raw = payload?.data?.agency ?? payload?.data;
  if (!raw) return null;
  return mapAgency(raw);
}

export function agencyDeleteSerializer(payload: any): string {
  return payload?.data?.id ?? payload?.id ?? '';
}
