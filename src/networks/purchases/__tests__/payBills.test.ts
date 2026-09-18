// POST /bills/pay. The application key is `amount` — the server RETURNS
// `amountApplied`, and sending that name back is stripped by its whitelist,
// which failed every bill payment on the web client. And a retry of the same
// payment must carry the same Idempotency-Key, so the server replays the first
// outcome instead of paying the vendor twice.
jest.mock('expo-file-system/legacy', () => ({}));
jest.mock('../../network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  appendImageToForm: jest.fn(),
  extractErrorMessage: jest.fn(() => 'Request failed'),
  postMultipart: jest.fn(),
  API_BASE_URL: 'http://test.local/api/v1',
  getAccessToken: jest.fn().mockResolvedValue(null),
  getStoredCompanyId: jest.fn().mockResolvedValue(null),
}));

import { api } from '../../network/apiHelpers';
import { payBillsAPI, type PayBillsPayload } from '../billNetwork';

const post = api.post as jest.Mock;

const payload: PayBillsPayload = {
  vendorId: 'v1',
  paymentDate: '2026-09-18',
  paymentMethod: 'bank_transfer',
  bankAccountId: 'acct-cash',
  proofId: 'proof-1',
  applications: [
    { billId: 'b1', amount: '2437.44' },
    { billId: 'b2', amount: '500.00' },
  ],
};

describe('payBillsAPI', () => {
  beforeEach(() => post.mockReset().mockResolvedValue({ data: { data: { id: 'pay-1' } } }));

  it('posts each application as { billId, amount } — never amountApplied', async () => {
    await payBillsAPI(payload);
    const [path, body] = post.mock.calls[0];
    expect(path).toBe('/bills/pay');
    expect(body.applications).toEqual([
      { billId: 'b1', amount: '2437.44' },
      { billId: 'b2', amount: '500.00' },
    ]);
    for (const app of body.applications) expect(app).not.toHaveProperty('amountApplied');
  });

  it('sends the Idempotency-Key it is given', async () => {
    await payBillsAPI(payload, 'key-123');
    expect(post.mock.calls[0][2]).toEqual({ headers: { 'Idempotency-Key': 'key-123' } });
  });

  it('reuses the caller\'s key on a retry rather than minting a new one', async () => {
    // The key's lifetime belongs to the screen: one per payment attempt, held
    // across retries of it. A key minted per call would let a retry whose first
    // response was lost post the payment a second time.
    await payBillsAPI(payload, 'key-123');
    await payBillsAPI(payload, 'key-123');
    expect(post.mock.calls[0][2].headers['Idempotency-Key']).toBe('key-123');
    expect(post.mock.calls[1][2].headers['Idempotency-Key']).toBe('key-123');
  });

  it('sends no Idempotency-Key header when none is given', async () => {
    await payBillsAPI(payload);
    expect(post.mock.calls[0][2]).toEqual({ headers: undefined });
  });

  it('surfaces the server message on failure', async () => {
    post.mockReset().mockRejectedValue(new Error('400'));
    await expect(payBillsAPI(payload, 'key-123')).rejects.toThrow('Request failed');
  });
});
