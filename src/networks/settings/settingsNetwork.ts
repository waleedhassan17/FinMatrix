// ═══════════════════════════════════════════════════════
// FinMatrix — Settings Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, extractErrorMessage } from '../network/apiHelpers';
import {
  preferencesResponseSerializer,
  companiesResponseSerializer,
} from '../../serializers/settingsSerializer';
import type { CompanyProfilePayload } from '../../models/settingsModel';

// Entity shapes live in models/settingsModel.ts; re-exported here so
// existing imports from this module keep working.
export type {
  CompanyProfilePayload,
  CompanySwitcherItem,
} from '../../models/settingsModel';

export const getSettingsAPI = async (): Promise<any> => {
  try {
    const response = await api.get('/settings');
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateSettingsAPI = async (data: any): Promise<any> => {
  try {
    const response = await api.patch('/settings', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getAllUsersAPI = async (): Promise<any> => {
  try {
    const response = await api.get('/settings/users');
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const inviteUserAPI = async (data: { email: string; role: string; displayName?: string }): Promise<any> => {
  try {
    const response = await api.post('/settings/users/invite', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Aliases used by settingsSlice ──────────────────
export const fetchPreferences = async (): Promise<any> => {
  const res = await getSettingsAPI();
  return preferencesResponseSerializer(res);
};

export const savePreferences = async (preferences: any): Promise<any> => {
  const res = await updateSettingsAPI({ preferences });
  return res?.data?.preferences ?? res?.data ?? preferences;
};

export const saveCompanyProfile = async (data: CompanyProfilePayload): Promise<any> => {
  return updateSettingsAPI(data);
};

export const fetchCompanies = async (): Promise<any> => {
  try {
    const response = await api.get('/auth/me');
    return companiesResponseSerializer(response.data);
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const fetchUsers = async (): Promise<any> => {
  return getAllUsersAPI();
};

export const updateUserRole = async (userId: string, role: string): Promise<any> => {
  try {
    const response = await api.patch(`/settings/users/${userId}`, { role });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const removeUser = async (userId: string): Promise<any> => {
  try {
    const response = await api.delete(`/settings/users/${userId}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const inviteUser = async (emailOrData: string | { email: string; role: string; displayName?: string }, role?: string): Promise<any> => {
  if (typeof emailOrData === 'string') {
    return inviteUserAPI({ email: emailOrData, role: role ?? 'member', displayName: emailOrData });
  }
  return inviteUserAPI(emailOrData);
};
