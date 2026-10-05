// ═══════════════════════════════════════════════════════
// FinMatrix — paying against the outstanding summary
// ═══════════════════════════════════════════════════════
// From the summary, "Receive Payment" opens with every open invoice ticked, so
// one amount received is spread oldest first — 30 lakh and 20 lakh in full, 10
// on the third — and each invoice's amount can still be typed by hand.

import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));
jest.mock('../../../../networks/sales/paymentNetwork', () => ({
  createPaymentAPI: jest.fn(),
  settleInvoicesAPI: jest.fn(),
  getOutstandingInvoicesAPI: jest.fn(),
}));
jest.mock('../../../../networks/sales/invoiceNetwork', () => ({
  getInvoicesAPI: jest.fn(),
  getInvoiceByIdAPI: jest.fn(),
}));
jest.mock('../../../../networks/reports/arAgingNetwork', () => ({
  getARPartySummaryAPI: jest.fn(),
}));

import { getOutstandingInvoicesAPI } from '../../../../networks/sales/paymentNetwork';
import {
  distributeAmount,
  fetchOutstandingForPayment,
  openForSummary,
  receivePaymentSlice,
  setAllocatedAmount,
  setPaymentCustomer,
  setPaymentField,
} from '../receivePaymentSlice';

const LAKH = 100_000;
const makeStore = () => configureStore({ reducer: { receivePayment: receivePaymentSlice.reducer } });
const rows = (store: ReturnType<typeof makeStore>) => store.getState().receivePayment.outstandingRows;

const invoices = [
  { id: 'i1', invoiceNumber: 'INV-1', dueDate: '2026-08-01', total: 30 * LAKH, amountPaid: 0, balance: 30 * LAKH },
  { id: 'i2', invoiceNumber: 'INV-2', dueDate: '2026-08-20', total: 20 * LAKH, amountPaid: 0, balance: 20 * LAKH },
  { id: 'i3', invoiceNumber: 'INV-3', dueDate: '2026-09-10', total: 50 * LAKH, amountPaid: 0, balance: 50 * LAKH },
];

beforeEach(() => {
  (getOutstandingInvoicesAPI as jest.Mock).mockResolvedValue({ data: invoices });
});

it('ticks every invoice when opened from the summary, and spreads 60 lakh oldest first', async () => {
  const store = makeStore();
  store.dispatch(openForSummary());
  store.dispatch(setPaymentCustomer({ id: 'c1', name: 'Ali Traders' }));
  await store.dispatch(fetchOutstandingForPayment('c1'));

  expect(rows(store).every(r => r.checked)).toBe(true);
  expect(store.getState().receivePayment.useCredits).toBe(true);

  store.dispatch(setPaymentField({ key: 'amount', value: String(60 * LAKH) }));
  store.dispatch(distributeAmount());
  expect(rows(store).map(r => r.allocated)).toEqual([30 * LAKH, 20 * LAKH, 10 * LAKH]);
});

it('takes an amount typed on one invoice, capped at what it owes, and keeps it ticked at zero', async () => {
  const store = makeStore();
  store.dispatch(setPaymentCustomer({ id: 'c1', name: 'Ali Traders' }));
  await store.dispatch(fetchOutstandingForPayment('c1'));

  store.dispatch(setAllocatedAmount({ invoiceId: 'i3', amount: 10 * LAKH }));
  expect(rows(store).find(r => r.invoiceId === 'i3')).toMatchObject({ allocated: 10 * LAKH, checked: true });

  store.dispatch(setAllocatedAmount({ invoiceId: 'i2', amount: 99 * LAKH }));
  expect(rows(store).find(r => r.invoiceId === 'i2')?.allocated).toBe(20 * LAKH);

  // Clearing the box to retype must not untick the invoice under the user's thumb.
  store.dispatch(setAllocatedAmount({ invoiceId: 'i3', amount: 0 }));
  expect(rows(store).find(r => r.invoiceId === 'i3')).toMatchObject({ allocated: 0, checked: true });
});
