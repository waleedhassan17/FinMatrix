// ═══════════════════════════════════════════════════════
// FinMatrix — Customer Network (Dummy API)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { customers as seedCustomers } from '../dummy-data/customers';
import type { Customer } from '../types';

// In-memory store for session persistence
let customerStore: Customer[] = [...seedCustomers.map(c => ({ ...c }))];

export const getCustomersAPI = async (): Promise<Customer[]> => {
  return simulateApiCall(customerStore.map(c => ({ ...c })), 800);
};

export const getCustomerByIdAPI = async (id: string): Promise<Customer> => {
  const customer = customerStore.find(c => c.id === id);
  if (!customer) throw new Error('Customer not found');
  return simulateApiCall({ ...customer }, 400);
};

export const createCustomerAPI = async (
  data: Omit<Customer, 'id' | 'balance' | 'totalPurchases' | 'createdAt' | 'updatedAt'>,
): Promise<Customer> => {
  const newCustomer: Customer = {
    ...data,
    id: `cust_${Date.now()}`,
    balance: 0,
    totalPurchases: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  customerStore.push(newCustomer);
  return simulateApiCall(newCustomer, 600);
};

export const updateCustomerAPI = async (
  id: string,
  data: Partial<Customer>,
): Promise<Customer> => {
  const idx = customerStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Customer not found');
  customerStore[idx] = {
    ...customerStore[idx],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ ...customerStore[idx] }, 600);
};

export const deleteCustomerAPI = async (id: string): Promise<{ success: boolean }> => {
  const idx = customerStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Customer not found');
  customerStore.splice(idx, 1);
  return simulateApiCall({ success: true }, 400);
};

export const toggleCustomerActiveAPI = async (id: string): Promise<Customer> => {
  const idx = customerStore.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Customer not found');
  customerStore[idx] = {
    ...customerStore[idx],
    isActive: !customerStore[idx].isActive,
    updatedAt: new Date().toISOString(),
  };
  return simulateApiCall({ ...customerStore[idx] }, 400);
};
