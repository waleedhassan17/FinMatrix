// "Post & send on WhatsApp" and "Post only" are the same posting with a
// different `deliver`: the first sends now, the second sends nothing, and the
// plain Post (Connect off) sends no `deliver` at all, as it always has.
import { configureStore } from '@reduxjs/toolkit';

jest.mock('../../../../networks/sales/invoiceNetwork', () => ({
  getInvoiceByIdAPI: jest.fn(),
  sendInvoiceAPI: jest.fn(),
}));
jest.mock('../../../../networks/sales/paymentNetwork', () => ({ getPaymentsAPI: jest.fn() }));

import { sendInvoiceAPI } from '../../../../networks/sales/invoiceNetwork';
import { invoiceDetailSlice, sendInvoice } from '../invoiceDetailSlice';

const send = sendInvoiceAPI as jest.Mock;
const makeStore = () => configureStore({ reducer: { invoiceDetail: invoiceDetailSlice.reducer } });

beforeEach(() => {
  jest.clearAllMocks();
  send.mockResolvedValue({ success: true, data: { id: 'i1', status: 'sent' } });
});

it('"Post & send" asks the server to send now', async () => {
  await makeStore().dispatch(sendInvoice({ id: 'i1', channel: 'share', deliverWhatsapp: true }));
  expect(send).toHaveBeenCalledWith('i1', { channel: 'share', toPhone: undefined, deliver: { whatsapp: true } }, undefined);
});

it('"Post only" posts and sends nothing', async () => {
  await makeStore().dispatch(sendInvoice({ id: 'i1', channel: 'share', deliverWhatsapp: false }));
  expect(send).toHaveBeenCalledWith('i1', { channel: 'share', toPhone: undefined, deliver: { whatsapp: false } }, undefined);
});

it('plain Post (Connect off) carries no deliver at all', async () => {
  await makeStore().dispatch(sendInvoice({ id: 'i1', channel: 'share' }));
  const [, meta] = send.mock.calls[0];
  expect(meta).not.toHaveProperty('deliver');
});
