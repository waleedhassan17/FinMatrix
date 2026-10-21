// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Network (Production API)
// ═══════════════════════════════════════════════════════

import {
  api,
  appendFileToForm,
  appendImageToForm,
  extractErrorMessage,
  postMultipart,
  toApiError,
} from '../network/apiHelpers';
import { downloadAndShareFile } from '../network/authedDownload';
import type {
  CreateInventoryItemPayload,
  UpdateInventoryItemPayload,
} from '../../models/inventoryModel';
import type { AdjustmentReason } from '../../models/adjustmentModel';
import { fetchAllPages } from '../../models/documentListModel';

export interface InventoryQueryParams {
  search?: string;
  category?: string;
  stockStatus?: string;
  agencyId?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export const getInventoryItemsAPI = async (params: InventoryQueryParams = {}): Promise<any> => {
  try {
    // Every page, as one `{ data }` payload. The item pickers (PO, invoice,
    // credit memo, delivery) and the inventory list filter this on the phone,
    // so one page — 50, then 500 — silently dropped items past it.
    const filters: InventoryQueryParams = { ...params };
    delete filters.page;
    delete filters.limit;
    const rows = await fetchAllPages(
      async (page, limit) => (await api.get('/inventory/items', { params: { ...filters, page, limit } })).data,
      (payload: any): any[] => (Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.data?.items) ? payload.data.items : []),
    );
    return { success: true, data: rows };
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getInventoryItemByIdAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.get(`/inventory/items/${id}`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const createInventoryItemAPI = async (
  data: CreateInventoryItemPayload,
): Promise<any> => {
  try {
    const response = await api.post('/inventory/items', data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateInventoryItemAPI = async (
  id: string,
  data: UpdateInventoryItemPayload,
): Promise<any> => {
  try {
    const response = await api.patch(`/inventory/items/${id}`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// AdjustQuantityDto: newQty is the ABSOLUTE target quantity as a numeric
// string (@IsNumberString), not a delta — the service derives the variance
// itself. The old `number | { newQuantity ... }` union let callers post a bare
// scalar that axios sent as raw JSON, and named the field `newQuantity`, which
// the API has never accepted. Both arms 400'd; the union is what let them
// type-check.
//
// referenceNum is intentionally not sent: the DTO validates it @IsUUID() while
// the column is varchar(64), and adjust() never persists it anyway.
export const adjustStockAPI = async (
  id: string,
  data: { itemId: string; newQty: string; reason: AdjustmentReason; notes?: string },
): Promise<any> => {
  try {
    const response = await api.post(`/inventory/items/${id}/adjust`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// Records stock the company already owned before it started using FinMatrix.
// Posts Dr Inventory 1200 / Cr Opening Balance Equity 3900 — no vendor, no
// payable, and no P&L movement, which is why this exists instead of letting
// people type an opening quantity onto the item form. One-time per item; the
// server refuses a second call and points at Stock Adjustment.
export const setOpeningStockAPI = async (
  id: string,
  data: { quantity: string; asOfDate?: string; notes?: string },
): Promise<any> => {
  try {
    const response = await api.post(`/inventory/items/${id}/opening-stock`, data);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getStockMovementsAPI = async (id: string, params: any = {}): Promise<any> => {
  try {
    const response = await api.get(`/inventory/items/${id}/movements`, { params });
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// The dedicated /toggle route flips isActive server-side and takes no body.
// This used to PATCH the plain item route with a hardcoded `{ isActive: true }`,
// so Deactivate reactivated an already-active item and the UI never changed —
// deactivation has never worked. Admin-only on the server (the rest of
// inventory is admin+staff), so a staff user gets a 403 that the caller
// surfaces.
export const toggleInventoryItemAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.patch(`/inventory/items/${id}/toggle`);
    return response.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Item photo ─────────────────────────────────────
// One photo per item. The server straightens it, strips its location data and
// stores a large and a small JPEG; the item comes back with signed imageUrl /
// thumbnailUrl that an <Image> can load without a token.
//
// postMultipart, not `api.post`: it leaves Content-Type to the platform so the
// multipart boundary is written, and refreshes an expired token itself.
export const uploadInventoryItemImageAPI = async (
  id: string,
  photo: { uri: string; name: string; mimeType: string },
): Promise<any> => {
  const form = new FormData();
  await appendImageToForm(form, 'image', photo.uri, { name: photo.name, type: photo.mimeType });
  return postMultipart(`/inventory/items/${id}/image`, form);
};

export const deleteInventoryItemImageAPI = async (id: string): Promise<any> => {
  try {
    const response = await api.delete(`/inventory/items/${id}/image`);
    return response.data;
  } catch (e: any) {
    throw toApiError(e);
  }
};

/**
 * Photo URLs for the items on a document, keyed by item id — for the PDF
 * builders, whose lines carry item ids rather than items. Items without a
 * photo are simply absent. Chunked to the server's 200-id limit.
 */
export const getItemImageUrlsAPI = async (
  itemIds: string[],
): Promise<Record<string, { thumbnailUrl: string; imageUrl: string }>> => {
  const ids = [...new Set(itemIds.filter(Boolean))];
  const out: Record<string, { thumbnailUrl: string; imageUrl: string }> = {};
  for (let i = 0; i < ids.length; i += 200) {
    try {
      const response = await api.get('/inventory/item-images', {
        params: { ids: ids.slice(i, i + 200).join(',') },
      });
      Object.assign(out, response.data?.data?.images ?? response.data?.images ?? {});
    } catch (e: any) {
      throw toApiError(e);
    }
  }
  return out;
};

// ─── Excel import ───────────────────────────────────
// Two calls with the SAME file: preview (writes nothing) and commit (applies
// every valid row in one transaction). See InventoryImportService on the API.

export type ImportFileAsset = { uri: string; name: string; mimeType: string };

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const importForm = async (file: ImportFileAsset, fields: Record<string, string> = {}) => {
  const form = new FormData();
  await appendFileToForm(form, 'file', file.uri, { name: file.name, type: file.mimeType || XLSX_MIME });
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
};

export const previewInventoryImportAPI = async (file: ImportFileAsset): Promise<any> =>
  postMultipart('/inventory/import/preview', await importForm(file));

/**
 * `idempotencyKey`: one per commit attempt of one file. A retried request with
 * the same key replays the first answer instead of importing twice; the server
 * scopes keys to the company only, so a new file must get a new key.
 */
export const commitInventoryImportAPI = async (
  file: ImportFileAsset,
  opts: { openingStockDate?: string; confirmOpeningStockValue?: string },
  idempotencyKey: string,
): Promise<any> => {
  const fields: Record<string, string> = {};
  if (opts.openingStockDate) fields.openingStockDate = opts.openingStockDate;
  if (opts.confirmOpeningStockValue !== undefined) fields.confirmOpeningStockValue = opts.confirmOpeningStockValue;
  return postMultipart('/inventory/import', await importForm(file, fields), {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
};

/** The blank template, or (prefill) every item in the same columns. */
export const downloadInventoryTemplateAPI = (prefill: boolean): Promise<void> =>
  downloadAndShareFile(
    `/inventory/import/template${prefill ? '?prefill=true' : ''}`,
    prefill ? 'inventory-items.xlsx' : 'inventory-import-template.xlsx',
    XLSX_MIME,
  );
