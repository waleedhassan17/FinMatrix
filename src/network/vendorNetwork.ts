// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Network (Dummy API)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { vendors as seedVendors } from '../dummy-data/vendors';
import type { Vendor } from '../types';

// In-memory store for session persistence
let vendorStore: Vendor[] = [...seedVendors.map(v => ({ ...v }))];

export const getVendorsAPI = async (): Promise<Vendor[]> => {
  return simulateApiCall(vendorStore.map(v => ({ ...v })), 800);
};

export const getVendorByIdAPI = async (id: string): Promise<Vendor> => {
  const vendor = vendorStore.find(v => v.id === id);
  if (!vendor) throw new Error('Vendor not found');
  return simulateApiCall({ ...vendor }, 400);
};

export const createVendorAPI = async (
  data: Omit<Vendor, 'id' | 'balance' | 'createdAt' | 'updatedAt'>,
): Promise<Vendor> => {
  const newVendor: Vendor = {
    ...data,
    id: `vend_${Date.now()}`,
    balance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  vendorStore.push(newVendor);
  return simulateApiCall(newVendor, 600);
};

export const updateVendorAPI = async (
  id: string,
  data: Partial<Vendor>,
): Promise<Vendor> => {
  const idx = vendorStore.findIndex(v => v.id === id);
  if (idx === -1) throw new Error('Vendor not found');
  vendorStore[idx] = {
    ...vendorStore[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ ...vendorStore[idx] }, 600);
};

export const deleteVendorAPI = async (id: string): Promise<{ success: boolean }> => {
  const idx = vendorStore.findIndex(v => v.id === id);
  if (idx === -1) throw new Error('Vendor not found');
  vendorStore.splice(idx, 1);
  return simulateApiCall({ success: true }, 400);
};

export const toggleVendorActiveAPI = async (id: string): Promise<Vendor> => {
  const idx = vendorStore.findIndex(v => v.id === id);
  if (idx === -1) throw new Error('Vendor not found');
  vendorStore[idx] = {
    ...vendorStore[idx],
    isActive: !vendorStore[idx].isActive,
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ ...vendorStore[idx] }, 400);
};
