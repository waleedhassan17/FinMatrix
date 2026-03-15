// ═══════════════════════════════════════════════════════
// FinMatrix — Customer Serializer
// ═══════════════════════════════════════════════════════

import type { Customer, PaymentTerms } from '../types';
import type { CustomerFormData } from '../models/customerModel';

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
