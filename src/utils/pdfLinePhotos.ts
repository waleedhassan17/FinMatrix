// ═══════════════════════════════════════════════════════
// FinMatrix — item photos on PDF document lines
// ═══════════════════════════════════════════════════════
// Quotations, invoices and sales orders show each line's item photo, the way
// a furniture or fit-out business sends a quote. The PDF builders take the
// photos as `itemId → data URI` and stay pure; this module fetches them.
//
// Embedded as base64, not linked: expo-print renders in an Android WebView
// that may print before a remote image arrives, and a PDF forwarded on
// WhatsApp must not depend on a link that expires.
//
// Fetching them lives in loadLinePhotos.ts, which the generate*Pdf functions
// import lazily: this file stays free of native modules, so the builders can
// be unit-tested without mocking the file system and the API client.

export type LinePhotos = Record<string, string>;

/** Only an image data URI we produced may go into the HTML. */
export const isSafeImageDataUri = (v: unknown): v is string =>
  typeof v === 'string' && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(v);

/** True when at least one line has a photo — otherwise no photo column. */
export const hasLinePhotos = (photos: LinePhotos | undefined, itemIds: Array<string | undefined>): boolean =>
  !!photos && itemIds.some(id => !!id && isSafeImageDataUri(photos[id]));

/** The photo cell for one line (empty when that line has none). */
export const photoCellHtml = (photos: LinePhotos | undefined, itemId: string | undefined): string => {
  const src = itemId && photos ? photos[itemId] : undefined;
  return isSafeImageDataUri(src)
    ? `<td class="photo"><img src="${src}" alt="" /></td>`
    : '<td class="photo"></td>';
};

/** Styles for the photo column; appended inside each template's <style>. */
export const PHOTO_CSS = `
      .items th.photo, .items td.photo { width: 52px; padding-right: 0; }
      .items td.photo img {
        width: 44px; height: 44px; object-fit: cover;
        border-radius: 4px; border: 1px solid #E2E8F0; display: block;
      }`;
