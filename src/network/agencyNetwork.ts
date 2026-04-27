// ═══════════════════════════════════════════════════════
// FinMatrix — Agency Network (Dummy APIs)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import {
  warehouseAgencies,
  type WarehouseAgency,
  type AgencyInventoryItem,
} from '../dummy-data/warehouseAgencies';
import type {
  AgencyDeleteResponse,
  AgencyListResponse,
  AgencySingleResponse,
  ApiEnvelope,
} from '../models/agencyModel';

// In-memory store so mutations persist during session
let agencies = [...warehouseAgencies.map(a => ({ ...a, inventory: [...a.inventory] }))];

const cloneAgency = (a: WarehouseAgency): WarehouseAgency => ({
  ...a,
  inventory: [...a.inventory],
});

export const getAgenciesAPI = async (): Promise<
  ApiEnvelope<AgencyListResponse>
> =>
  simulateApiCall(
    { success: true, data: { agencies: agencies.map(cloneAgency) } },
    800,
  );

export const getAgencyByIdAPI = async (
  id: string,
): Promise<ApiEnvelope<AgencySingleResponse>> => {
  const agency = agencies.find(a => a.id === id);
  if (!agency) throw new Error('Agency not found');
  return simulateApiCall(
    { success: true, data: { agency: cloneAgency(agency) } },
    400,
  );
};

export const createAgencyAPI = async (
  data: Omit<WarehouseAgency, 'id' | 'productCount'>,
): Promise<ApiEnvelope<AgencySingleResponse>> => {
  const newAgency: WarehouseAgency = {
    ...data,
    id: `agency-${Date.now()}`,
    productCount: data.inventory.length,
  };
  agencies.push(newAgency);
  return simulateApiCall(
    { success: true, data: { agency: cloneAgency(newAgency) } },
    600,
  );
};

export const updateAgencyAPI = async (
  id: string,
  data: Partial<WarehouseAgency>,
): Promise<ApiEnvelope<AgencySingleResponse>> => {
  const idx = agencies.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Agency not found');
  agencies[idx] = {
    ...agencies[idx],
    ...data,
    productCount: data.inventory?.length ?? agencies[idx].inventory.length,
  };
  return simulateApiCall(
    { success: true, data: { agency: cloneAgency(agencies[idx]) } },
    600,
  );
};

export const deleteAgencyAPI = async (
  id: string,
): Promise<ApiEnvelope<AgencyDeleteResponse>> => {
  const idx = agencies.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Agency not found');
  agencies.splice(idx, 1);
  return simulateApiCall({ success: true, data: { id } }, 400);
};

export const addAgencyInventoryItemAPI = async (
  agencyId: string,
  item: AgencyInventoryItem,
): Promise<ApiEnvelope<AgencySingleResponse>> => {
  const idx = agencies.findIndex(a => a.id === agencyId);
  if (idx === -1) throw new Error('Agency not found');
  agencies[idx].inventory.push(item);
  agencies[idx].productCount = agencies[idx].inventory.length;
  return simulateApiCall(
    { success: true, data: { agency: cloneAgency(agencies[idx]) } },
    400,
  );
};

export const syncAgencyInventoryAPI = async (
  agencyId: string,
  _itemIds: string[],
): Promise<ApiEnvelope<AgencySingleResponse>> => {
  const idx = agencies.findIndex(a => a.id === agencyId);
  if (idx === -1) throw new Error('Agency not found');
  return simulateApiCall(
    { success: true, data: { agency: cloneAgency(agencies[idx]) } },
    1000,
  );
};
