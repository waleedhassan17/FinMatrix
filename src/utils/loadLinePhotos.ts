// ═══════════════════════════════════════════════════════
// FinMatrix — fetch item photos for a PDF's lines
// ═══════════════════════════════════════════════════════
// See pdfLinePhotos.ts for why photos are embedded. A photo that fails — none
// on file, no signal, an expired link — simply leaves its line without one;
// a document is never held up for a picture.

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getItemImageUrlsAPI } from '../networks/inventory/inventoryNetwork';
import type { LinePhotos } from './pdfLinePhotos';

const CONCURRENCY = 4;
/** The whole fetch gives up after this long and uses what it has. */
const BUDGET_MS = 12_000;

/**
 * Thumbnails for the given items as data URIs, keyed by item id. Resolves to
 * whatever arrived within the time budget — `{}` on the web build, where
 * expo-print prints the page and never uses this HTML.
 */
export async function loadLinePhotos(itemIds: Array<string | undefined>): Promise<LinePhotos> {
  const ids = [...new Set(itemIds.filter((id): id is string => !!id))];
  if (Platform.OS === 'web' || ids.length === 0) return {};

  const photos: LinePhotos = {};
  const work = async () => {
    const urls = await getItemImageUrlsAPI(ids);
    const queue = Object.entries(urls).filter(([, u]) => !!u?.thumbnailUrl);
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const [itemId, { thumbnailUrl }] = next;
        try {
          const dest = `${FileSystem.cacheDirectory}pdf-photo-${itemId}.jpg`;
          const res = await FileSystem.downloadAsync(thumbnailUrl, dest);
          if (res.status !== 200) continue;
          const b64 = await FileSystem.readAsStringAsync(res.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          photos[itemId] = `data:image/jpeg;base64,${b64}`;
        } catch {
          // This line goes without its photo.
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    work().catch((): void => undefined),
    new Promise(resolve => {
      timer = setTimeout(resolve, BUDGET_MS);
    }),
  ]);
  clearTimeout(timer);
  return { ...photos };
}
