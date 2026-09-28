// ═══════════════════════════════════════════════════════
// FinMatrix — savePayment: vendor credit and cash, all or nothing
// ═══════════════════════════════════════════════════════
// Credits used to be applied one request at a time before the cash was
// posted, so a refused payment left them spent and a retry spent them again.
// Credit now goes with the cash as ONE /bills/settle request; a payment with no
// credit in play stays the plain /bills/pay it always was.

import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../../../networks/purchases/billNetwork', () => ({
  getBillsAPI: jest.fn(),
  payBillsAPI: jest.fn(),
  settleBillsAPI: jest.fn(),
  uploadBillPaymentProofAPI: jest.fn(),
}));
jest.mock('../../../../networks/purchases/vendorCreditNetwork', () => ({
  getVendorCreditsAPI: jest.fn(),
  applyVendorCreditAPI: jest.fn(),
}));

import { payBillsAPI, settleBillsAPI } from '../../../../networks/purchases/billNetwork';
import { getVendorCreditsAPI } from '../../../../networks/purchases/vendorCreditNetwork';
import {
  fetchVendorCreditsForPayment,
  pairCreditsWithBills,
  payBillsSlice,
  savePayment,
  type AvailableCredit,
  type OutstandingBillRow,
  type PayBillsSliceState,
} from '../payBillsSlice';

const pay = payBillsAPI as jest.Mock;
const settle = settleBillsAPI as jest.Mock;
const listCredits = getVendorCreditsAPI as jest.Mock;

const row = (billId: string, balance: number, allocated: number, creditApplied: number): OutstandingBillRow =>
  ({
    billId,
    billNumber: `BILL-${billId}`,
    vendorName: 'Acme',
    dueDate: '2026-08-01',
    total: balance,
    amountPaid: 0,
    balance,
    allocated,
    creditApplied,
    checked: allocated > 0 || creditApplied > 0,
  }) as OutstandingBillRow;

const credit = (id: string, balance: number): AvailableCredit => ({ id, number: `VC-${id}`, balance });

const makeStore = (over: Partial<PayBillsSliceState> = {}) =>
  configureStore({
    reducer: { payBills: payBillsSlice.reducer },
    preloadedState: {
      payBills: {
        ...payBillsSlice.getInitialState(),
        vendorId: 'v1',
        vendorName: 'Acme',
        paymentDate: '2026-09-28',
        bankAccountId: 'acct-cash',
        proofId: 'proof-1',
        ...over,
      },
    },
  });

const save = (store: ReturnType<typeof makeStore>, allocations: { billId: string; amount: number }[]) =>
  store.dispatch(
    savePayment({
      paymentNumber: 'PAY-1',
      allocations: allocations.map(a => ({ ...a, billNumber: `BILL-${a.billId}` })),
      idempotencyKey: 'key-1',
    }),
  );

beforeEach(() => jest.clearAllMocks());

describe('pairCreditsWithBills', () => {
  it('spends credits oldest first, spilling onto the next credit when one runs out', () => {
    expect(
      pairCreditsWithBills([credit('a', 100), credit('b', 300)], [{ billId: 'b1', creditApplied: 250 }]),
    ).toEqual([
      { vendorCreditId: 'a', billId: 'b1', amount: '100.00' },
      { vendorCreditId: 'b', billId: 'b1', amount: '150.00' },
    ]);
  });

  it('carries what is left of a credit on to the next bill', () => {
    expect(
      pairCreditsWithBills(
        [credit('a', 200)],
        [
          { billId: 'b1', creditApplied: 120 },
          { billId: 'b2', creditApplied: 80 },
        ],
      ),
    ).toEqual([
      { vendorCreditId: 'a', billId: 'b1', amount: '120.00' },
      { vendorCreditId: 'a', billId: 'b2', amount: '80.00' },
    ]);
  });

  it('never spends more than the credits hold', () => {
    const pieces = pairCreditsWithBills([credit('a', 50)], [{ billId: 'b1', creditApplied: 90 }]);
    expect(pieces).toEqual([{ vendorCreditId: 'a', billId: 'b1', amount: '50.00' }]);
  });

  it('sends nothing for rows taking no credit', () => {
    expect(pairCreditsWithBills([credit('a', 50)], [{ billId: 'b1', creditApplied: 0 }])).toEqual([]);
  });

  it('keeps paisa exact', () => {
    const pieces = pairCreditsWithBills(
      [credit('a', 0.1), credit('b', 0.2)],
      [{ billId: 'b1', creditApplied: 0.3 }],
    );
    expect(pieces.map(p => p.amount)).toEqual(['0.10', '0.20']);
  });
});

describe('savePayment', () => {
  it('with no credit in play, posts the plain payment it always did', async () => {
    pay.mockResolvedValue({ data: { id: 'bp-1' } });
    const store = makeStore({ outstandingRows: [row('b1', 700, 700, 0)] });
    await save(store, [{ billId: 'b1', amount: 700 }]);

    expect(settle).not.toHaveBeenCalled();
    expect(pay).toHaveBeenCalledWith(
      expect.objectContaining({
        vendorId: 'v1',
        proofId: 'proof-1',
        applications: [{ billId: 'b1', amount: '700.00' }],
      }),
      'key-1',
    );
  });

  it('credit plus cash go as ONE settlement, under the same idempotency key', async () => {
    settle.mockResolvedValue({ data: { payment: { id: 'bp-2' }, credits: [] } });
    const store = makeStore({
      availableCredits: [credit('vc-1', 150)],
      outstandingRows: [row('b1', 700, 550, 150)],
    });
    await save(store, [{ billId: 'b1', amount: 550 }]);

    expect(pay).not.toHaveBeenCalled();
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith(
      {
        vendorId: 'v1',
        paymentDate: '2026-09-28',
        credits: [{ vendorCreditId: 'vc-1', billId: 'b1', amount: '150.00' }],
        cash: expect.objectContaining({
          bankAccountId: 'acct-cash',
          proofId: 'proof-1',
          applications: [{ billId: 'b1', amount: '550.00' }],
        }),
      },
      'key-1',
    );
  });

  it('credit alone sends no cash leg — so no proof or account is needed', async () => {
    settle.mockResolvedValue({ data: { payment: null, credits: [] } });
    const store = makeStore({
      proofId: '',
      bankAccountId: '',
      availableCredits: [credit('vc-1', 200)],
      outstandingRows: [row('b1', 120, 0, 120)],
    });
    await save(store, [{ billId: 'b1', amount: 0 }]);

    const body = settle.mock.calls[0][0];
    expect(body).not.toHaveProperty('cash');
    expect(body.credits).toEqual([{ vendorCreditId: 'vc-1', billId: 'b1', amount: '120.00' }]);
  });

  it('a refused settlement rejects, and a retry sends the same request again', async () => {
    // Nothing was applied client-side, so there is nothing to have "half
    // happened": the retry asks for exactly what the first attempt did.
    settle.mockRejectedValueOnce(new Error('The accounting period is closed'));
    settle.mockResolvedValueOnce({ data: { payment: { id: 'bp-3' }, credits: [] } });
    const store = makeStore({
      availableCredits: [credit('vc-1', 150)],
      outstandingRows: [row('b1', 700, 550, 150)],
    });

    const first = await save(store, [{ billId: 'b1', amount: 550 }]);
    expect(first.meta.requestStatus).toBe('rejected');
    expect(store.getState().payBills.isSaving).toBe(false);

    await save(store, [{ billId: 'b1', amount: 550 }]);
    expect(settle).toHaveBeenCalledTimes(2);
    expect(settle.mock.calls[1]).toEqual(settle.mock.calls[0]);
  });
});

describe('fetchVendorCreditsForPayment', () => {
  it('offers a partly used credit, and never a void or closed one', async () => {
    listCredits.mockResolvedValue({
      data: [
        { id: 'open', vendorCreditNumber: 'VC-1', status: 'open', balance: '100', total: '100' },
        { id: 'part', vendorCreditNumber: 'VC-2', status: 'applied', balance: '150', total: '200' },
        { id: 'void', vendorCreditNumber: 'VC-3', status: 'void', balance: '80', total: '80' },
        { id: 'done', vendorCreditNumber: 'VC-4', status: 'closed', balance: '0', total: '60' },
      ],
    });
    const store = makeStore();
    await store.dispatch(fetchVendorCreditsForPayment('v1'));

    expect(listCredits).toHaveBeenCalledWith({ vendorId: 'v1' });
    expect(store.getState().payBills.availableCredits.map(c => c.id)).toEqual(['open', 'part']);
  });
});
