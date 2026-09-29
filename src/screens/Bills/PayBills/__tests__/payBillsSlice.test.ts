// ═══════════════════════════════════════════════════════
// FinMatrix — Pay Bills: vendor credit and cash, all or nothing
// ═══════════════════════════════════════════════════════
// Settles the way the web's Pay Bills does. Each ticked bill's figure is what
// it is settled by; the vendor's credit — on as soon as there is any — covers
// the first of it, oldest bill first; the rest is cash. Credit and cash go as
// ONE /bills/settle request, so a refused payment can no longer leave credit
// spent; a payment with no credit in play stays the plain /bills/pay.

import { configureStore } from '@reduxjs/toolkit';

// The payables summary's serializer reaches the report helpers, and the real
// network module pulls in Expo's environment, which Jest cannot load.
jest.mock('../../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));
jest.mock('../../../../networks/purchases/billNetwork', () => ({
  getBillsAPI: jest.fn(),
  payBillsAPI: jest.fn(),
  settleBillsAPI: jest.fn(),
  uploadBillPaymentProofAPI: jest.fn(),
}));
jest.mock('../../../../networks/reports/apAgingNetwork', () => ({
  getAPPartySummaryAPI: jest.fn(),
}));

import { getBillsAPI, payBillsAPI, settleBillsAPI } from '../../../../networks/purchases/billNetwork';
import { getAPPartySummaryAPI } from '../../../../networks/reports/apAgingNetwork';
import {
  buildRows,
  fetchBillsForPayment,
  fetchVendorCreditsForPayment,
  payBillsSlice,
  savePayment,
  setBillAllocation,
  setCreditUse,
  setPayBillField,
  setPayBillVendor,
  setUseCredits,
  toggleBillCheck,
} from '../payBillsSlice';
import type { Bill } from '../../../../types';

const listBills = getBillsAPI as jest.Mock;
const pay = payBillsAPI as jest.Mock;
const settle = settleBillsAPI as jest.Mock;
const summaryApi = getAPPartySummaryAPI as jest.Mock;

const bill = (id: string, dueDate: string, total: number, amountPaid = 0, status = 'open', vendorId = 'v1') =>
  ({
    id,
    billNumber: `BILL-${id}`,
    vendorId,
    vendorName: 'Acme',
    dueDate,
    total,
    amountPaid,
    status,
  }) as unknown as Bill;

const credits = (items: object[]) => ({ success: true, data: { partyType: 'vendor', credits: { total: 0, items } } });

const makeStore = () => configureStore({ reducer: { payBills: payBillsSlice.reducer } });

/** An overdue bill of 700 and a current one of 300; a partly used credit with 150 left. */
const books = async (creditItems: object[] = [
  { kind: 'vendor_credit', id: 'vc-1', reference: 'VC-1', date: '2026-09-01', amount: 200, available: 150 },
]) => {
  const store = makeStore();
  store.dispatch(setPayBillVendor({ id: 'v1', name: 'Acme' }));
  store.dispatch(setPayBillField({ key: 'paymentDate', value: '2026-09-28' }));
  store.dispatch(setPayBillField({ key: 'bankAccountId', value: 'acct-cash' }));
  store.dispatch(setPayBillField({ key: 'proofId', value: 'proof-1' }));
  listBills.mockResolvedValue({ data: [bill('due', '2026-10-20', 300), bill('late', '2026-08-01', 700)] });
  await store.dispatch(fetchBillsForPayment('v1'));
  summaryApi.mockResolvedValue(credits(creditItems));
  await store.dispatch(fetchVendorCreditsForPayment('v1'));
  return store;
};
const rowsOf = (store: ReturnType<typeof makeStore>) =>
  Object.fromEntries(store.getState().payBills.outstandingRows.map(r => [r.billId, r]));
const save = (store: ReturnType<typeof makeStore>) =>
  store.dispatch(savePayment({ paymentNumber: 'PAY-1', idempotencyKey: 'key-1' }));

beforeEach(() => jest.clearAllMocks());

describe('the bills offered', () => {
  it("asks the server for this vendor's bills, every page, not the company's latest page", async () => {
    await books();
    expect(listBills).toHaveBeenCalledWith({ vendorId: 'v1', page: 1, limit: 200 });
  });

  it('keeps unpaid posted bills, oldest due first; drops drafts, voids and paid ones', () => {
    const rows = buildRows(
      [
        bill('b', '2026-10-01', 100),
        bill('a', '2026-08-01', 100, 40, 'partial'),
        bill('draft', '2026-07-01', 100, 0, 'draft'),
        bill('void', '2026-07-01', 100, 0, 'void'),
        bill('paid', '2026-07-01', 100, 100, 'paid'),
        bill('other', '2026-07-01', 100, 0, 'open', 'v2'),
      ],
      'v1',
    );
    expect(rows.map(r => [r.billId, r.balance])).toEqual([
      ['a', 60],
      ['b', 100],
    ]);
  });

  it('drops a late answer for a vendor who is no longer selected', async () => {
    const store = makeStore();
    store.dispatch(setPayBillVendor({ id: 'v2', name: 'Other' }));
    listBills.mockResolvedValue({ data: [bill('x', '2026-08-01', 50)] });
    await store.dispatch(fetchBillsForPayment('v1'));
    expect(store.getState().payBills.outstandingRows).toEqual([]);
  });
});

describe('vendor credit', () => {
  it('offers a partly used credit, switched on straight away', async () => {
    const store = await books();
    const state = store.getState().payBills;
    expect(state.credits.map(c => [c.id, c.kind, c.available, c.use])).toEqual([['vc-1', 'vendor_credit', 150, '150']]);
    expect(state.useCredits).toBe(true);
  });

  it('leaves the switch off when the vendor has no credit', async () => {
    const store = await books([]);
    expect(store.getState().payBills.useCredits).toBe(false);
  });

  it('covers the first of the oldest ticked bill; the rest is cash', async () => {
    const store = await books();
    store.dispatch(toggleBillCheck('late'));
    expect(rowsOf(store).late.allocated).toBe(700);
    expect(rowsOf(store).late.creditApplied).toBe(150);
  });

  it('follows a bill settled in part: credit covers the first of what is being settled', async () => {
    const store = await books();
    store.dispatch(setBillAllocation({ billId: 'late', value: '100' }));
    expect(rowsOf(store).late.creditApplied).toBe(100);
  });

  it('spends only the part of a credit the user chose, and none when switched off', async () => {
    const store = await books();
    store.dispatch(toggleBillCheck('late'));
    store.dispatch(setCreditUse({ id: 'vc-1', value: '40' }));
    expect(rowsOf(store).late.creditApplied).toBe(40);
    store.dispatch(setUseCredits(false));
    expect(rowsOf(store).late.creditApplied).toBe(0);
  });
});

describe('savePayment', () => {
  it('with no credit in play, posts the plain payment it always did', async () => {
    pay.mockResolvedValue({ data: { id: 'bp-1' } });
    const store = await books([]);
    store.dispatch(toggleBillCheck('late'));
    await save(store);

    expect(settle).not.toHaveBeenCalled();
    expect(pay).toHaveBeenCalledWith(
      expect.objectContaining({
        vendorId: 'v1',
        proofId: 'proof-1',
        applications: [{ billId: 'late', amount: '700.00' }],
      }),
      'key-1',
    );
  });

  it('credit plus cash go as ONE settlement, under the same idempotency key', async () => {
    settle.mockResolvedValue({ data: { payment: { id: 'bp-2' }, credits: [] } });
    const store = await books();
    store.dispatch(toggleBillCheck('late'));
    await save(store);

    expect(pay).not.toHaveBeenCalled();
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith(
      {
        vendorId: 'v1',
        paymentDate: '2026-09-28',
        credits: [{ vendorCreditId: 'vc-1', billId: 'late', amount: '150.00' }],
        cash: expect.objectContaining({
          bankAccountId: 'acct-cash',
          proofId: 'proof-1',
          applications: [{ billId: 'late', amount: '550.00' }],
        }),
      },
      'key-1',
    );
  });

  it('credit alone sends no cash leg — so no proof or account is needed', async () => {
    settle.mockResolvedValue({ data: { payment: null, credits: [] } });
    const store = await books([
      { kind: 'vendor_credit', id: 'vc-2', reference: 'VC-2', date: '2026-09-01', amount: 400, available: 400 },
    ]);
    store.dispatch(setPayBillField({ key: 'proofId', value: '' }));
    store.dispatch(setPayBillField({ key: 'bankAccountId', value: '' }));
    store.dispatch(toggleBillCheck('due'));
    await save(store);

    const body = settle.mock.calls[0][0];
    expect(body).not.toHaveProperty('cash');
    expect(body.credits).toEqual([{ vendorCreditId: 'vc-2', billId: 'due', amount: '300.00' }]);
  });

  it('spreads one credit over two bills, oldest first', async () => {
    settle.mockResolvedValue({ data: { payment: { id: 'bp-4' }, credits: [] } });
    const store = await books([
      { kind: 'vendor_credit', id: 'vc-3', reference: 'VC-3', date: '2026-09-01', amount: 800, available: 800 },
    ]);
    store.dispatch(toggleBillCheck('due'));
    store.dispatch(toggleBillCheck('late'));
    await save(store);

    const body = settle.mock.calls[0][0];
    expect(body.credits).toEqual([
      { vendorCreditId: 'vc-3', billId: 'late', amount: '700.00' },
      { vendorCreditId: 'vc-3', billId: 'due', amount: '100.00' },
    ]);
    expect(body.cash.applications).toEqual([{ billId: 'due', amount: '200.00' }]);
  });

  it('a refused settlement rejects, and a retry sends the same request again', async () => {
    // Nothing was applied client-side, so there is nothing to have "half
    // happened": the retry asks for exactly what the first attempt did.
    settle.mockRejectedValueOnce(new Error('The accounting period is closed'));
    settle.mockResolvedValueOnce({ data: { payment: { id: 'bp-3' }, credits: [] } });
    const store = await books();
    store.dispatch(toggleBillCheck('late'));

    const first = await save(store);
    expect(first.meta.requestStatus).toBe('rejected');
    expect(store.getState().payBills.isSaving).toBe(false);

    await save(store);
    expect(settle).toHaveBeenCalledTimes(2);
    expect(settle.mock.calls[1]).toEqual(settle.mock.calls[0]);
  });
});
