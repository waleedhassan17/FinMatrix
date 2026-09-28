import { useEffect, useState } from 'react';

import { getCustomerByIdAPI, getCustomersAPI } from '../networks/sales/customerNetwork';
import { getVendorByIdAPI, getVendorsAPI } from '../networks/purchases/vendorNetwork';
import { customerListSerializer, customerSingleSerializer } from '../serializers/customerSerializer';
import { vendorListSerializer, vendorSingleSerializer } from '../serializers/vendorSerializer';
import type { Customer, Vendor } from '../types';

/** The most the server returns in one page — what the web's pickers load. */
const PICKER_LIMIT = 200;

/**
 * The customers a payment can be received from, for its picker.
 *
 * Its own fetch, sized like the web's picker, rather than the Customers list
 * screen's state: that loads 50 at a time as it scrolls, so a payment screen
 * reading it offered only the first 50 customers — and "Record Payment" from
 * the 51st customer's page silently failed to select them. A customer the
 * screen was opened for is fetched on its own when it is not among the 200.
 */
export const useCustomerPicker = (presetId?: string) => {
  const [list, setList] = useState<Customer[]>([]);
  const [extra, setExtra] = useState<Customer | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCustomersAPI({ page: 1, limit: PICKER_LIMIT })
      .then(raw => { if (!cancelled) setList(customerListSerializer(raw).customers); })
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

/** The vendors a bill can be paid to — see useCustomerPicker. */
export const useVendorPicker = (presetId?: string) => {
  const [list, setList] = useState<Vendor[]>([]);
  const [extra, setExtra] = useState<Vendor | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVendorsAPI({ page: 1, limit: PICKER_LIMIT })
      .then(raw => { if (!cancelled) setList(vendorListSerializer(raw).vendors); })
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
