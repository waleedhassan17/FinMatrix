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

// The customer summary's serializer reaches the report helpers, and the real
// network module pulls in Expo's environment, which Jest cannot load.
jest.mock('../../../../networks/network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  API_BASE_URL: 'http://test.local/api/v1',
  extractErrorMessage: jest.fn(),
  unwrapEnvelope: (r: unknown) => r,
}));

jest.mock('../../../../networks/sales/paymentNetwork', () => ({
  createPaymentAPI: jest.fn(),
  settleInvoicesAPI: jest.fn(),
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
jest.mock('../../../../networks/reports/arAgingNetwork', () => ({
  getARPartySummaryAPI: jest.fn(),
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

describe('the account the money went into', () => {
  it('sends the bank chosen in Deposit to', async () => {
    createPayment.mockResolvedValue({ data: { id: 'pay-1' } });
    const store = makeStore();
    seed(store);
    store.dispatch(setPaymentField({ key: 'bankAccountId', value: 'acct-meezan' }));

    await saved(store);

    expect(createPayment.mock.calls[0][0].bankAccountId).toBe('acct-meezan');
  });

  it('leaves it to the server on Automatic', async () => {
    createPayment.mockResolvedValue({ data: { id: 'pay-1' } });
    const store = makeStore();
    seed(store);

    await saved(store);

    expect(createPayment.mock.calls[0][0]).not.toHaveProperty('bankAccountId');
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

// ═══════════════════════════════════════════════════════
// Loading a staff request back in, for review
// ═══════════════════════════════════════════════════════
// The owner opened a payment request and saw an EMPTY form: no customer,
// Amount 0, no allocations. The screen fetched the request for its banner and
// never put the payload anywhere. These pin the reconstruction.
//
// It is two-phase on purpose. The rows arrive by their own request and
// fetchOutstandingForPayment BUILDS them (allocated: 0, checked: false) when it
// lands — so allocations applied before that arrives are silently wiped.

import {
  loadFromRequestPayload,
  applyRequestAllocations,
  fetchOutstandingForPayment,
  outstandingRowsOf,
} from '../receivePaymentSlice';

const payload = {
  customerId: 'cust-1',
  paymentDate: '2026-09-07',
  paymentMethod: 'bank_transfer',
  amount: '60000.00',
  reference: 'PAY-000123',
  memo: 'Cleared by cheque deposit',
  applications: [{ invoiceId: 'inv-1', amount: '60000.00' }],
};

/** An open invoice as GET /payments/customer/:id/outstanding returns it. */
const invoiceRow = (id: string, total: number, amountPaid = 0) => ({
  id,
  invoiceNumber: `INV-${id}`,
  customerId: 'cust-1',
  status: 'sent',
  dueDate: '2026-10-07',
  total: String(total),
  amountPaid: String(amountPaid),
  lines: [] as unknown[],
});

const withInvoices = (store: ReturnType<typeof makeStore>, rows: object[], customerId = 'cust-1') =>
  store.dispatch(
    fetchOutstandingForPayment.fulfilled(
      outstandingRowsOf({ success: true, data: rows }),
      'req-rows',
      customerId,
    ),
  );

describe('loadFromRequestPayload — phase one', () => {
  const load = (p: object, customerName = 'Acme Ltd') => {
    const store = makeStore();
    store.dispatch(loadFromRequestPayload({ payload: p as never, customerName }));
    return store.getState().receivePayment;
  };

  it('reconstructs every scalar the staff member entered', () => {
    const form = load(payload);

    expect(form.customerId).toBe('cust-1');
    expect(form.customerName).toBe('Acme Ltd');
    expect(form.paymentDate).toBe('2026-09-07');
    expect(form.amount).toBe('60000.00');
    // The payload's `memo` is the form's `notes` — a rename easy to miss.
    expect(form.notes).toBe('Cleared by cheque deposit');
  });

  // The mount effect stamps a fresh PAY-xxxxxx; a review must show the number
  // the staff member actually used, not a new one.
  it('overwrites the auto-generated reference', () => {
    expect(load(payload).reference).toBe('PAY-000123');
  });

  it('maps the API method vocabulary back to the one the form uses', () => {
    expect(load({ ...payload, paymentMethod: 'check' }).method).toBe('cheque');
    expect(load({ ...payload, paymentMethod: 'bank_transfer' }).method).toBe('bank_transfer');
    expect(load({ ...payload, paymentMethod: 'cash' }).method).toBe('cash');
    // Unmapped must land on something the dropdown can show, never blank.
    expect(load({ ...payload, paymentMethod: 'crypto' }).method).toBe('online');
    expect(load({ ...payload, paymentMethod: undefined }).method).toBe('online');
  });

  it('survives a payload with every optional key omitted', () => {
    const form = load({ customerId: 'cust-1', paymentDate: '2026-09-07', amount: '10.00' });

    expect(form.reference).toBe('');
    expect(form.notes).toBe('');
    expect(form.amount).toBe('10.00');
  });
});

describe('applyRequestAllocations — phase two', () => {
  const loaded = (p: object = payload, rows = [invoiceRow('inv-1', 60000)]) => {
    const store = makeStore();
    // The review loads the request first; that names the customer whose
    // invoices are then fetched.
    store.dispatch(loadFromRequestPayload({ payload: p as never, customerName: 'Acme Ltd' }));
    withInvoices(store, rows);
    return store;
  };

  it('puts the allocation on the matching row', () => {
    const store = loaded();
    store.dispatch(applyRequestAllocations(payload.applications));

    const row = store.getState().receivePayment.outstandingRows.find(r => r.invoiceId === 'inv-1');
    expect(row?.allocated).toBe(60000);
    expect(row?.checked).toBe(true);
  });

  it('splits across several invoices exactly as submitted', () => {
    const store = loaded(payload, [invoiceRow('inv-1', 60000), invoiceRow('inv-2', 40000)]);
    store.dispatch(
      applyRequestAllocations([
        { invoiceId: 'inv-1', amount: '25000.00' },
        { invoiceId: 'inv-2', amount: '15000.00' },
      ]),
    );

    const rows = store.getState().receivePayment.outstandingRows;
    // Not redistributed oldest-first: this is a replay of a split someone chose.
    expect(rows.find(r => r.invoiceId === 'inv-1')?.allocated).toBe(25000);
    expect(rows.find(r => r.invoiceId === 'inv-2')?.allocated).toBe(15000);
  });

  // The invoice may have been paid another way since, or fall outside the page
  // this screen fetches. The amount still tells the owner what they approve.
  it('ignores an allocation whose row is gone, without throwing', () => {
    const store = loaded();
    expect(() =>
      store.dispatch(applyRequestAllocations([{ invoiceId: 'vanished', amount: '5.00' }])),
    ).not.toThrow();
    expect(store.getState().receivePayment.outstandingRows[0].allocated).toBe(0);
  });

  it('never allocates more than the invoice still owes', () => {
    const store = loaded(payload, [invoiceRow('inv-1', 100, 0)]);
    store.dispatch(applyRequestAllocations([{ invoiceId: 'inv-1', amount: '999.00' }]));

    expect(store.getState().receivePayment.outstandingRows[0].allocated).toBe(100);
  });

  it('survives malformed applications', () => {
    const store = loaded();
    expect(() =>
      store.dispatch(
        applyRequestAllocations([
          { amount: '5.00' },
          { invoiceId: 'inv-1' },
          null as never,
        ]),
      ),
    ).not.toThrow();
  });
});

describe('money not applied to an invoice is held as a customer advance', () => {
  // With no applications the server AUTO-APPLIES oldest-first. Omitting them
  // was how "Save as customer credit" ended up doing the opposite.
  it('asks the server to hold the whole receipt when nothing is allocated', async () => {
    createPayment.mockResolvedValue({ data: { id: 'pay-1' } });
    const store = makeStore();
    seed(store);
    await store.dispatch(savePayment());
    const body = createPayment.mock.calls[0][0];
    expect(body.holdAsAdvance).toBe(true);
    expect(body.applications).toBeUndefined();
  });

  it('invents no PAY- reference', async () => {
    createPayment.mockResolvedValue({ data: { id: 'pay-1' } });
    const store = makeStore();
    seed(store);
    await store.dispatch(savePayment());
    expect(createPayment.mock.calls[0][0].reference).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════
// Credit on account — the same settlement the web records
// ═══════════════════════════════════════════════════════
// An overdue invoice paid from an advance, a credit memo and new money used to
// take the "Apply advance" dialog (advances only, one receipt at a time) and
// then a separate receipt. It is now one settlement, spread the way the web
// spreads it: credit first, oldest due first, then the cash over what is left.

import { getARPartySummaryAPI } from '../../../../networks/reports/arAgingNetwork';
import { settleInvoicesAPI } from '../../../../networks/sales/paymentNetwork';
import {
  fetchCreditsForPayment,
  openForCredit,
  payInFull,
  preselectInvoice,
  requestCashApplicationsOf,
  setCreditUse,
  setUseCredits,
  toggleInvoiceCheck,
} from '../receivePaymentSlice';

const settle = settleInvoicesAPI as jest.Mock;
const summaryApi = getARPartySummaryAPI as jest.Mock;

const openInvoice = (id: string, dueDate: string, balance: number) => ({
  id,
  invoiceNumber: `INV-${id}`,
  dueDate,
  total: String(balance),
  amountPaid: '0',
  balance: String(balance),
});

const creditsOf = (items: object[]) => ({
  success: true,
  data: { partyType: 'customer', credits: { total: 0, items } },
});

/** Overdue 1000 and current 500; an advance of 300 and a credit memo of 200. */
const books = async () => {
  const store = makeStore();
  store.dispatch(setPaymentCustomer({ id: 'cust-1', name: 'Acme Ltd' }));
  withInvoices(store, [openInvoice('overdue', '2026-08-01', 1000), openInvoice('current', '2026-10-20', 500)]);
  summaryApi.mockResolvedValue(
    creditsOf([
      { kind: 'payment', id: 'rct-1', reference: 'RCT-1', date: '2026-07-01', amount: 300, available: 300 },
      { kind: 'credit_memo', id: 'cm-1', reference: 'CM-1', date: '2026-09-01', amount: 200, available: 200 },
      { kind: 'payment', id: 'rct-spent', reference: 'RCT-0', date: '2026-06-01', amount: 90, available: 0 },
    ]),
  );
  await store.dispatch(fetchCreditsForPayment('cust-1'));
  return store;
};
const rowsOf = (store: ReturnType<typeof makeStore>) =>
  Object.fromEntries(store.getState().receivePayment.outstandingRows.map(r => [r.invoiceId, r]));

describe('credit on account', () => {
  it('offers advances and credit memos with something left, each set to use all it holds', async () => {
    const store = await books();
    const credits = store.getState().receivePayment.credits;
    expect(credits.map(c => [c.id, c.kind, c.use])).toEqual([
      ['rct-1', 'advance', '300'],
      ['cm-1', 'credit_memo', '200'],
    ]);
  });

  it('is off until asked for: a plain receipt never quietly spends an advance', async () => {
    createPayment.mockResolvedValue({ data: { id: 'pay-1' } });
    const store = await books();
    store.dispatch(setPaymentField({ key: 'amount', value: '100' }));
    await store.dispatch(savePayment({ idempotencyKey: 'k-plain' }));

    expect(settle).not.toHaveBeenCalled();
    expect(createPayment).toHaveBeenCalledWith(expect.objectContaining({ amount: '100.00' }), 'k-plain');
  });

  it('switched on, credit lands on the oldest invoice first and cash cannot overlap it', async () => {
    const store = await books();
    store.dispatch(setUseCredits(true));
    expect(rowsOf(store).overdue.credit).toBe(500);
    expect(rowsOf(store).current.credit).toBe(0);

    store.dispatch(setPaymentField({ key: 'amount', value: '500' }));
    store.dispatch(toggleInvoiceCheck('overdue'));
    // Only 500 is left on the overdue invoice once credit has taken 500.
    expect(rowsOf(store).overdue.allocated).toBe(500);
  });

  it('settles credit and cash in ONE request, under the attempt\'s idempotency key', async () => {
    settle.mockResolvedValue({ success: true, data: { payment: { id: 'rct-new' }, credits: [] } });
    const store = await books();
    store.dispatch(setUseCredits(true));
    store.dispatch(setPaymentField({ key: 'amount', value: '500' }));
    store.dispatch(toggleInvoiceCheck('overdue'));

    const result = await store.dispatch(savePayment({ idempotencyKey: 'k-1' }));

    expect(createPayment).not.toHaveBeenCalled();
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith(
      {
        customerId: 'cust-1',
        paymentDate: expect.any(String),
        credits: [
          { kind: 'advance', id: 'rct-1', invoiceId: 'overdue', amount: '300.00' },
          { kind: 'credit_memo', id: 'cm-1', invoiceId: 'overdue', amount: '200.00' },
        ],
        cash: expect.objectContaining({
          amount: '500.00',
          applications: [{ invoiceId: 'overdue', amount: '500.00' }],
        }),
      },
      'k-1',
    );
    expect(result.payload).toEqual({ payment: { id: 'rct-new' }, pending: false });
  });

  it('credit alone sends no cash leg — no receipt is made', async () => {
    settle.mockResolvedValue({ data: { payment: null, credits: [] } });
    const store = await books();
    store.dispatch(setUseCredits(true));
    await store.dispatch(savePayment({ idempotencyKey: 'k-2' }));

    const body = settle.mock.calls[0][0];
    expect(body).not.toHaveProperty('cash');
    expect(body.credits).toHaveLength(2);
  });

  it('a staff settlement comes back pending, like a receipt', async () => {
    settle.mockResolvedValue({ success: true, pending: true, data: { requestId: 'req-9' } });
    const store = await books();
    store.dispatch(setUseCredits(true));
    const result = await store.dispatch(savePayment());
    expect(result.payload).toEqual({ payment: null, pending: true });
  });

  it('spends only the part of a credit the user chose', async () => {
    const store = await books();
    store.dispatch(setUseCredits(true));
    store.dispatch(setCreditUse({ id: 'rct-1', value: '120' }));
    expect(rowsOf(store).overdue.credit).toBe(320);
  });

  it('"Use credit" on an invoice puts that invoice first in line', async () => {
    const store = makeStore();
    store.dispatch(openForCredit({ invoiceId: 'current' }));
    store.dispatch(setPaymentCustomer({ id: 'cust-1', name: 'Acme Ltd' }));
    withInvoices(store, [openInvoice('overdue', '2026-08-01', 1000), openInvoice('current', '2026-10-20', 500)]);
    summaryApi.mockResolvedValue(
      creditsOf([{ kind: 'payment', id: 'rct-1', reference: 'RCT-1', date: '2026-07-01', amount: 600, available: 600 }]),
    );
    await store.dispatch(fetchCreditsForPayment('cust-1'));

    expect(rowsOf(store).current.credit).toBe(500);
    expect(rowsOf(store).overdue.credit).toBe(100);
    // Opened for credit, the invoice is ticked but no money is assumed.
    store.dispatch(preselectInvoice('current'));
    expect(store.getState().receivePayment.amount).toBe('');
  });

  it('an invoice credit settles in full cannot be ticked for cash, and "pay in full" receives only the rest', async () => {
    const store = makeStore();
    store.dispatch(setPaymentCustomer({ id: 'cust-1', name: 'Acme Ltd' }));
    withInvoices(store, [openInvoice('small', '2026-08-01', 100), openInvoice('big', '2026-09-01', 400)]);
    summaryApi.mockResolvedValue(
      creditsOf([{ kind: 'credit_memo', id: 'cm-1', reference: 'CM-1', date: '2026-07-01', amount: 150, available: 150 }]),
    );
    await store.dispatch(fetchCreditsForPayment('cust-1'));
    store.dispatch(setUseCredits(true));

    store.dispatch(toggleInvoiceCheck('small'));
    expect(rowsOf(store).small.checked).toBe(false);

    store.dispatch(payInFull());
    expect(store.getState().receivePayment.amount).toBe('350');
    expect(rowsOf(store).big.allocated).toBe(350);
  });

  it("drops a late answer for a customer who is no longer selected", async () => {
    const store = makeStore();
    store.dispatch(setPaymentCustomer({ id: 'cust-2', name: 'Other' }));
    withInvoices(store, [openInvoice('stale', '2026-08-01', 100)], 'cust-1');
    expect(store.getState().receivePayment.outstandingRows).toEqual([]);
  });
});

describe('reviewing a staff settlement', () => {
  const settlement = {
    action: 'settle',
    customerId: 'cust-1',
    paymentDate: '2026-09-28',
    credits: [{ kind: 'credit_memo', id: 'cm-1', invoiceId: 'inv-1', amount: '100' }],
    cash: {
      amount: '50',
      paymentMethod: 'cash',
      reference: 'CHQ-7',
      applications: [{ invoiceId: 'inv-1', amount: '50' }],
    },
  };

  it('reads the new money from `cash` and the credit from `credits`', () => {
    const store = makeStore();
    store.dispatch(loadFromRequestPayload({ payload: settlement as never, customerName: 'Acme Ltd' }));
    const form = store.getState().receivePayment;

    expect(form.amount).toBe('50');
    expect(form.method).toBe('cash');
    expect(form.reference).toBe('CHQ-7');
    expect(form.requestCredits).toEqual([
      { kind: 'credit_memo', id: 'cm-1', invoiceId: 'inv-1', amount: '100' },
    ]);
    expect(requestCashApplicationsOf(settlement)).toEqual([{ invoiceId: 'inv-1', amount: '50' }]);
  });

  it('an advance applied from a receipt is all credit and no new money', () => {
    const apply = {
      action: 'apply',
      paymentId: 'rct-3',
      customerId: 'cust-1',
      date: '2026-09-28',
      applications: [{ invoiceId: 'inv-1', amount: '75' }],
    };
    const store = makeStore();
    store.dispatch(loadFromRequestPayload({ payload: apply as never, customerName: 'Acme Ltd' }));
    const form = store.getState().receivePayment;

    expect(form.amount).toBe('');
    expect(form.paymentDate).toBe('2026-09-28');
    expect(form.requestCredits).toEqual([{ kind: 'advance', id: 'rct-3', invoiceId: 'inv-1', amount: '75' }]);
    expect(requestCashApplicationsOf(apply)).toBeNull();
  });
});
