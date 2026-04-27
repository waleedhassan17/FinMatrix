// ═══════════════════════════════════════════════════════
// FinMatrix — Agency Model & Validation
// ═══════════════════════════════════════════════════════
// API contract + UI form contract for the Agency feature.
// Mirrors the GL / Banking / Employees / Payroll pattern.

import type { WarehouseAgency, AgencyInventoryItem } from '../dummy-data/warehouseAgencies';

export type AgencyType = 'Manufacturing' | 'Supply' | 'Distribution';

// ─── API entity & envelope types ─────────────────────
export type AgencyApi = WarehouseAgency;
export type AgencyInventoryItemApi = AgencyInventoryItem;

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface AgencyListResponse {
  agencies: AgencyApi[];
}
export interface AgencySingleResponse {
  agency: AgencyApi;
}
export interface AgencyDeleteResponse {
  id: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface AgencyFormData {
  name: string;
  type: AgencyType | '';
  description: string;
  address: string;
  city: string;
  province: string;
  contactPhone: string;
  contactEmail: string;
}

export const AGENCY_TYPE_OPTIONS: { label: string; value: AgencyType }[] = [
  { label: 'Manufacturing', value: 'Manufacturing' },
  { label: 'Supply', value: 'Supply' },
  { label: 'Distribution', value: 'Distribution' },
];

export const AGENCY_TYPE_COLORS: Record<AgencyType, string> = {
  Manufacturing: '#2E75B6',
  Supply: '#27AE60',
  Distribution: '#8E44AD',
};

export const PROVINCE_OPTIONS = [
  { label: 'Sindh', value: 'Sindh' },
  { label: 'Punjab', value: 'Punjab' },
  { label: 'KPK', value: 'KPK' },
  { label: 'Balochistan', value: 'Balochistan' },
  { label: 'Islamabad', value: 'Islamabad' },
  { label: 'Gilgit-Baltistan', value: 'Gilgit-Baltistan' },
  { label: 'AJK', value: 'AJK' },
];

export const validateAgency = (data: AgencyFormData): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!data.name.trim()) errors.name = 'Agency name is required';
  if (!data.type) errors.type = 'Agency type is required';
  if (!data.address.trim()) errors.address = 'Address is required';
  if (!data.city.trim()) errors.city = 'City is required';
  if (!data.contactPhone.trim()) errors.contactPhone = 'Phone number is required';
  if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
    errors.contactEmail = 'Invalid email format';
  }
  return errors;
};
