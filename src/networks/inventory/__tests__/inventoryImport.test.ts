// Photo upload and the Excel import ride on postMultipart with exact field
// names — `image` and `file` — because multer answers anything else with
// "file is required". A commit carries its Idempotency-Key so a retried
// request replays instead of importing twice, and the batch photo lookup
// stays inside the server's 200-id limit.
jest.mock('expo-file-system/legacy', () => ({}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('../../network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  appendImageToForm: jest.fn(),
  appendFileToForm: jest.fn(),
  extractErrorMessage: jest.fn(() => 'Request failed'),
  toApiError: jest.fn((e: any) => e),
  postMultipart: jest.fn(),
  refreshSessionTokens: jest.fn(),
  API_BASE_URL: 'http://test.local/api/v1',
  getAccessToken: jest.fn().mockResolvedValue(null),
  getStoredCompanyId: jest.fn().mockResolvedValue(null),
}));

import { api, appendFileToForm, appendImageToForm, postMultipart } from '../../network/apiHelpers';
import {
  commitInventoryImportAPI,
  getItemImageUrlsAPI,
  previewInventoryImportAPI,
  uploadInventoryItemImageAPI,
} from '../inventoryNetwork';

const post = postMultipart as jest.Mock;
const get = api.get as jest.Mock;
const file = { uri: 'file:///cache/items.xlsx', name: 'items.xlsx', mimeType: '' };

beforeEach(() => jest.clearAllMocks());

describe('inventory photo and import network', () => {
  it('uploads a photo under the field "image"', async () => {
    post.mockResolvedValueOnce({ success: true, data: { id: 'i1' } });
    await uploadInventoryItemImageAPI('i1', { uri: 'file:///p.jpg', name: 'p.jpg', mimeType: 'image/jpeg' });
    expect(appendImageToForm).toHaveBeenCalledWith(expect.anything(), 'image', 'file:///p.jpg', {
      name: 'p.jpg',
      type: 'image/jpeg',
    });
    expect(post).toHaveBeenCalledWith('/inventory/items/i1/image', expect.anything());
  });

  it('previews under the field "file", labelling an unknown type as xlsx', async () => {
    post.mockResolvedValueOnce({ success: true, data: {} });
    await previewInventoryImportAPI(file);
    expect(appendFileToForm).toHaveBeenCalledWith(expect.anything(), 'file', file.uri, {
      name: 'items.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    expect(post).toHaveBeenCalledWith('/inventory/import/preview', expect.anything());
  });

  it('commits with the Idempotency-Key and the confirmed opening stock', async () => {
    post.mockResolvedValueOnce({ success: true, data: {} });
    await commitInventoryImportAPI(
      file,
      { openingStockDate: '2026-10-21', confirmOpeningStockValue: '34000.0000' },
      'key-1',
    );
    const [path, form, opts] = post.mock.calls[0];
    expect(path).toBe('/inventory/import');
    expect(opts).toEqual({ headers: { 'Idempotency-Key': 'key-1' } });
    expect((form as FormData).get('openingStockDate')).toBe('2026-10-21');
    expect((form as FormData).get('confirmOpeningStockValue')).toBe('34000.0000');
  });

  it('leaves out opening-stock fields it was not given', async () => {
    post.mockResolvedValueOnce({ success: true, data: {} });
    await commitInventoryImportAPI(file, {}, 'key-2');
    const form = post.mock.calls[0][1] as FormData;
    expect(form.get('openingStockDate')).toBeNull();
    expect(form.get('confirmOpeningStockValue')).toBeNull();
  });

  it('asks for photo links 200 ids at a time and merges the answers', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `item-${i}`);
    get
      .mockResolvedValueOnce({ data: { success: true, data: { images: { 'item-0': { thumbnailUrl: 't0', imageUrl: 'i0' } } } } })
      .mockResolvedValueOnce({ data: { success: true, data: { images: { 'item-249': { thumbnailUrl: 't249', imageUrl: 'i249' } } } } });
    const out = await getItemImageUrlsAPI([...ids, 'item-0', '']);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[0][1].params.ids.split(',')).toHaveLength(200);
    expect(get.mock.calls[1][1].params.ids.split(',')).toHaveLength(50);
    expect(Object.keys(out)).toEqual(['item-0', 'item-249']);
  });
});
