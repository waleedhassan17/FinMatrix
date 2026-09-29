// ═══════════════════════════════════════════════════════
// FinMatrix — params of the record screens every tab registers
// ═══════════════════════════════════════════════════════
// navigations-maps/sharedRecords.ts registers the same record screens in every
// tab stack; this is their params, spread into each stack's param list so a
// local navigate('InvoiceDetail', …) type-checks wherever it is written.
//
// Document params are taken from TransactionsStackParamList by reference, so
// the registrations cannot drift into disagreeing about what a screen accepts.
// Party and item params are declared here rather than in MoreStack or
// InventoryStack, which both include this type: referencing them would make
// those param lists refer to themselves.
import type { TransactionsStackParamList } from './TransactionsStack';

export type SharedPartyParamList = {
  CustomerDetail: { customerId: string };
  CustomerForm: { customerId?: string } | undefined;
  VendorDetail: { vendorId: string };
  VendorForm: { vendorId?: string } | undefined;
  PartySummary: { partyType: 'customer' | 'vendor'; partyId: string; partyName?: string };
  InventoryDetail: { itemId: string };
  InventoryForm: { itemId?: string } | undefined;
  Adjustment: { itemId?: string } | undefined;
};

type SharedDocumentRoute =
  | 'InvoiceList'
  | 'InvoiceDetail'
  | 'InvoiceForm'
  | 'ReceivePayment'
  | 'EstimateDetail'
  | 'EstimateForm'
  | 'SalesOrderDetail'
  | 'SalesOrderForm'
  | 'CreditMemoDetail'
  | 'CreditMemoForm'
  | 'BillList'
  | 'BillDetail'
  | 'BillForm'
  | 'PayBills'
  | 'PaymentSuccess'
  | 'PODetail'
  | 'POForm'
  | 'VendorCreditDetail'
  | 'JournalEntryDetail';

export type SharedRecordParamList = Pick<TransactionsStackParamList, SharedDocumentRoute> &
  SharedPartyParamList;
