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

export const MODULE_COLORS: Record<SearchModule, { bg: string; fg: string }> = {
  Customers: { bg: '#EFF6FF', fg: '#2563EB' },
  Invoices: { bg: '#FEF3C7', fg: '#FF8B00' },
  Bills: { bg: '#F3E8FF', fg: '#7C3AED' },
  Inventory: { bg: '#ECFDF5', fg: '#059669' },
  Vendors: { bg: '#FEE2E2', fg: '#DE350B' },
};

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
