import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { WarehouseAgency } from '@models/agencyModel';
import type { DummyDeliveryPerson } from '@models/deliveryModel';
import { signOut } from './authSlice';

// ─── Types ────────────────────────────────────────────

export interface CompanyMember {
  userId: string;
  role: 'admin' | 'delivery';
  displayName: string;
  email: string;
  phone: string;
  joinedAt: string;
}

export interface CompanyData {
  companyId: string;
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
  logo: string | null;
  inviteCode: string;
  agencies: WarehouseAgency[];
  members: CompanyMember[];
  deliveryPersonnel: DummyDeliveryPerson[];
  createdAt: string;
}

export interface CompanyState {
  companies: CompanyData[];
  activeCompanyId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Helper — derive active company
export const selectActiveCompany = (state: { company: CompanyState }) => {
  const { companies, activeCompanyId } = state.company;
  return companies.find(c => c.companyId === activeCompanyId) ?? null;
};

export const selectCompanyByInviteCode = (
  state: { company: CompanyState },
  code: string,
) => {
  return state.company.companies.find(
    c => c.inviteCode.toUpperCase() === code.toUpperCase(),
  ) ?? null;
};

const initialState: CompanyState = {
  companies: [],
  activeCompanyId: null,
  isLoading: false,
  error: null,
};

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    createCompany(state, action: PayloadAction<CompanyData>) {
      state.companies.push(action.payload);
      state.activeCompanyId = action.payload.companyId;
      state.error = null;
    },
    setActiveCompany(state, action: PayloadAction<string>) {
      state.activeCompanyId = action.payload;
    },
    clearCompany(state) {
      state.activeCompanyId = null;
    },
    addAgency(
      state,
      action: PayloadAction<{ companyId: string; agency: WarehouseAgency }>,
    ) {
      const company = state.companies.find(
        c => c.companyId === action.payload.companyId,
      );
      if (company) {
        company.agencies.push(action.payload.agency);
      }
    },
    removeAgency(
      state,
      action: PayloadAction<{ companyId: string; agencyId: string }>,
    ) {
      const company = state.companies.find(
        c => c.companyId === action.payload.companyId,
      );
      if (company) {
        company.agencies = company.agencies.filter(
          a => a.id !== action.payload.agencyId,
        );
      }
    },
    addMember(
      state,
      action: PayloadAction<{ companyId: string; member: CompanyMember }>,
    ) {
      const company = state.companies.find(
        c => c.companyId === action.payload.companyId,
      );
      if (company) {
        company.members.push(action.payload.member);
      }
    },
    removeMember(
      state,
      action: PayloadAction<{ companyId: string; userId: string }>,
    ) {
      const company = state.companies.find(
        c => c.companyId === action.payload.companyId,
      );
      if (company) {
        company.members = company.members.filter(
          m => m.userId !== action.payload.userId,
        );
      }
    },
    updateMemberRole(
      state,
      action: PayloadAction<{
        companyId: string;
        userId: string;
        role: 'admin' | 'delivery';
      }>,
    ) {
      const company = state.companies.find(
        c => c.companyId === action.payload.companyId,
      );
      if (company) {
        const member = company.members.find(
          m => m.userId === action.payload.userId,
        );
        if (member) {
          member.role = action.payload.role;
        }
      }
    },
    addDeliveryPersonnel(
      state,
      action: PayloadAction<{
        companyId: string;
        person: DummyDeliveryPerson;
      }>,
    ) {
      const company = state.companies.find(
        c => c.companyId === action.payload.companyId,
      );
      if (company) {
        company.deliveryPersonnel.push(action.payload.person);
      }
    },
    removeDeliveryPersonnel(
      state,
      action: PayloadAction<{ companyId: string; userId: string }>,
    ) {
      const company = state.companies.find(
        c => c.companyId === action.payload.companyId,
      );
      if (company) {
        company.deliveryPersonnel = company.deliveryPersonnel.filter(
          p => p.userId !== action.payload.userId,
        );
      }
    },
    updateDeliveryPersonnel(
      state,
      action: PayloadAction<{
        companyId: string;
        userId: string;
        updates: Partial<DummyDeliveryPerson>;
      }>,
    ) {
      const company = state.companies.find(
        c => c.companyId === action.payload.companyId,
      );
      if (company) {
        const person = company.deliveryPersonnel.find(
          p => p.userId === action.payload.userId,
        );
        if (person) {
          Object.assign(person, action.payload.updates);
        }
      }
    },
    setCompanyLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setCompanyError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addCase(signOut, () => initialState);
  },
});

export const {
  createCompany,
  setActiveCompany,
  clearCompany,
  addAgency,
  removeAgency,
  addMember,
  removeMember,
  updateMemberRole,
  addDeliveryPersonnel,
  removeDeliveryPersonnel,
  updateDeliveryPersonnel,
  setCompanyLoading,
  setCompanyError,
} = companySlice.actions;

export default companySlice.reducer;
