// Migration Center and backup network layer: the contract's paths, the
// envelope unwrapped, and the server's code kept on the thrown error.
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-file-system/legacy', () => ({ cacheDirectory: 'file:///cache/', downloadAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn() }));
jest.mock('../../network/apiHelpers', () => ({
  API_BASE_URL: 'https://api.example.test/api/v1',
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  appendFileToForm: jest.fn(async (form: any, field: string, uri: string, opts: any) => form.append(field, { uri, ...opts })),
  postMultipart: jest.fn(),
  toApiError: jest.fn((e: any) => Object.assign(new Error(e?.message ?? 'Request failed'), { code: e?.code })),
}));
jest.mock('../../network/authedDownload', () => ({ downloadAndShareFile: jest.fn() }));

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api, postMultipart } from '../../network/apiHelpers';
import { downloadAndShareFile } from '../../network/authedDownload';
import {
  commitMigrationAPI,
  createMigrationAPI,
  downloadMigrationCertificateAPI,
  listMigrationsAPI,
  signOffMigrationAPI,
  uploadMigrationFilesAPI,
} from '../migrationNetwork';
import { createExportAPI, downloadAndShareExport, exportDownloadUrl, listExportsAPI } from '../dataPortabilityNetwork';

const get = api.get as jest.Mock;
const post = api.post as jest.Mock;

class FakeForm {
  parts: Array<[string, any]> = [];
  append(k: string, v: any) {
    this.parts.push([k, v]);
  }
}

beforeAll(() => {
  (global as any).FormData = FakeForm;
});
beforeEach(() => jest.clearAllMocks());

describe('migrationNetwork', () => {
  it('lists migrations, unwrapping the envelope', async () => {
    get.mockResolvedValue({ data: { success: true, data: [{ id: 'b1' }] } });
    expect(await listMigrationsAPI()).toEqual([{ id: 'b1' }]);
    expect(get).toHaveBeenCalledWith('/migrations');
  });

  it('starts a migration with its source and cutover', async () => {
    post.mockResolvedValue({ data: { data: { id: 'b2' } } });
    await createMigrationAPI({ sourceSystem: 'tally', cutoverDate: '2026-07-01' });
    expect(post).toHaveBeenCalledWith('/migrations', { sourceSystem: 'tally', cutoverDate: '2026-07-01' });
  });

  it('keeps the server code on a refusal', async () => {
    post.mockRejectedValue({ message: 'not empty', code: 'MIGRATION_REQUIRES_EMPTY_BOOKS' });
    await expect(createMigrationAPI({ sourceSystem: 'tally', cutoverDate: '2026-07-01' })).rejects.toMatchObject({
      code: 'MIGRATION_REQUIRES_EMPTY_BOOKS',
    });
  });

  it('uploads every picked file under one multipart field', async () => {
    (postMultipart as jest.Mock).mockResolvedValue({ data: { id: 'b1', status: 'mapped' } });
    const b = await uploadMigrationFilesAPI('b1', [
      { uri: 'file:///a.xlsx', name: 'a.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { uri: 'file:///tally.xml', name: 'tally.xml', mimeType: null },
    ]);
    expect(b.status).toBe('mapped');
    const [path, form] = (postMultipart as jest.Mock).mock.calls[0];
    expect(path).toBe('/migrations/b1/files');
    expect(form.parts.map(([k]: [string]) => k)).toEqual(['files', 'files']);
    expect(form.parts[1][1].type).toBe('application/octet-stream');
  });

  it('signs off with both confirmations, and commits', async () => {
    post.mockResolvedValue({ data: { data: { id: 'b1' } } });
    await signOffMigrationAPI('b1');
    expect(post).toHaveBeenCalledWith('/migrations/b1/sign-off', { confirmed: true, spotCheckDone: true });
    await commitMigrationAPI('b1');
    expect(post.mock.calls[1][0]).toBe('/migrations/b1/commit');
    expect(post.mock.calls[1][2]).toEqual({ timeout: 300_000 });
  });

  it('downloads the certificate through the authenticated path', async () => {
    await downloadMigrationCertificateAPI('12345678-aaaa');
    expect(downloadAndShareFile).toHaveBeenCalledWith('/migrations/12345678-aaaa/certificate', 'migration-certificate-12345678.pdf', 'application/pdf');
  });
});

describe('dataPortabilityNetwork', () => {
  it('creates and lists backups', async () => {
    post.mockResolvedValue({ data: { data: { id: 'e1', status: 'queued' } } });
    await createExportAPI(false);
    expect(post).toHaveBeenCalledWith('/data-portability/exports', { includeXlsx: false });
    get.mockResolvedValue({ data: { data: null } });
    expect(await listExportsAPI()).toEqual([]);
  });

  it('sends the signed link to the API base this app talks to', () => {
    const signed = 'http://localhost:3000/api/v1/data-portability/exports/e1/download?token=abc.def';
    expect(exportDownloadUrl(signed)).toBe('https://api.example.test/api/v1/data-portability/exports/e1/download?token=abc.def');
    expect(exportDownloadUrl('https://elsewhere.test/file.zip')).toBe('https://elsewhere.test/file.zip');
  });

  it('downloads a ready backup without a session header, then shares it', async () => {
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ status: 200, uri: 'file:///cache/b.zip' });
    await downloadAndShareExport({ downloadUrl: 'http://x/api/v1/data-portability/exports/e1/download?token=t', fileName: 'b.zip' });
    expect((FileSystem.downloadAsync as jest.Mock).mock.calls[0]).toEqual([
      'https://api.example.test/api/v1/data-portability/exports/e1/download?token=t',
      'file:///cache/b.zip',
    ]);
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/b.zip', expect.objectContaining({ mimeType: 'application/zip' }));
  });

  it('says so when the file has expired', async () => {
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ status: 410, uri: '' });
    await expect(downloadAndShareExport({ downloadUrl: 'http://x/api/v1/data-portability/exports/e1/download?token=t', fileName: 'b.zip' })).rejects.toThrow(/expired/);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});
