// ═══════════════════════════════════════════════════════
// FinMatrix — savePayment: the staff approval path
// ═══════════════════════════════════════════════════════
// Banking a customer receipt used to be direct for staff. The screen dispatched
// without .unwrap(), ignored the payload entirely, and then showed a full-screen
// "Payment Recorded!" — which for a pending request would not merely be wrong,
// it reads as a receipt: proof to a customer that they have paid.
//
// The thunk now reports `pending` so the screen can return before that modal.

import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../../../networks/sales/paymentNetwork', () => ({
  createPaymentAPI: jest.fn(),
  receivePaymentAPI: jest.fn(),
  getOutstandingInvoicesAPI: jest.fn(),
  getPaymentHistoryAPI: jest.fn(),
  getPaymentByIdAPI: jest.fn(),
  getPaymentsAPI: jest.fn(),
  getPaymentsByInvoiceAPI: jest.fn(),
}));
jest.mock('../../../../networks/sales/invoiceNetwork', () => ({
  getInvoicesAPI: jest.fn(),
  getInvoiceByIdAPI: jest.fn(),
}));

import { createPaymentAPI } from '../../../../networks/sales/paymentNetwork';
import {
  receivePaymentSlice,
  savePayment,
  setPaymentCustomer,
  setPaymentField,
} from '../receivePaymentSlice';

const createPayment = createPaymentAPI as jest.Mock;

const makeStore = () =>
  configureStore({ reducer: { receivePayment: receivePaymentSlice.reducer } });

/** Enough for buildSavePayload: a customer and an amount. With no invoice rows
 *  loaded the whole amount is a prepayment, which the thunk handles by omitting
 *  `applications` — a valid body, and the simplest one to seed. */
const seed = (store: ReturnType<typeof makeStore>) => {
  store.dispatch(setPaymentCustomer({ id: 'cust-1', name: 'Acme Ltd' }));
  store.dispatch(setPaymentField({ key: 'amount', value: '500' }));
};

type SaveResult = { payment: unknown; pending: boolean };

const saved = async (store: ReturnType<typeof makeStore>) => {
  const result = await store.dispatch(savePayment());
  return result.payload as SaveResult;
};

beforeEach(() => jest.clearAllMocks());

describe('staff — the response is an approval request, not a payment', () => {
  it('reports pending and returns no payment', async () => {
    createPayment.mockResolvedValue({ data: { pending: true } });
    const store = makeStore();
    seed(store);

    expect(await saved(store)).toEqual({ payment: null, pending: true });
  });

  // The network layer returns response.data un-unwrapped, so the flag may sit
  // at either depth. `(created?.data ?? created)?.pending` is NOT the same
  // test: ?? picks whichever operand is merely present, so a truthy `data`
  // wins and its missing `.pending` reads undefined.
  it('reads pending at the top level even when a data object is also present', async () => {
    createPayment.mockResolvedValue({
      success: true,
      pending: true,
      data: { requestId: 'req-4', type: 'invoice_payment' },
    });
    const store = makeStore();
    seed(store);

    expect(await saved(store)).toEqual({ payment: null, pending: true });
  });
});

describe('owner — the payment posts', () => {
  it('returns the created payment', async () => {
    createPayment.mockResolvedValue({ data: { id: 'pay-1' } });
    const store = makeStore();
    seed(store);

    const result = await saved(store);

    expect(result.pending).toBe(false);
    expect(result.payment).toBeTruthy();
  });

  it('sends the amount and method the server expects', async () => {
    createPayment.mockResolvedValue({ data: { id: 'pay-1' } });
    const store = makeStore();
    seed(store);
    store.dispatch(setPaymentField({ key: 'method', value: 'cheque' }));

    await saved(store);

    const body = createPayment.mock.calls[0][0];
    expect(body.customerId).toBe('cust-1');
    expect(body.amount).toBe('500.00');
    // 'cheque' is the form's word; the API's is 'check'.
    expect(body.paymentMethod).toBe('check');
  });
});
