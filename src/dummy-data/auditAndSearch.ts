/* ─── Audit Trail Dummy Data ─── */

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

export const AUDIT_ENTRIES: AuditEntry[] = [
  { id: 'aud-001', timestamp: '2026-03-18T09:01:00Z', userId: 'u-001', userName: 'Ahmed Khan', action: 'Created', module: 'Invoices', description: 'Created invoice INV-1042 for Karachi Electronics', before: undefined, after: { invoiceNumber: 'INV-1042', amount: 45000, customer: 'Karachi Electronics' } },
  { id: 'aud-002', timestamp: '2026-03-18T09:15:00Z', userId: 'u-002', userName: 'Sara Malik', action: 'Updated', module: 'Customers', description: 'Updated contact info for Lahore Traders', before: { phone: '+92-321-1111111' }, after: { phone: '+92-321-9876543' } },
  { id: 'aud-003', timestamp: '2026-03-18T09:30:00Z', userId: 'u-001', userName: 'Ahmed Khan', action: 'Approved', module: 'Inventory', description: 'Approved stock adjustment ADJ-088', before: { status: 'Pending' }, after: { status: 'Approved' } },
  { id: 'aud-004', timestamp: '2026-03-18T09:45:00Z', userId: 'u-005', userName: 'Fatima Noor', action: 'Created', module: 'Vendors', description: 'Added new vendor Pak Steel Works', before: undefined, after: { vendorName: 'Pak Steel Works', city: 'Islamabad' } },
  { id: 'aud-005', timestamp: '2026-03-18T10:00:00Z', userId: 'u-001', userName: 'Ahmed Khan', action: 'Exported', module: 'Banking', description: 'Exported bank statement for HBL Current Account', before: undefined, after: { format: 'CSV', period: 'March 2026' } },
  { id: 'aud-006', timestamp: '2026-03-18T10:12:00Z', userId: 'u-003', userName: 'Bilal Hussain', action: 'Logged In', module: 'Users', description: 'User logged in from mobile device', before: undefined, after: { device: 'Android', ip: '192.168.1.45' } },
  { id: 'aud-007', timestamp: '2026-03-18T10:30:00Z', userId: 'u-002', userName: 'Sara Malik', action: 'Created', module: 'Journal Entries', description: 'Created journal entry JE-0312', before: undefined, after: { entryNumber: 'JE-0312', debit: 125000, credit: 125000 } },
  { id: 'aud-008', timestamp: '2026-03-18T10:45:00Z', userId: 'u-001', userName: 'Ahmed Khan', action: 'Updated', module: 'Settings', description: 'Changed invoice prefix from INV- to FM-', before: { invoicePrefix: 'INV-' }, after: { invoicePrefix: 'FM-' } },
  { id: 'aud-009', timestamp: '2026-03-18T11:00:00Z', userId: 'u-005', userName: 'Fatima Noor', action: 'Voided', module: 'Invoices', description: 'Voided invoice INV-1038 — duplicate entry', before: { status: 'Sent' }, after: { status: 'Voided' } },
  { id: 'aud-010', timestamp: '2026-03-18T11:15:00Z', userId: 'u-002', userName: 'Sara Malik', action: 'Approved', module: 'Payroll', description: 'Approved payroll run PR-2026-03', before: { status: 'Draft' }, after: { status: 'Approved', totalNet: 485000 } },
  { id: 'aud-011', timestamp: '2026-03-17T08:30:00Z', userId: 'u-001', userName: 'Ahmed Khan', action: 'Created', module: 'Deliveries', description: 'Created delivery DEL-0451 to Faisalabad', before: undefined, after: { deliveryId: 'DEL-0451', destination: 'Faisalabad' } },
  { id: 'aud-012', timestamp: '2026-03-17T09:00:00Z', userId: 'u-004', userName: 'Usman Raza', action: 'Updated', module: 'Deliveries', description: 'Updated delivery DEL-0451 status to In Transit', before: { status: 'Assigned' }, after: { status: 'In Transit' } },
  { id: 'aud-013', timestamp: '2026-03-17T09:30:00Z', userId: 'u-002', userName: 'Sara Malik', action: 'Created', module: 'Invoices', description: 'Created invoice INV-1041 for Al-Noor Distributors', before: undefined, after: { invoiceNumber: 'INV-1041', amount: 78000 } },
  { id: 'aud-014', timestamp: '2026-03-17T10:00:00Z', userId: 'u-005', userName: 'Fatima Noor', action: 'Deleted', module: 'Inventory', description: 'Removed discontinued item SKU-0099', before: { itemName: 'Old Widget', sku: 'SKU-0099' }, after: undefined },
  { id: 'aud-015', timestamp: '2026-03-17T10:30:00Z', userId: 'u-001', userName: 'Ahmed Khan', action: 'Updated', module: 'Banking', description: 'Reconciled HBL Current Account for Feb 2026', before: { reconciled: false }, after: { reconciled: true, reconciledDate: '2026-03-17' } },
  { id: 'aud-016', timestamp: '2026-03-17T11:00:00Z', userId: 'u-002', userName: 'Sara Malik', action: 'Created', module: 'Customers', description: 'Added new customer Multan Traders', before: undefined, after: { customerName: 'Multan Traders', city: 'Multan' } },
  { id: 'aud-017', timestamp: '2026-03-17T11:30:00Z', userId: 'u-001', userName: 'Ahmed Khan', action: 'Approved', module: 'Deliveries', description: 'Approved delivery completion DEL-0449', before: { status: 'Delivered' }, after: { status: 'Completed' } },
  { id: 'aud-018', timestamp: '2026-03-17T12:00:00Z', userId: 'u-005', userName: 'Fatima Noor', action: 'Updated', module: 'Vendors', description: 'Updated payment terms for Allied Chemicals', before: { terms: 'Net 30' }, after: { terms: 'Net 45' } },
  { id: 'aud-019', timestamp: '2026-03-16T08:00:00Z', userId: 'u-001', userName: 'Ahmed Khan', action: 'Logged In', module: 'Users', description: 'Admin logged in from web browser', before: undefined, after: { device: 'Chrome', ip: '10.0.0.5' } },
  { id: 'aud-020', timestamp: '2026-03-16T08:30:00Z', userId: 'u-002', userName: 'Sara Malik', action: 'Created', module: 'Journal Entries', description: 'Created adjusting entry JE-0311', before: undefined, after: { entryNumber: 'JE-0311', debit: 50000, credit: 50000 } },
  { id: 'aud-021', timestamp: '2026-03-16T09:00:00Z', userId: 'u-001', userName: 'Ahmed Khan', action: 'Updated', module: 'Invoices', description: 'Updated payment status of INV-1035 to Paid', before: { status: 'Sent' }, after: { status: 'Paid', paidAmount: 32000 } },
  { id: 'aud-022', timestamp: '2026-03-16T09:30:00Z', userId: 'u-005', userName: 'Fatima Noor', action: 'Created', module: 'Inventory', description: 'Added new item Copper Wire 2.5mm', before: undefined, after: { itemName: 'Copper Wire 2.5mm', sku: 'SKU-0145', qty: 500 } },
  { id: 'aud-023', timestamp: '2026-03-16T10:00:00Z', userId: 'u-002', userName: 'Sara Malik', action: 'Voided', module: 'Journal Entries', description: 'Voided journal entry JE-0308 — incorrect amounts', before: { status: 'Posted' }, after: { status: 'Voided' } },
  { id: 'aud-024', timestamp: '2026-03-16T10:30:00Z', userId: 'u-004', userName: 'Usman Raza', action: 'Updated', module: 'Deliveries', description: 'Marked delivery DEL-0447 as Delivered', before: { status: 'In Transit' }, after: { status: 'Delivered' } },
  { id: 'aud-025', timestamp: '2026-03-16T11:00:00Z', userId: 'u-001', userName: 'Ahmed Khan', action: 'Exported', module: 'Payroll', description: 'Exported payroll summary for Feb 2026', before: undefined, after: { format: 'PDF', period: 'Feb 2026' } },
  { id: 'aud-026', timestamp: '2026-03-15T09:00:00Z', userId: 'u-002', userName: 'Sara Malik', action: 'Updated', module: 'Settings', description: 'Changed default currency to PKR', before: { currency: 'USD' }, after: { currency: 'PKR' } },
  { id: 'aud-027', timestamp: '2026-03-15T09:30:00Z', userId: 'u-005', userName: 'Fatima Noor', action: 'Created', module: 'Banking', description: 'Added new bank account Meezan Savings', before: undefined, after: { bankName: 'Meezan Bank', accountType: 'Savings' } },
  { id: 'aud-028', timestamp: '2026-03-15T10:00:00Z', userId: 'u-001', userName: 'Ahmed Khan', action: 'Deleted', module: 'Customers', description: 'Removed inactive customer Test Account', before: { customerName: 'Test Account' }, after: undefined },
  { id: 'aud-029', timestamp: '2026-03-15T10:30:00Z', userId: 'u-002', userName: 'Sara Malik', action: 'Approved', module: 'Inventory', description: 'Approved physical count PC-0023', before: { status: 'Pending' }, after: { status: 'Approved', variance: -12 } },
  { id: 'aud-030', timestamp: '2026-03-15T11:00:00Z', userId: 'u-001', userName: 'Ahmed Khan', action: 'Created', module: 'Payroll', description: 'Initiated payroll run PR-2026-03', before: undefined, after: { runId: 'PR-2026-03', employees: 12, grossTotal: 620000 } },
];

/* ─── Global Search Dummy Data ─── */

export type SearchModule = 'Customers' | 'Invoices' | 'Inventory' | 'Vendors';

export interface SearchResult {
  id: string;
  module: SearchModule;
  title: string;
  subtitle: string;
  routeName: string;
  routeParams: Record<string, string>;
}

export const SEARCH_INDEX: SearchResult[] = [
  { id: 'sr-001', module: 'Customers', title: 'Karachi Electronics', subtitle: 'Customer • Balance: Rs 145,000', routeName: 'CustomerDetail', routeParams: { customerId: 'c-001' } },
  { id: 'sr-002', module: 'Customers', title: 'Lahore Traders', subtitle: 'Customer • Balance: Rs 78,500', routeName: 'CustomerDetail', routeParams: { customerId: 'c-002' } },
  { id: 'sr-003', module: 'Customers', title: 'Al-Noor Distributors', subtitle: 'Customer • Balance: Rs 210,000', routeName: 'CustomerDetail', routeParams: { customerId: 'c-003' } },
  { id: 'sr-004', module: 'Customers', title: 'Multan Traders', subtitle: 'Customer • Balance: Rs 32,000', routeName: 'CustomerDetail', routeParams: { customerId: 'c-004' } },
  { id: 'sr-005', module: 'Customers', title: 'Islamabad Supplies Co.', subtitle: 'Customer • Balance: Rs 95,200', routeName: 'CustomerDetail', routeParams: { customerId: 'c-005' } },
  { id: 'sr-006', module: 'Invoices', title: 'INV-1042', subtitle: 'Karachi Electronics • Rs 45,000 • Sent', routeName: 'InvoiceDetail', routeParams: { invoiceId: 'inv-001' } },
  { id: 'sr-007', module: 'Invoices', title: 'INV-1041', subtitle: 'Al-Noor Distributors • Rs 78,000 • Paid', routeName: 'InvoiceDetail', routeParams: { invoiceId: 'inv-002' } },
  { id: 'sr-008', module: 'Invoices', title: 'INV-1040', subtitle: 'Lahore Traders • Rs 23,500 • Overdue', routeName: 'InvoiceDetail', routeParams: { invoiceId: 'inv-003' } },
  { id: 'sr-009', module: 'Invoices', title: 'INV-1039', subtitle: 'Multan Traders • Rs 15,000 • Draft', routeName: 'InvoiceDetail', routeParams: { invoiceId: 'inv-004' } },
  { id: 'sr-010', module: 'Invoices', title: 'INV-1038', subtitle: 'Islamabad Supplies • Rs 62,000 • Voided', routeName: 'InvoiceDetail', routeParams: { invoiceId: 'inv-005' } },
  { id: 'sr-011', module: 'Inventory', title: 'Copper Wire 2.5mm', subtitle: 'SKU-0145 • Qty: 500 • Rs 1,200/unit', routeName: 'InventoryDetail', routeParams: { itemId: 'item-001' } },
  { id: 'sr-012', module: 'Inventory', title: 'Steel Bars 12mm', subtitle: 'SKU-0102 • Qty: 200 • Rs 3,500/unit', routeName: 'InventoryDetail', routeParams: { itemId: 'item-002' } },
  { id: 'sr-013', module: 'Inventory', title: 'PVC Pipes 4 inch', subtitle: 'SKU-0078 • Qty: 1,200 • Rs 450/unit', routeName: 'InventoryDetail', routeParams: { itemId: 'item-003' } },
  { id: 'sr-014', module: 'Inventory', title: 'Cement Bags 50kg', subtitle: 'SKU-0056 • Qty: 800 • Rs 1,100/unit', routeName: 'InventoryDetail', routeParams: { itemId: 'item-004' } },
  { id: 'sr-015', module: 'Inventory', title: 'Electric Cable 1.5mm', subtitle: 'SKU-0133 • Qty: 2,000 • Rs 350/unit', routeName: 'InventoryDetail', routeParams: { itemId: 'item-005' } },
  { id: 'sr-016', module: 'Vendors', title: 'Pak Steel Works', subtitle: 'Vendor • Islamabad • Balance: Rs 320,000', routeName: 'VendorDetail', routeParams: { vendorId: 'v-001' } },
  { id: 'sr-017', module: 'Vendors', title: 'Allied Chemicals', subtitle: 'Vendor • Karachi • Balance: Rs 185,000', routeName: 'VendorDetail', routeParams: { vendorId: 'v-002' } },
  { id: 'sr-018', module: 'Vendors', title: 'National Hardware', subtitle: 'Vendor • Lahore • Balance: Rs 92,500', routeName: 'VendorDetail', routeParams: { vendorId: 'v-003' } },
  { id: 'sr-019', module: 'Vendors', title: 'Punjab Electricals', subtitle: 'Vendor • Faisalabad • Balance: Rs 56,000', routeName: 'VendorDetail', routeParams: { vendorId: 'v-004' } },
  { id: 'sr-020', module: 'Vendors', title: 'Sindh Traders', subtitle: 'Vendor • Hyderabad • Balance: Rs 128,000', routeName: 'VendorDetail', routeParams: { vendorId: 'v-005' } },
];

export const MODULE_COLORS: Record<SearchModule, { bg: string; fg: string }> = {
  Customers: { bg: '#EFF6FF', fg: '#2563EB' },
  Invoices: { bg: '#FEF3C7', fg: '#D97706' },
  Inventory: { bg: '#ECFDF5', fg: '#059669' },
  Vendors: { bg: '#FEE2E2', fg: '#DC2626' },
};
