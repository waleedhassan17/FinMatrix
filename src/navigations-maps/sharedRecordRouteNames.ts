// ═══════════════════════════════════════════════════════
// FinMatrix — record screens every tab can open (names only)
// ═══════════════════════════════════════════════════════
// The names behind SHARED_RECORD_ROUTES (sharedRecords.ts), kept free of screen
// imports so tests and the staff allow-list can read them without pulling in
// every screen.
//
// These are the documents and parties a tab drills into — an invoice from the
// P&L, a PO from an item, a bill from a vendor — plus every screen those can
// reach in turn. Each tab stack registers the whole set, so a drill-down is a
// push onto the tab the user is in and Back returns to where they were. See
// sharedRecords.ts for why.

export const SharedRecordRouteNames = {
  InvoiceList: 'InvoiceList',
  InvoiceDetail: 'InvoiceDetail',
  InvoiceForm: 'InvoiceForm',
  ReceivePayment: 'ReceivePayment',
  BillList: 'BillList',
  BillDetail: 'BillDetail',
  BillForm: 'BillForm',
  PayBills: 'PayBills',
  PaymentSuccess: 'PaymentSuccess',
  PODetail: 'PODetail',
  POForm: 'POForm',
  EstimateDetail: 'EstimateDetail',
  EstimateForm: 'EstimateForm',
  SalesOrderDetail: 'SalesOrderDetail',
  SalesOrderForm: 'SalesOrderForm',
  CreditMemoDetail: 'CreditMemoDetail',
  CreditMemoForm: 'CreditMemoForm',
  VendorCreditDetail: 'VendorCreditDetail',
  JournalEntryDetail: 'JournalEntryDetail',
  CustomerDetail: 'CustomerDetail',
  CustomerForm: 'CustomerForm',
  VendorDetail: 'VendorDetail',
  VendorForm: 'VendorForm',
  PartySummary: 'PartySummary',
  InventoryDetail: 'InventoryDetail',
  InventoryForm: 'InventoryForm',
  Adjustment: 'Adjustment',
} as const;

export type SharedRecordRouteName =
  typeof SharedRecordRouteNames[keyof typeof SharedRecordRouteNames];

export const SHARED_RECORD_ROUTE_NAMES = Object.values(
  SharedRecordRouteNames,
) as SharedRecordRouteName[];
