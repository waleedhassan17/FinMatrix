// postMultipart talks to fetch directly, so it has no axios interceptor: an
// access token that expired while someone sat on an import preview or a photo
// picker used to sign them out on the spot. It now refreshes once and retries
// — and only a refresh that fails ends the session.
// axios ships ESM that this Jest setup does not transform; postMultipart
// only needs axios.post (the token refresh) and a client to construct.
jest.mock('expo/virtual/env', () => ({ env: process.env }));
jest.mock('axios', () => {
  const client = { interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } };
  const axios = { create: jest.fn(() => client), post: jest.fn(), isAxiosError: jest.fn(() => false) };
  return { __esModule: true, default: axios, ...axios };
});
jest.mock('../../../utils/storageUtils', () => ({
  setTokens: jest.fn(),
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  setStoredCompanyId: jest.fn(),
  getStoredCompanyId: jest.fn().mockResolvedValue('co-1'),
  clearTokens: jest.fn(),
}));
jest.mock('../../../utils/authEvents', () => ({
  emitSessionExpired: jest.fn(),
  emitCompanyStatusStale: jest.fn(),
  emitRiderSeatLocked: jest.fn(),
  isIntentionalSignOut: jest.fn(() => false),
}));

import axios from 'axios';
import { postMultipart, ApiError } from '../apiHelpers';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../../../utils/storageUtils';
import { emitSessionExpired } from '../../../utils/authEvents';

const respond = (status: number, body: unknown) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => body }) as unknown as Response;

const fetchMock = jest.fn();
const refresh = axios.post as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).fetch = fetchMock;
  (getAccessToken as jest.Mock).mockResolvedValueOnce('old').mockResolvedValue('new');
  (getRefreshToken as jest.Mock).mockResolvedValue('refresh-1');
});

describe('postMultipart', () => {
  it('refreshes an expired token once and retries with the new one', async () => {
    fetchMock.mockResolvedValueOnce(respond(401, {})).mockResolvedValueOnce(respond(201, { success: true, data: { id: 'x' } }));
    refresh.mockResolvedValueOnce({ data: { data: { accessToken: 'new', refreshToken: 'r2' } } });

    await expect(postMultipart('/inventory/import/preview', new FormData())).resolves.toEqual({
      success: true,
      data: { id: 'x' },
    });
    expect(setTokens).toHaveBeenCalledWith('new', 'r2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer new');
    expect(emitSessionExpired).not.toHaveBeenCalled();
  });

  it('ends the session only when the refresh itself fails', async () => {
    fetchMock.mockResolvedValueOnce(respond(401, { error: { code: 'UNAUTHORIZED', message: 'Expired' } }));
    refresh.mockRejectedValueOnce(new Error('refresh revoked'));

    await expect(postMultipart('/inventory/items/i1/image', new FormData())).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(clearTokens).toHaveBeenCalled();
    expect(emitSessionExpired).toHaveBeenCalled();
  });

  it('sends extra headers and keeps the server code on a refusal', async () => {
    fetchMock.mockResolvedValueOnce(
      respond(409, { success: false, error: { code: 'IMPORT_PREVIEW_STALE', message: 'Review the preview again' } }),
    );
    const err = await postMultipart('/inventory/import', new FormData(), {
      headers: { 'Idempotency-Key': 'k1' },
    }).catch(e => e);
    expect(fetchMock.mock.calls[0][1].headers['Idempotency-Key']).toBe('k1');
    expect(fetchMock.mock.calls[0][1].headers['x-company-id']).toBe('co-1');
    expect(err).toMatchObject({ code: 'IMPORT_PREVIEW_STALE', status: 409, message: 'Review the preview again' });
    expect(err.response.status).toBe(409);
  });
});
