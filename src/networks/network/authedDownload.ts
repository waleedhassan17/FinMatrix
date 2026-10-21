// ═══════════════════════════════════════════════════════
// FinMatrix — Authenticated file download → share sheet
// ═══════════════════════════════════════════════════════
// For files the API streams behind auth (the inventory import template and
// the item export). A plain Linking.openURL would hit the route without a
// token and 401, so the file is fetched with the session's headers, saved to
// the cache, and handed to the system share sheet — from there the user can
// open it in Excel/WPS, save it to Files or Drive, or send it on WhatsApp.
//
// Kept out of apiHelpers so the shared API client does not pull the
// file-system and sharing native modules into every screen and test.

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  API_BASE_URL,
  getAccessToken,
  getStoredCompanyId,
  refreshSessionTokens,
} from './apiHelpers';

const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getAccessToken();
  const companyId = await getStoredCompanyId();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(companyId ? { 'x-company-id': companyId } : {}),
  };
};

const failure = (status: number) =>
  new Error(
    status === 403
      ? 'You do not have permission to download this file.'
      : `The download failed (${status}). Please try again.`,
  );

/**
 * Download `path` from the API as `filename` and offer it to the user.
 * A 401 refreshes the session once and retries, as every other request does.
 */
export const downloadAndShareFile = async (
  path: string,
  filename: string,
  mimeType: string,
): Promise<void> => {
  const url = `${API_BASE_URL}${path}`;

  if (Platform.OS === 'web') {
    // expo-file-system has no web implementation: fetch → Blob → <a download>.
    let res = await fetch(url, { headers: await authHeaders() });
    if (res.status === 401 && (await refreshSessionTokens())) {
      res = await fetch(url, { headers: await authHeaders() });
    }
    if (!res.ok) throw failure(res.status);
    const href = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 0);
    return;
  }

  const dest = `${FileSystem.cacheDirectory}${filename}`;
  let result = await FileSystem.downloadAsync(url, dest, { headers: await authHeaders() });
  if (result.status === 401 && (await refreshSessionTokens())) {
    result = await FileSystem.downloadAsync(url, dest, { headers: await authHeaders() });
  }
  if (result.status >= 400) throw failure(result.status);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(result.uri, { mimeType, dialogTitle: filename });
};
