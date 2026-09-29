// ═══════════════════════════════════════════════════════
// FinMatrix — record screens every tab can open
// ═══════════════════════════════════════════════════════
// QA: "Back sends me to Transactions." The P&L, the aging reports, an item's
// purchase orders, a customer's Create Invoice, the Dashboard's Receivables
// tile and global search all opened their documents by hopping into another
// tab's stack — navigate('TransactionsStack', { screen, initial: false }).
// That switches tabs and pushes onto THAT tab's history, so Back (goBack)
// popped inside the other tab and landed on its hub or whatever was left there,
// never on the report, item or customer the user came from.
//
// The fix is the one DashboardStack, InventoryStack's POForm and the rider
// stacks already used: register the screens in every tab stack and push
// locally. A drill-down stays on the tab it started from, the tab bar keeps
// its place, and Back (header or hardware) returns to the exact screen below.
//
// The set is CLOSED: every screen here navigates only to screens here (or
// hops to a tab by name). A navigate() to a name the current stack does not
// register is dropped without an error, so a missing member would be a dead
// tap. navigators/__tests__/crossTabNavigation.test.ts checks the closure.

import type { IRoute } from './types';
import { SharedRecordRouteNames as N } from './sharedRecordRouteNames';
import InvoiceListScreen from '../screens/Invoices/InvoiceList/InvoiceListScreen';
import InvoiceDetailScreen from '../screens/Invoices/InvoiceDetail/InvoiceDetailScreen';
import InvoiceFormScreen from '../screens/Invoices/InvoiceForm/InvoiceFormScreen';
import ReceivePaymentScreen from '../screens/Payments/ReceivePayment/ReceivePaymentScreen';
import BillListScreen from '../screens/Bills/BillList/BillListScreen';
import BillDetailScreen from '../screens/Bills/BillDetail/BillDetailScreen';
import BillFormScreen from '../screens/Bills/BillForm/BillFormScreen';
import PayBillsScreen from '../screens/Bills/PayBills/PayBillsScreen';
import PaymentSuccessScreen from '../screens/Bills/PayBills/PaymentSuccessScreen';
import PODetailScreen from '../screens/PurchaseOrders/PODetail/PODetailScreen';
import POFormScreen from '../screens/PurchaseOrders/POForm/POFormScreen';
import EstimateDetailScreen from '../screens/Estimates/EstimateDetailScreen';
import EstimateFormScreen from '../screens/Estimates/EstimateFormScreen';
import SalesOrderDetailScreen from '../screens/SalesOrders/SalesOrderDetailScreen';
import SalesOrderFormScreen from '../screens/SalesOrders/SalesOrderFormScreen';
import CreditMemoDetailScreen from '../screens/CreditMemos/CreditMemoDetailScreen';
import CreditMemoFormScreen from '../screens/CreditMemos/CreditMemoFormScreen';
import VendorCreditDetailScreen from '../screens/VendorCredits/VendorCreditDetailScreen';
import GeneralJournalDetailScreen from '../screens/GeneralJournal/GeneralJournalDetailScreen';
import CustomerDetailScreen from '../screens/Customers/CustomerDetail/CustomerDetailScreen';
import CustomerFormScreen from '../screens/Customers/CustomerForm/CustomerFormScreen';
import VendorDetailScreen from '../screens/Vendors/VendorDetail/VendorDetailScreen';
import VendorFormScreen from '../screens/Vendors/VendorForm/VendorFormScreen';
import PartySummaryScreen from '../screens/Reports/PartySummary/PartySummaryScreen';
import InventoryDetailScreen from '../screens/Inventory/InventoryDetail/InventoryDetailScreen';
import InventoryFormScreen from '../screens/Inventory/InventoryForm/InventoryFormScreen';
import AdjustmentScreen from '../screens/Inventory/Adjustment/AdjustmentScreen';

/** `as const` so the titles stay literal types — StaffMore's allow-list check reads them. */
export const SHARED_RECORD_ROUTES = [
  // Sales
  { title: N.InvoiceList, component: InvoiceListScreen },
  { title: N.InvoiceDetail, component: InvoiceDetailScreen },
  { title: N.InvoiceForm, component: InvoiceFormScreen },
  { title: N.ReceivePayment, component: ReceivePaymentScreen },
  { title: N.EstimateDetail, component: EstimateDetailScreen },
  { title: N.EstimateForm, component: EstimateFormScreen },
  { title: N.SalesOrderDetail, component: SalesOrderDetailScreen },
  { title: N.SalesOrderForm, component: SalesOrderFormScreen },
  { title: N.CreditMemoDetail, component: CreditMemoDetailScreen },
  { title: N.CreditMemoForm, component: CreditMemoFormScreen },
  // Purchases
  { title: N.BillList, component: BillListScreen },
  { title: N.BillDetail, component: BillDetailScreen },
  { title: N.BillForm, component: BillFormScreen },
  { title: N.PayBills, component: PayBillsScreen },
  { title: N.PaymentSuccess, component: PaymentSuccessScreen },
  { title: N.PODetail, component: PODetailScreen },
  { title: N.POForm, component: POFormScreen },
  { title: N.VendorCreditDetail, component: VendorCreditDetailScreen },
  // Accounting
  { title: N.JournalEntryDetail, component: GeneralJournalDetailScreen },
  // Parties
  { title: N.CustomerDetail, component: CustomerDetailScreen },
  { title: N.CustomerForm, component: CustomerFormScreen },
  { title: N.VendorDetail, component: VendorDetailScreen },
  { title: N.VendorForm, component: VendorFormScreen },
  { title: N.PartySummary, component: PartySummaryScreen },
  // Inventory
  { title: N.InventoryDetail, component: InventoryDetailScreen },
  { title: N.InventoryForm, component: InventoryFormScreen },
  { title: N.Adjustment, component: AdjustmentScreen },
] as const;

/**
 * A stack's own routes plus every shared record screen it does not already
 * register. Its own routes come first, so its initial route is unchanged; a
 * screen it already registers keeps that registration (same component).
 */
export const withSharedRecords = <T extends IRoute>(routes: readonly T[]): IRoute[] => {
  const registered = new Set(routes.map(route => route.title));
  return [
    ...routes,
    ...SHARED_RECORD_ROUTES.filter(route => !registered.has(route.title)),
  ];
};
