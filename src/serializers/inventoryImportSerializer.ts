// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Import Serializer
// ═══════════════════════════════════════════════════════
// Raw preview/commit envelope → ImportResult. Decimals arrive as strings and
// become numbers for display — except the opening-stock total, which is also
// kept verbatim because the commit sends it back as the owner's confirmation
// and the server compares it exactly.

import type {
  ImportAction,
  ImportFieldChange,
  ImportResult,
  ImportRow,
} from '../models/inventoryImportModel';

const toNum = (v: any): number => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const strings = (v: any): string[] => (Array.isArray(v) ? v.map(String) : []);
const ACTIONS: ImportAction[] = ['create', 'update', 'unchanged', 'error'];

const mapRow = (raw: any): ImportRow => ({
  rowNumber: toNum(raw?.rowNumber),
  sku: raw?.sku ?? '',
  name: raw?.name ?? '',
  action: ACTIONS.includes(raw?.action) ? raw.action : 'error',
  itemId: raw?.itemId ?? null,
  changes: Array.isArray(raw?.changes)
    ? raw.changes.map(
        (c: any): ImportFieldChange => ({
          field: c?.field ?? '',
          label: c?.label ?? c?.field ?? '',
          from: c?.from ?? null,
          to: c?.to ?? null,
        }),
      )
    : [],
  openingStock: raw?.openingStock
    ? {
        quantity: toNum(raw.openingStock.quantity),
        unitCost: toNum(raw.openingStock.unitCost),
        value: toNum(raw.openingStock.value),
      }
    : null,
  errors: strings(raw?.errors),
  warnings: strings(raw?.warnings),
});

export function inventoryImportSerializer(payload: any): ImportResult {
  const d = payload?.data ?? payload ?? {};
  const s = d.summary ?? {};
  const opening = s.openingStock ?? {};
  const applied = d.applied;
  return {
    fileName: d.fileName ?? '',
    recognizedColumns: strings(d.columns?.recognized),
    ignoredColumns: strings(d.columns?.ignored),
    openingStockAllowed: d.openingStockAllowed === true,
    booksLockedUntil: d.booksLockedUntil ?? null,
    summary: {
      totalRows: toNum(s.totalRows),
      create: toNum(s.create),
      update: toNum(s.update),
      unchanged: toNum(s.unchanged),
      error: toNum(s.error),
      withWarnings: toNum(s.withWarnings),
      openingStock: {
        items: toNum(opening.items),
        quantity: toNum(opening.quantity),
        value: toNum(opening.value),
        confirmValue: typeof opening.value === 'string' ? opening.value : String(toNum(opening.value)),
      },
    },
    rows: Array.isArray(d.rows) ? d.rows.map(mapRow) : [],
    applied: applied
      ? {
          created: toNum(applied.created),
          updated: toNum(applied.updated),
          openingStockItems: toNum(applied.openingStockItems),
          openingStockValue: toNum(applied.openingStockValue),
          openingStockDate: applied.openingStockDate ?? null,
          journalReference: applied.journalReference ?? null,
        }
      : null,
  };
}
