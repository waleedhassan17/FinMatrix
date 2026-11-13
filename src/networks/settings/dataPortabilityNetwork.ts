// ═══════════════════════════════════════════════════════
// FinMatrix — Company backup API (owner only)
//   POST /data-portability/exports { includeXlsx }
//   GET  /data-portability/exports · /data-portability/exports/:id
// A ready export carries a signed downloadUrl: the link is its own
// authorisation, so it is downloaded with no bearer header.
// ═══════════════════════════════════════════════════════
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL, api, toApiError } from '../network/apiHelpers';
import type { CompanyExport } from '../../models/dataPortabilityModel';

const unwrap = (d: any) => (d && typeof d === 'object' && 'data' in d ? d.data : d);
const call = async <T>(fn: () => Promise<{ data: any }>): Promise<T> => {
  try {
    return unwrap((await fn()).data) as T;
  } catch (e) {
    throw toApiError(e);
  }
};

export const createExportAPI = (includeXlsx: boolean) => call<{ id: string; status: string }>(() => api.post('/data-portability/exports', { includeXlsx }));
export const listExportsAPI = async (): Promise<CompanyExport[]> => {
  const data = await call<CompanyExport[] | null>(() => api.get('/data-portability/exports'));
  return Array.isArray(data) ? data : [];
};
export const getExportAPI = (id: string) => call<CompanyExport>(() => api.get(`/data-portability/exports/${id}`));

/**
 * The server signs an absolute link from its own APP_URL, which a phone may
 * not reach (a dev machine's localhost, say). The token is what authorises the
 * download, so the same path and query are sent to the API base this app
 * already talks to.
 */
export function exportDownloadUrl(downloadUrl: string, apiBase: string = API_BASE_URL): string {
  const at = downloadUrl.indexOf('/data-portability/');
  return at < 0 ? downloadUrl : `${apiBase.replace(/\/$/, '')}${downloadUrl.slice(at)}`;
}

/** Save a ready backup to the device and open the share sheet (web: a download). */
export async function downloadAndShareExport(e: Pick<CompanyExport, 'downloadUrl' | 'fileName'>): Promise<void> {
  if (!e.downloadUrl) throw new Error('This backup is not ready to download.');
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = exportDownloadUrl(e.downloadUrl);
    a.download = e.fileName;
    a.click();
    return;
  }
  const dest = `${FileSystem.cacheDirectory}${e.fileName}`;
  const result = await FileSystem.downloadAsync(exportDownloadUrl(e.downloadUrl), dest);
  if (result.status === 410) throw new Error('This backup has expired. Create a new one.');
  if (result.status >= 400) throw new Error(`The download failed (${result.status}). Please try again.`);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(result.uri, { mimeType: 'application/zip', dialogTitle: e.fileName, UTI: 'public.zip-archive' });
}
