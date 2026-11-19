// ═══════════════════════════════════════════════════════
// FinMatrix — large uploads from the phone: a Peachtree / Sage 50
// backup (.ptb), up to 2 GB, in 8 MB pieces
// ═══════════════════════════════════════════════════════
//   POST   /migrations/:id/uploads                     { name, size } (the same name and size resume it)
//   PUT    /migrations/:id/uploads/:uploadId/parts/:n  raw bytes
//   POST   /migrations/:id/uploads/:uploadId/complete  → read on the server in the background
//   GET    /migrations/:id/uploads/:uploadId           pieces held
//   DELETE /migrations/:id/uploads/:uploadId           cancel
//
// Only one piece per request is ever in memory: it is read from the picked
// file at its offset (expo-file-system FileHandle; a Blob slice on the web
// build) and sent on its own, two at a time. A piece that fails is sent
// again, three times with a growing pause; an expired token is refreshed and
// only that piece repeated. Stopped for any reason — no signal, the app sent
// to the background, Pause, the app closed — picking the same file again
// continues from the pieces the server already holds. The server checks every
// piece's size and, once whole, every table against the backup's own CRC-32.

import { Platform } from 'react-native';
import { File } from 'expo-file-system';

import { api, putBinary, toApiError } from '../network/apiHelpers';
import type { MigrationUploadProgress } from '../../models/migrationModel';

export interface LargeUpload {
  id: string;
  batchId: string;
  name: string;
  size: number;
  partSize: number;
  parts: number;
  status: 'receiving' | 'received' | 'reading' | 'read' | 'failed';
  received: number[];
  progress: MigrationUploadProgress | null;
  errorCode: string | null;
  error: string | null;
  fileId: string | null;
}

export interface LargeUploadProgress {
  uploadId: string;
  sent: number;
  total: number;
  partsDone: number;
  parts: number;
}

/** Where the pieces come from: read one at a time, never the whole file. */
export interface PieceSource {
  size: number;
  read(offset: number, length: number): Promise<ArrayBuffer>;
  close(): void;
}

export interface LargeUploadOptions {
  onProgress?: (p: LargeUploadProgress) => void;
  signal?: AbortSignal;
  concurrency?: number;
  retries?: number;
  backoffMs?: (attempt: number) => number;
}

const base = (batchId: string) => `/migrations/${batchId}/uploads`;
const unwrap = (d: any) => (d && typeof d === 'object' && 'data' in d ? d.data : d);
const call = async <T>(fn: () => Promise<{ data: any }>): Promise<T> => {
  try {
    return unwrap((await fn()).data) as T;
  } catch (e) {
    throw toApiError(e);
  }
};

export const startLargeUploadAPI = (batchId: string, file: { name: string; size: number }) =>
  call<LargeUpload>(() => api.post(base(batchId), { name: file.name, size: file.size }));
export const getLargeUploadAPI = (batchId: string, uploadId: string) => call<LargeUpload>(() => api.get(`${base(batchId)}/${uploadId}`));
export const completeLargeUploadAPI = (batchId: string, uploadId: string) => call<LargeUpload>(() => api.post(`${base(batchId)}/${uploadId}/complete`));
export const cancelLargeUploadAPI = (batchId: string, uploadId: string) => call<{ id: string; cancelled: boolean }>(() => api.delete(`${base(batchId)}/${uploadId}`));

/** A picked document as a source of pieces: a FileHandle on the phone, the File itself on the web build. */
export function openPickedFile(asset: { uri: string; size?: number | null; file?: Blob }): PieceSource {
  if (Platform.OS === 'web') {
    const blob = asset.file;
    if (!blob) throw new Error('The chosen file could not be opened.');
    return {
      size: blob.size,
      read: (offset, length) => blob.slice(offset, offset + length).arrayBuffer(),
      close: () => undefined,
    };
  }
  const file = new File(asset.uri);
  const handle = file.open();
  const size = handle.size ?? file.size ?? asset.size ?? 0;
  return {
    size,
    read: async (offset, length) => {
      handle.offset = offset;
      const bytes = handle.readBytes(length);
      if (bytes.byteLength !== length) throw new Error('The file changed while it was being sent. Choose it again.');
      return bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
        ? bytes.buffer
        : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    },
    close: () => handle.close(),
  };
}

/** Codes a repeat cannot fix. */
const FINAL_CODES = new Set(['MIGRATION_INVALID_TRANSITION', 'MIGRATION_FILE_TOO_LARGE', 'NOT_FOUND', 'FORBIDDEN', 'COMPANY_NOT_ACTIVE']);
const isFinal = (e: any) => {
  if (e?.name === 'AbortError') return true;
  if (e?.code && FINAL_CODES.has(e.code)) return true;
  const s = e?.status;
  return typeof s === 'number' && s >= 400 && s < 500 && ![400, 408, 429].includes(s);
};
const abortError = () => Object.assign(new Error('The upload was paused.'), { name: 'AbortError' });
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const t = setTimeout(resolve, ms);
    signal?.addEventListener?.('abort', () => {
      clearTimeout(t);
      reject(abortError());
    });
  });

/**
 * Send the file to the batch in pieces, resuming whatever the server holds,
 * and mark it complete. Resolves with the upload, now queued to be read.
 */
export async function uploadLargeFileAPI(batchId: string, name: string, source: PieceSource, opts: LargeUploadOptions = {}): Promise<LargeUpload> {
  const { signal, onProgress } = opts;
  const concurrency = Math.max(1, opts.concurrency ?? 2);
  const retries = Math.max(0, opts.retries ?? 3);
  const backoff = opts.backoffMs ?? ((n: number) => 1000 * 2 ** (n - 1) + Math.random() * 500);

  let upload = await startLargeUploadAPI(batchId, { name, size: source.size });
  if (upload.status !== 'receiving') return upload;

  const pieceSize = (n: number) => Math.min(upload.partSize, source.size - n * upload.partSize);
  const held = new Set(upload.received);
  let doneBytes = [...held].reduce((t, n) => t + pieceSize(n), 0);
  const report = () => onProgress?.({ uploadId: upload.id, sent: doneBytes, total: source.size, partsDone: held.size, parts: upload.parts });
  report();

  const sendPiece = async (n: number) => {
    const data = await source.read(n * upload.partSize, pieceSize(n));
    for (let attempt = 0; ; attempt++) {
      if (signal?.aborted) throw abortError();
      try {
        await putBinary(`${base(batchId)}/${upload.id}/parts/${n}`, data, { signal });
        held.add(n);
        doneBytes += data.byteLength;
        report();
        return;
      } catch (e: any) {
        if (signal?.aborted) throw abortError();
        if (isFinal(e) || attempt >= retries) throw e;
        await sleep(backoff(attempt + 1), signal);
      }
    }
  };

  const runPieces = async (pieces: number[]) => {
    const queue = [...pieces];
    let failure: unknown = null;
    const worker = async () => {
      while (queue.length && !failure) {
        const n = queue.shift()!;
        try {
          await sendPiece(n);
        } catch (e) {
          failure = failure ?? e;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
    if (failure) throw failure;
  };

  const missing = () => Array.from({ length: upload.parts }, (_, n) => n).filter(n => !held.has(n));
  await runPieces(missing());
  try {
    return await completeLargeUploadAPI(batchId, upload.id);
  } catch (e: any) {
    if (e?.code !== 'MIGRATION_UPLOAD_INCOMPLETE') throw e;
    upload = await getLargeUploadAPI(batchId, upload.id);
    held.clear();
    upload.received.forEach(n => held.add(n));
    doneBytes = [...held].reduce((t, n) => t + pieceSize(n), 0);
    await runPieces(missing());
    return completeLargeUploadAPI(batchId, upload.id);
  }
}

/** The picker's copy in the app's cache, once it is no longer needed. */
export function deletePickedCopy(uri: string): void {
  if (Platform.OS === 'web') return;
  try {
    const f = new File(uri);
    if (/\/(Caches?|cache)\//i.test(f.uri) && f.exists) f.delete();
  } catch {
    /* already gone, or not ours to delete */
  }
}
