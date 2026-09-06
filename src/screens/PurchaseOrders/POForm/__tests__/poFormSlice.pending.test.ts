// ═══════════════════════════════════════════════════════
// FinMatrix — savePurchaseOrder: the staff approval path
// ═══════════════════════════════════════════════════════
// This suite exists because the staff path shipped broken and every static
// check passed on it. POST /purchase-orders answers a staff request with
// { data: { pending: true } } — an approval request, not a purchase order —
// but the thunk ran that envelope through purchaseOrderSingleSerializer first,
// and mapPO() builds a fixed PurchaseOrder shape with no `pending` key. So:
//
//   • the screen's `if (pending)` branch was unreachable, and staff were told
//     "PO Created" for a document that did not exist;
//   • the flattened request became a PO with id '', so "Save & Send" fired
//     PATCH /purchase-orders//status against a blank id.
//
// The network module is mocked with a FACTORY, not automock: automock still
// evaluates the real module, which pulls in apiHelpers → axios, react-native
// Platform and AsyncStorage. With a factory it is never required at all.

import { configureStore } from '@reduxjs/toolkit';
import type { PurchaseOrder } from '../../../../types';

jest.mock('../../../../networks/purchases/purchaseOrderNetwork', () => ({
  createPurchaseOrderAPI: jest.fn(),
  updatePurchaseOrderAPI: jest.fn(),
  updatePOStatusAPI: jest.fn(),
  getPurchaseOrderByIdAPI: jest.fn(),
}));

import {
  createPurchaseOrderAPI,
  updatePOStatusAPI,
} from '../../../../networks/purchases/purchaseOrderNetwork';
import {
  poFormSlice,
  savePurchaseOrder,
  setVendor,
  setLineItem,
  updateLine,
} from '../poFormSlice';

const createPO = createPurchaseOrderAPI as jest.Mock;
const patchStatus = updatePOStatusAPI as jest.Mock;

/** A store holding only this slice — importing the real store.ts would drag in
 *  every screen slice, redux-persist and AsyncStorage with them. */
const makeStore = () =>
  configureStore({ reducer: { poForm: poFormSlice.reducer } });

/** Fill the form enough that buildSavePayload emits one usable line. */
const seedValidForm = (store: ReturnType<typeof makeStore>) => {
  store.dispatch(setVendor({ id: 'vendor-1', name: 'Acme Supplies' }));
  const lineId = store.getState().poForm.lines[0].id;
  store.dispatch(
    setLineItem({
      id: lineId,
      itemId: 'item-A',
      itemName: 'Widget',
      description: 'Widget',
      unitPrice: '10',
    }),
  );
  store.dispatch(updateLine({ id: lineId, field: 'quantity', value: '3' }));
};

/** What the API returns for an owner: the created purchase order. */
const poEnvelope = (id: string, status = 'draft') => ({
  data: {
    purchaseOrder: { id, poNumber: 'PO-1042', status, lines: [] as unknown[] },
  },
});

/** What savePurchaseOrder resolves with. `dispatch` types the payload as
 *  `unknown`, so name the shape once rather than casting at every assertion. */
type SaveResult = { po: PurchaseOrder | null; pending: boolean; sendFailed: boolean };

const saved = async (
  store: ReturnType<typeof makeStore>,
  status: 'draft' | 'sent',
): Promise<SaveResult> => {
  const result = await store.dispatch(savePurchaseOrder(status));
  return result.payload as SaveResult;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('staff — the response is an approval request, not a PO', () => {
  it('reports pending and returns no purchase order', async () => {
    createPO.mockResolvedValue({ data: { pending: true } });
    const store = makeStore();
    seedValidForm(store);

    const payload = await saved(store, 'sent');

    expect(payload).toEqual({ po: null, pending: true, sendFailed: false });
  });

  // The regression that put a PATCH on /purchase-orders//status. Serializing
  // first produced a truthy PO with a blank id, and the send step fired at it.
  it('does NOT attempt the status change — there is no PO to send yet', async () => {
    createPO.mockResolvedValue({ data: { pending: true } });
    const store = makeStore();
    seedValidForm(store);

    await store.dispatch(savePurchaseOrder('sent'));

    expect(patchStatus).not.toHaveBeenCalled();
  });

  it('leaves the form out of edit mode — no id was issued to edit', async () => {
    createPO.mockResolvedValue({ data: { pending: true } });
    const store = makeStore();
    seedValidForm(store);

    await store.dispatch(savePurchaseOrder('sent'));

    expect(store.getState().poForm.isEditMode).toBe(false);
    expect(store.getState().poForm.editingId).toBe('');
    expect(store.getState().poForm.isSaving).toBe(false);
  });

  // The flag rides on the envelope, and different endpoints wrap differently.
  it('reads pending nested under data', async () => {
    createPO.mockResolvedValue({ pending: true });
    const store = makeStore();
    seedValidForm(store);

    const payload = await saved(store, 'draft');

    expect(payload).toMatchObject({ po: null, pending: true });
    expect(patchStatus).not.toHaveBeenCalled();
  });

  // The shape that defeats `(envelope?.data ?? envelope)?.pending`: ?? picks
  // whichever operand is merely PRESENT, so a truthy `data` wins and its
  // missing `.pending` reads undefined. The three sibling approval forms all
  // test both positions; this asserts this one does too.
  it('reads pending at the top level even when a data object is also present', async () => {
    createPO.mockResolvedValue({
      success: true,
      pending: true,
      data: { id: 'req-9', type: 'po', status: 'pending' },
    });
    const store = makeStore();
    seedValidForm(store);

    const result = await store.dispatch(savePurchaseOrder('sent'));

    expect(result.payload).toEqual({ po: null, pending: true, sendFailed: false });
    expect(patchStatus).not.toHaveBeenCalled();
  });
});

describe('owner — a real purchase order comes back', () => {
  it('saves a draft and maps the PO through the serializer', async () => {
    createPO.mockResolvedValue(poEnvelope('po-1'));
    const store = makeStore();
    seedValidForm(store);

    const payload = await saved(store, 'draft');

    expect(payload.pending).toBe(false);
    expect(payload.po?.id).toBe('po-1');
    expect(payload.po?.poNumber).toBe('PO-1042');
    expect(patchStatus).not.toHaveBeenCalled();
    // An owner's save DOES leave the form editable against the new id.
    expect(store.getState().poForm.editingId).toBe('po-1');
    expect(store.getState().poForm.isEditMode).toBe(true);
  });

  it('sends with the real id, never a blank one', async () => {
    createPO.mockResolvedValue(poEnvelope('po-1'));
    patchStatus.mockResolvedValue(poEnvelope('po-1', 'sent'));
    const store = makeStore();
    seedValidForm(store);

    const payload = await saved(store, 'sent');

    expect(patchStatus).toHaveBeenCalledTimes(1);
    expect(patchStatus).toHaveBeenCalledWith('po-1', 'sent');
    expect(payload.sendFailed).toBe(false);
    expect(payload.po?.status).toBe('sent');
  });

  // The PO exists either way; only the status change failed. Reporting an
  // outright failure would send the user off to create a duplicate.
  it('keeps the PO and flags sendFailed when the status change throws', async () => {
    createPO.mockResolvedValue(poEnvelope('po-1'));
    patchStatus.mockRejectedValue(new Error('network'));
    const store = makeStore();
    seedValidForm(store);

    const payload = await saved(store, 'sent');

    expect(payload.sendFailed).toBe(true);
    expect(payload.pending).toBe(false);
    expect(payload.po?.id).toBe('po-1');
  });

  it('surfaces a create failure as a rejected thunk', async () => {
    createPO.mockRejectedValue(new Error('Vendor is required'));
    const store = makeStore();
    seedValidForm(store);

    const result: any = await store.dispatch(savePurchaseOrder('draft'));

    expect(result.error).toBeDefined();
    expect(store.getState().poForm.saveError).toBe('Vendor is required');
    expect(store.getState().poForm.isSaving).toBe(false);
  });
});
