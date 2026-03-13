// ═══════════════════════════════════════════════════════
// FinMatrix — Agency Network (Dummy APIs)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import {
  warehouseAgencies,
  type WarehouseAgency,
  type AgencyInventoryItem,
} from '../dummy-data/warehouseAgencies';

// In-memory store so mutations persist during session
let agencies = [...warehouseAgencies.map(a => ({ ...a, inventory: [...a.inventory] }))];

export const getAgenciesAPI = async (): Promise<WarehouseAgency[]> => {
  return simulateApiCall(agencies.map(a => ({ ...a, inventory: [...a.inventory] })), 800);
};

export const getAgencyByIdAPI = async (id: string): Promise<WarehouseAgency> => {
  const agency = agencies.find(a => a.id === id);
  if (!agency) throw new Error('Agency not found');
  return simulateApiCall({ ...agency, inventory: [...agency.inventory] }, 400);
};

export const createAgencyAPI = async (
  data: Omit<WarehouseAgency, 'id' | 'productCount'>,
): Promise<WarehouseAgency> => {
  const newAgency: WarehouseAgency = {
    ...data,
    id: `agency-${Date.now()}`,
    productCount: data.inventory.length,
  };
  agencies.push(newAgency);
  return simulateApiCall(newAgency, 600);
};

export const updateAgencyAPI = async (
  id: string,
  data: Partial<WarehouseAgency>,
): Promise<WarehouseAgency> => {
  const idx = agencies.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Agency not found');
  agencies[idx] = {
    ...agencies[idx],
    ...data,
    productCount: data.inventory?.length ?? agencies[idx].inventory.length,
  };
  return simulateApiCall({ ...agencies[idx] }, 600);
};

export const deleteAgencyAPI = async (id: string): Promise<{ success: boolean }> => {
  const idx = agencies.findIndex(a => a.id === id);
  if (idx === -1) throw new Error('Agency not found');
  agencies.splice(idx, 1);
  return simulateApiCall({ success: true }, 400);
};

export const addAgencyInventoryItemAPI = async (
  agencyId: string,
  item: AgencyInventoryItem,
): Promise<WarehouseAgency> => {
  const idx = agencies.findIndex(a => a.id === agencyId);
  if (idx === -1) throw new Error('Agency not found');
  agencies[idx].inventory.push(item);
  agencies[idx].productCount = agencies[idx].inventory.length;
  return simulateApiCall({ ...agencies[idx], inventory: [...agencies[idx].inventory] }, 400);
};

export const syncAgencyInventoryAPI = async (
  agencyId: string,
  itemIds: string[],
): Promise<WarehouseAgency> => {
  const idx = agencies.findIndex(a => a.id === agencyId);
  if (idx === -1) throw new Error('Agency not found');
  return simulateApiCall({ ...agencies[idx], inventory: [...agencies[idx].inventory] }, 1000);
};
