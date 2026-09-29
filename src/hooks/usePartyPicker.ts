import { useEffect, useState } from 'react';

import { getCustomerByIdAPI, getCustomersAPI } from '../networks/sales/customerNetwork';
import { getVendorByIdAPI, getVendorsAPI } from '../networks/purchases/vendorNetwork';
import { customerListSerializer, customerSingleSerializer } from '../serializers/customerSerializer';
import { vendorListSerializer, vendorSingleSerializer } from '../serializers/vendorSerializer';
import { fetchAllPages } from '../models/documentListModel';
import type { Customer, Vendor } from '../types';

/**
 * Every customer, for a form's picker.
 *
 * Its own fetch, walking every page, rather than the Customers list screen's
 * state: that loads 50 at a time as it scrolls, so a form reading it offered
 * only the first 50 customers — and "Record Payment" from the 51st customer's
 * page silently failed to select them. (This hook itself stopped at 200.) A
 * customer the screen was opened for is also fetched on its own, so it is
 * selectable even if the list failed.
 */
export const useCustomerPicker = (presetId?: string) => {
  const [list, setList] = useState<Customer[]>([]);
  const [extra, setExtra] = useState<Customer | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAllPages(
      (page, limit) => getCustomersAPI({ page, limit }),
      payload => customerListSerializer(payload).customers,
    )
      .then(rows => { if (!cancelled) setList(rows); })
      .catch(() => { /* an empty picker; the preset below still resolves */ })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!presetId || !loaded || list.some(c => c.id === presetId)) return;
    let cancelled = false;
    getCustomerByIdAPI(presetId)
      .then(raw => { if (!cancelled) setExtra(customerSingleSerializer(raw)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [presetId, loaded, list]);

  const customers = extra && !list.some(c => c.id === extra.id) ? [extra, ...list] : list;
  return { customers, loaded };
};

/** Every vendor, for a form's picker — see useCustomerPicker. */
export const useVendorPicker = (presetId?: string) => {
  const [list, setList] = useState<Vendor[]>([]);
  const [extra, setExtra] = useState<Vendor | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAllPages(
      (page, limit) => getVendorsAPI({ page, limit }),
      payload => vendorListSerializer(payload).vendors,
    )
      .then(rows => { if (!cancelled) setList(rows); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!presetId || !loaded || list.some(v => v.id === presetId)) return;
    let cancelled = false;
    getVendorByIdAPI(presetId)
      .then(raw => { if (!cancelled) setExtra(vendorSingleSerializer(raw)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [presetId, loaded, list]);

  const vendors = extra && !list.some(v => v.id === extra.id) ? [extra, ...list] : list;
  return { vendors, loaded };
};

/**
 * One customer, by id — for a screen about a single document or customer.
 * Looking it up in the Customers list's state found only its first page, so
 * the 51st customer's invoice had no contact details and its edit form opened
 * empty.
 */
export const useCustomerById = (id?: string | null) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getCustomerByIdAPI(id)
      .then(raw => { if (!cancelled) setCustomer(customerSingleSerializer(raw)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);
  return customer && customer.id === id ? customer : null;
};
