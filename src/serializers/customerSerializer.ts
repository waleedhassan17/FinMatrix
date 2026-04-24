// ═══════════════════════════════════════════════════════
// FinMatrix — Customer Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN network and slice.
// Takes the raw API response and returns a clean,
// UI-ready data structure with inline field mapping.

import type { Customer, PaymentTerms } from '../types';
import type { CustomerApiEntity, CustomerFormData } from '../models/customerModel';

// ─── Serialized outputs for the slice ────────────────

export interface SerializedCustomerList {
  customers: Customer[];
  page: number;
  totalPages: number;
  totalCustomers: number;
}

// ─── Raw entity → UI Customer ────────────────────────

export const mapCustomer = (raw: Partial<CustomerApiEntity>): Customer => {
  const emptyAddress = { street: '', city: '', state: '', zipCode: '', country: 'Pakistan' };
  return {
    id: raw.id ?? '',
    companyId: raw.companyId ?? '',
    name: raw.name ?? '',
    company: raw.company ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    address: raw.address ?? '',
    billingAddress: { ...emptyAddress, ...(raw.billingAddress ?? {}) },
    shippingAddress: { ...emptyAddress, ...(raw.shippingAddress ?? {}) },
    balance: typeof raw.balance === 'number' ? raw.balance : 0,
    creditLimit: typeof raw.creditLimit === 'number' ? raw.creditLimit : 0,
    totalPurchases: typeof raw.totalPurchases === 'number' ? raw.totalPurchases : 0,
    paymentTerms: (raw.paymentTerms ?? 'net_30') as PaymentTerms,
    contactPerson: raw.contactPerson ?? '',
    taxId: raw.taxId ?? '',
    notes: raw.notes ?? '',
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
  };
};

// ─── List serializer ─────────────────────────────────

export function customerListSerializer(payload: any): SerializedCustomerList {
  const data = payload?.data || {};
  const rawCustomers: any[] = data.customers || [];
  const pagination = data.pagination || {};

  return {
    customers: rawCustomers.map(mapCustomer),
    page: pagination.page ?? 1,
    totalPages: pagination.totalPages ?? 1,
    totalCustomers: pagination.total ?? rawCustomers.length,
  };
}

// ─── Single-customer serializer ──────────────────────

export function customerSingleSerializer(payload: any): Customer | null {
  const raw = payload?.data?.customer;
  if (!raw) return null;
  return mapCustomer(raw);
}

// ═══════════════════════════════════════════════════════
// Form ↔ API helpers (kept from existing implementation)
// ═══════════════════════════════════════════════════════

/**
 * Converts a Customer object from API into form-ready data for editing.
 */
export const customerToFormData = (customer: Customer): CustomerFormData => {
  const billingSameAsShipping =
    customer.billingAddress.street === customer.shippingAddress.street &&
    customer.billingAddress.city === customer.shippingAddress.city &&
    customer.billingAddress.state === customer.shippingAddress.state &&
    customer.billingAddress.zipCode === customer.shippingAddress.zipCode &&
    customer.billingAddress.country === customer.shippingAddress.country;

  return {
    name: customer.name,
    company: customer.company,
    email: customer.email,
    phone: customer.phone,
    billingStreet: customer.billingAddress.street,
    billingCity: customer.billingAddress.city,
    billingState: customer.billingAddress.state,
    billingZipCode: customer.billingAddress.zipCode,
    billingCountry: customer.billingAddress.country,
    sameAsBilling: billingSameAsShipping,
    shippingStreet: customer.shippingAddress.street,
    shippingCity: customer.shippingAddress.city,
    shippingState: customer.shippingAddress.state,
    shippingZipCode: customer.shippingAddress.zipCode,
    shippingCountry: customer.shippingAddress.country,
    creditLimit: String(customer.creditLimit),
    paymentTerms: customer.paymentTerms,
    contactPerson: customer.contactPerson,
    taxId: customer.taxId,
    notes: customer.notes,
  };
};

/**
 * Converts form data into the API payload for creating / updating a customer.
 */
export const formDataToCustomerPayload = (
  form: CustomerFormData,
  companyId: string,
): Omit<Customer, 'id' | 'balance' | 'totalPurchases' | 'createdAt' | 'updatedAt'> => {
  const billingAddress = {
    street: form.billingStreet.trim(),
    city: form.billingCity.trim(),
    state: form.billingState.trim(),
    zipCode: form.billingZipCode.trim(),
    country: form.billingCountry.trim() || 'Pakistan',
  };

  const shippingAddress = form.sameAsBilling
    ? { ...billingAddress }
    : {
        street: form.shippingStreet.trim(),
        city: form.shippingCity.trim(),
        state: form.shippingState.trim(),
        zipCode: form.shippingZipCode.trim(),
        country: form.shippingCountry.trim() || 'Pakistan',
      };

  return {
    companyId,
    name: form.name.trim(),
    company: form.company.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    address: `${billingAddress.street}, ${billingAddress.city}`,
    billingAddress,
    shippingAddress,
    creditLimit: parseFloat(form.creditLimit) || 0,
    paymentTerms: form.paymentTerms as PaymentTerms,
    contactPerson: form.contactPerson.trim(),
    taxId: form.taxId.trim(),
    notes: form.notes.trim(),
    isActive: true,
  };
};
