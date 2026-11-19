// Large uploads from the phone: pieces read at their offsets, resumed,
// repeated on failure, stopped on what a repeat cannot fix.
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
const handles: Array<{ offset: number | null; size: number; reads: Array<[number, number]>; closed: boolean }> = [];
const deleted: string[] = [];
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    uri,
    size: 20,
    exists: true,
    delete: () => deleted.push(uri),
    open: () => {
      const h = {
        offset: 0 as number | null,
        size: 20,
        reads: [] as Array<[number, number]>,
        closed: false,
        readBytes(length: number) {
          const start = h.offset ?? 0;
          h.reads.push([start, length]);
          h.offset = start + length;
          return Uint8Array.from({ length }, (_, i) => start + i + 1);
        },
        close() {
          h.closed = true;
        },
      };
      handles.push(h);
      return h;
    },
  })),
}));
jest.mock('../../network/apiHelpers', () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  putBinary: jest.fn(),
  toApiError: jest.fn((e: any) => e),
}));

import { api, putBinary } from '../../network/apiHelpers';
import { deletePickedCopy, openPickedFile, uploadLargeFileAPI, type LargeUpload } from '../migrationLargeUpload';

const post = api.post as jest.Mock;
const get = api.get as jest.Mock;
const put = putBinary as jest.Mock;
const ok = (data: unknown) => ({ data: { success: true, data } });
const fail = (code: string | undefined, status?: number) => Object.assign(new Error(code ?? 'Network error'), { code, status });
const upload = (over: Partial<LargeUpload> = {}): LargeUpload => ({
  id: 'u1', batchId: 'b1', name: 'company.ptb', size: 20, partSize: 8, parts: 3, status: 'receiving', received: [], progress: null, errorCode: null, error: null, fileId: null, ...over,
});
const noWait = { backoffMs: () => 0 };
const sentParts = () => put.mock.calls.map(c => [c[0], Array.from(new Uint8Array(c[1]))]);

describe('openPickedFile', () => {
  beforeEach(() => {
    handles.length = 0;
  });

  it('reads one piece at a time, at its offset, from a FileHandle', async () => {
    const src = openPickedFile({ uri: 'file:///cache/DocumentPicker/company.ptb' });
    expect(src.size).toBe(20);
    expect(Array.from(new Uint8Array(await src.read(16, 4)))).toEqual([17, 18, 19, 20]);
    expect(Array.from(new Uint8Array(await src.read(0, 8)))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(handles[0].reads).toEqual([[16, 4], [0, 8]]);
    src.close();
    expect(handles[0].closed).toBe(true);
  });
});

describe('uploadLargeFileAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    handles.length = 0;
  });
  const source = () => openPickedFile({ uri: 'file:///cache/DocumentPicker/company.ptb' });

  it('sends every piece once, then completes', async () => {
    post.mockResolvedValueOnce(ok(upload())).mockResolvedValueOnce(ok(upload({ status: 'received' })));
    put.mockResolvedValue({ success: true });
    const progress: number[] = [];
    const r = await uploadLargeFileAPI('b1', 'company.ptb', source(), { ...noWait, onProgress: p => progress.push(p.sent) });
    expect(post).toHaveBeenNthCalledWith(1, '/migrations/b1/uploads', { name: 'company.ptb', size: 20 });
    expect(sentParts().sort()).toEqual([
      ['/migrations/b1/uploads/u1/parts/0', [1, 2, 3, 4, 5, 6, 7, 8]],
      ['/migrations/b1/uploads/u1/parts/1', [9, 10, 11, 12, 13, 14, 15, 16]],
      ['/migrations/b1/uploads/u1/parts/2', [17, 18, 19, 20]],
    ]);
    expect(post).toHaveBeenLastCalledWith('/migrations/b1/uploads/u1/complete');
    expect(r.status).toBe('received');
    expect(progress[progress.length - 1]).toBe(20);
  });

  it('resumes: only the pieces the server does not hold', async () => {
    post.mockResolvedValueOnce(ok(upload({ received: [0, 1] }))).mockResolvedValueOnce(ok(upload({ status: 'received' })));
    put.mockResolvedValue({ success: true });
    await uploadLargeFileAPI('b1', 'company.ptb', source(), noWait);
    expect(sentParts().map(c => c[0])).toEqual(['/migrations/b1/uploads/u1/parts/2']);
  });

  it('repeats a piece lost on the way', async () => {
    post.mockResolvedValueOnce(ok(upload({ received: [0, 1] }))).mockResolvedValueOnce(ok(upload({ status: 'received' })));
    put.mockRejectedValueOnce(fail(undefined)).mockRejectedValueOnce(fail(undefined, 502)).mockResolvedValue({ success: true });
    await uploadLargeFileAPI('b1', 'company.ptb', source(), noWait);
    expect(put).toHaveBeenCalledTimes(3);
  });

  it('stops at once on an answer a repeat cannot change', async () => {
    post.mockResolvedValueOnce(ok(upload({ received: [0, 1] })));
    put.mockRejectedValue(fail('MIGRATION_INVALID_TRANSITION', 409));
    await expect(uploadLargeFileAPI('b1', 'company.ptb', source(), noWait)).rejects.toMatchObject({ code: 'MIGRATION_INVALID_TRANSITION' });
    expect(put).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('pauses when aborted, without completing', async () => {
    const abort = new AbortController();
    post.mockResolvedValueOnce(ok(upload()));
    put.mockImplementation(async () => {
      abort.abort();
      throw Object.assign(new Error('The upload was paused.'), { name: 'AbortError' });
    });
    await expect(uploadLargeFileAPI('b1', 'company.ptb', source(), { ...noWait, signal: abort.signal, concurrency: 1 })).rejects.toMatchObject({ name: 'AbortError' });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('sends what the server says is missing at completion, once', async () => {
    post
      .mockResolvedValueOnce(ok(upload({ received: [0, 1, 2] })))
      .mockRejectedValueOnce(fail('MIGRATION_UPLOAD_INCOMPLETE', 400))
      .mockResolvedValueOnce(ok(upload({ status: 'received' })));
    get.mockResolvedValueOnce(ok(upload({ received: [0, 2] })));
    put.mockResolvedValue({ success: true });
    const r = await uploadLargeFileAPI('b1', 'company.ptb', source(), noWait);
    expect(sentParts().map(c => c[0])).toEqual(['/migrations/b1/uploads/u1/parts/1']);
    expect(r.status).toBe('received');
  });
});

describe('deletePickedCopy', () => {
  it("removes the picker's copy in the cache, nothing else", () => {
    deleted.length = 0;
    deletePickedCopy('file:///data/user/0/pk.finmatrix/cache/DocumentPicker/company.ptb');
    deletePickedCopy('file:///var/mobile/Containers/Data/Application/X/Library/Caches/DocumentPicker/company.ptb');
    deletePickedCopy('file:///storage/emulated/0/Download/company.ptb');
    expect(deleted).toEqual([
      'file:///data/user/0/pk.finmatrix/cache/DocumentPicker/company.ptb',
      'file:///var/mobile/Containers/Data/Application/X/Library/Caches/DocumentPicker/company.ptb',
    ]);
  });
});
