// ═══════════════════════════════════════════════════════
// FinMatrix — Customer Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// Base path: /api/v1/customers
// When backend (NestJS) is ready, replace dummy logic with
// real axios/fetch calls. Only the function bodies change;
// the exported signatures stay the same.

import { simulateApiCall, API_BASE_URL } from './apiHelpers';
import { customers as seedCustomers } from '../dummy-data/customers';
import type { CustomerApiEntity } from '../models/customerModel';
import type { Customer } from '../types';

// ─── Query Params ────────────────────────────────────

export interface CustomerQueryParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ─── In-memory store (session persistence) ───────────
let customerStore: CustomerApiEntity[] = seedCustomers.map(c => ({
  ...c,
  billingAddress: { ...c.billingAddress },
  shippingAddress: { ...c.shippingAddress },
}));

// ─── Standard API response envelope ──────────────────
interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

// ═══════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/customers
 *
 * ★ REAL API:
 * const response = await axios.get(`${API_BASE_URL}/v1/customers`, { params });
 * return response.data;
 */
export const getCustomersAPI = async (
  params: CustomerQueryParams = {},
): Promise<any> => {
  let filtered = customerStore.map(c => ({ ...c }));

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q),
    );
  }
  if (typeof params.isActive === 'boolean') {
    filtered = filtered.filter(c => c.isActive === params.isActive);
  }

  const page = params.page || 1;
  const limit = params.limit || 100;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  const response: ApiEnvelope<{
    customers: CustomerApiEntity[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> = {
    success: true,
    data: {
      customers: paged,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    },
  };

  return simulateApiCall(response, 800);
};

/**
 * GET /api/v1/customers/:id
 */
export const getCustomerByIdAPI = async (id: string): Promise<any> => {
  const customer = customerStore.find(c => c.id === id);
  if (!customer) throw new Error('Customer not found');
  return simulateApiCall(
    { success: true, data: { customer: { ...customer } } },
    400,
  );
};

/**
 * POST /api/v1/customers
 */
export const createCustomerAPI = async (
  data: Omit<Customer, 'id' | 'balance' | 'totalPurchases' | 'createdAt' | 'updatedAt'>,
): Promise<any> => {
  const newCustomer: CustomerApiEntity = {
    ...data,
    id: `cust_${Date.now()}`,
    balance: 0,
    totalPurchases: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  customerStore.push(newCustomer);
  return simulateApiCall(
    { success: true, data: { customer: { ...newCustomer } } },
    600,
  );
};

/**
 * PUT /api/v1/customers/:id
 */
export const updateCustomerAPI = async (
  id: string,
  data: Partial<Customer>,
): Promise<any> => {
  const idx = customerStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Customer not found');
  customerStore[idx] = {
    ...customerStore[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  } as CustomerApiEntity;
  return simulateApiCall(
    { success: true, data: { customer: { ...customerStore[idx] } } },
    600,
  );
};

/**
 * DELETE /api/v1/customers/:id
 */
export const deleteCustomerAPI = async (id: string): Promise<any> => {
  const idx = customerStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Customer not found');
  customerStore.splice(idx, 1);
  return simulateApiCall({ success: true, data: { id } }, 400);
};

/**
 * POST /api/v1/customers/:id/toggle-active
 */
export const toggleCustomerActiveAPI = async (id: string): Promise<any> => {
  const idx = customerStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Customer not found');
  customerStore[idx] = {
    ...customerStore[idx],
    isActive: !customerStore[idx].isActive,
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall(
    { success: true, data: { customer: { ...customerStore[idx] } } },
    400,
  );
};

// Keep reference to silence unused import warning in some configs
void API_BASE_URL;
