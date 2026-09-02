export type AuditModule =
  | 'Invoices'
  | 'Customers'
  | 'Vendors'
  | 'Inventory'
  | 'Banking'
  | 'Payroll'
  | 'Journal Entries'
  | 'Settings'
  | 'Users'
  | 'Deliveries';

export type AuditAction = 'Created' | 'Updated' | 'Deleted' | 'Approved' | 'Voided' | 'Logged In' | 'Exported';

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AuditAction;
  module: AuditModule;
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

// ── Global search ─────────────────────────────────────
// One module per bucket `/search` answers with. Order matters: it is the
// order the sections appear in, money documents before directories.
export type SearchModule = 'Invoices' | 'Bills' | 'Customers' | 'Vendors' | 'Inventory';

export const SEARCH_MODULES: SearchModule[] = ['Invoices', 'Bills', 'Customers', 'Vendors', 'Inventory'];

export interface SearchResult {
  /** Unique across modules — the raw row id alone is not (`Invoices:<uuid>`). */
  id: string;
  module: SearchModule;
  title: string;
  subtitle: string;
  /** Tab-level stack that owns `routeName`; results are opened across stacks. */
  stack: 'TransactionsStack' | 'MoreStack' | 'InventoryStack';
  routeName: string;
  routeParams: Record<string, string>;
}

// How a module is drawn belongs to the screen, not here: see MODULE_ICONS in
// GlobalSearchScreen. This file used to carry a MODULE_COLORS map of five raw
// hex pairs — colour written down where the design-token gate cannot see it
// (it scans src/screens, src/components, src/Custom-Components and
// src/navigators), which is how one of them stayed the emerald the brand moved
// off long after the rest of the app went navy.

// ── Raw `/search` payload ─────────────────────────────
// The endpoint answers `{ query, results: { customers, vendors, invoices,
// bills, inventory } }` with full entity rows. Buckets are tier-gated
// server-side (no `inventory` key outside warehouse companies), and every
// field is optional here because the serializer is what makes it safe.
export interface RawSearchCustomer {
  id?: string; name?: string; company?: string; email?: string; phone?: string; balance?: string | number;
}
export interface RawSearchVendor {
  id?: string; companyName?: string; contactPerson?: string; email?: string; phone?: string; balance?: string | number;
}
export interface RawSearchInvoice {
  id?: string; invoiceNumber?: string; invoiceDate?: string; dueDate?: string; total?: string | number; status?: string;
}
export interface RawSearchBill {
  id?: string; billNumber?: string; billDate?: string; dueDate?: string; total?: string | number; status?: string;
}
export interface RawSearchInventoryItem {
  id?: string; name?: string; sku?: string; category?: string; quantityOnHand?: string | number; unitOfMeasure?: string;
}

export interface RawSearchResults {
  customers?: RawSearchCustomer[];
  vendors?: RawSearchVendor[];
  invoices?: RawSearchInvoice[];
  bills?: RawSearchBill[];
  inventory?: RawSearchInventoryItem[];
}

export interface RawSearchPayload {
  query?: string;
  results?: RawSearchResults;
}
