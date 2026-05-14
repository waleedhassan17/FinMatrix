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

export type SearchModule = 'Customers' | 'Invoices' | 'Inventory' | 'Vendors';

export interface SearchResult {
  id: string;
  module: SearchModule;
  title: string;
  subtitle: string;
  routeName: string;
  routeParams: Record<string, string>;
}

export const MODULE_COLORS: Record<SearchModule, { bg: string; fg: string }> = {
  Customers: { bg: '#EFF6FF', fg: '#2563EB' },
  Invoices: { bg: '#FEF3C7', fg: '#FF8B00' },
  Inventory: { bg: '#ECFDF5', fg: '#059669' },
  Vendors: { bg: '#FEE2E2', fg: '#DE350B' },
};
