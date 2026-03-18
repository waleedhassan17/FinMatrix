import { simulateApiCall } from './apiHelpers';
import {
  DEFAULT_PREFERENCES,
  DUMMY_USERS,
  type AppPreferences,
} from '../dummy-data/settingsData';
import type { CompanyMember } from '../screens/Auth/companySlice';

/* ─── Preferences ─── */
let storedPrefs: AppPreferences = { ...DEFAULT_PREFERENCES };

export const fetchPreferences = () => simulateApiCall(storedPrefs, 400);

export const savePreferences = (prefs: AppPreferences) => {
  storedPrefs = { ...prefs };
  return simulateApiCall(storedPrefs, 500);
};

/* ─── Company Profile ─── */
export interface CompanyProfilePayload {
  name: string;
  industry: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  fiscalYearStart: string;
}

export const saveCompanyProfile = (data: CompanyProfilePayload) =>
  simulateApiCall({ ...data, updatedAt: new Date().toISOString() }, 600);

/* ─── User Management ─── */
let users: CompanyMember[] = [...DUMMY_USERS];

export const fetchUsers = () => simulateApiCall([...users], 500);

export const inviteUser = (email: string, role: 'admin' | 'delivery') => {
  const newUser: CompanyMember = {
    userId: `u-${Date.now()}`,
    role,
    displayName: email.split('@')[0],
    email,
    phone: '',
    joinedAt: new Date().toISOString(),
  };
  users = [...users, newUser];
  return simulateApiCall(newUser, 600);
};

export const updateUserRole = (userId: string, role: 'admin' | 'delivery') => {
  users = users.map(u => (u.userId === userId ? { ...u, role } : u));
  return simulateApiCall({ userId, role }, 400);
};

export const removeUser = (userId: string) => {
  users = users.filter(u => u.userId !== userId);
  return simulateApiCall({ userId }, 400);
};

/* ─── Company Switcher ─── */
export interface CompanySwitcherItem {
  companyId: string;
  name: string;
  industry: string;
  role: string;
  memberCount: number;
}

export const fetchCompanies = (): Promise<CompanySwitcherItem[]> =>
  simulateApiCall(
    [
      { companyId: 'c-001', name: 'FinMatrix Trading Co.', industry: 'Trading', role: 'Owner', memberCount: 5 },
      { companyId: 'c-002', name: 'Al-Noor Distributors', industry: 'Distribution', role: 'Admin', memberCount: 12 },
      { companyId: 'c-003', name: 'Pak Supplies Ltd.', industry: 'Manufacturing', role: 'Admin', memberCount: 8 },
    ],
    500,
  );

/* ─── Data Management ─── */
export const exportData = () => simulateApiCall({ success: true, file: 'finmatrix_export.json' }, 1000);
export const importData = () => simulateApiCall({ success: true, recordsImported: 156 }, 1200);
export const clearDemoData = () => simulateApiCall({ success: true }, 800);
