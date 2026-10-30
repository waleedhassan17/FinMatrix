// ═══════════════════════════════════════════════════════
// FinMatrix — The record behind a ledger row
// ═══════════════════════════════════════════════════════
// One map from a posting's `sourceType` to the screen that shows the document,
// shared by every drill: the P&L line, the account register, the cash-flow
// line. It began on ProfitLossScreen; three copies of it would drift.

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * Which screen shows the record behind a ledger row, and what it calls its id.
 *
 * Only documents that HAVE a detail screen appear here. A source with no entry
 * — a payment, a delivery leg, an inventory adjustment — leaves the row inert
 * rather than navigating somewhere that cannot show it.
 */
export const SOURCE_ROUTES: Record<string, { screen: string; param: string }> = {
  invoice: { screen: 'InvoiceDetail', param: 'invoiceId' },
  invoice_void: { screen: 'InvoiceDetail', param: 'invoiceId' },
  bill: { screen: 'BillDetail', param: 'billId' },
  bill_void: { screen: 'BillDetail', param: 'billId' },
  credit_memo: { screen: 'CreditMemoDetail', param: 'creditMemoId' },
  credit_memo_void: { screen: 'CreditMemoDetail', param: 'creditMemoId' },
  credit_memo_refund: { screen: 'CreditMemoDetail', param: 'creditMemoId' },
  vendor_credit: { screen: 'VendorCreditDetail', param: 'vendorCreditId' },
  vendor_credit_void: { screen: 'VendorCreditDetail', param: 'vendorCreditId' },
  purchase_order: { screen: 'PODetail', param: 'poId' },
  po_receipt: { screen: 'PODetail', param: 'poId' },
  journal_entry: { screen: 'JournalEntryDetail', param: 'entryId' },
};

export const canOpenSource = (sourceType: string, sourceId: string): boolean =>
  !!sourceId && !!SOURCE_ROUTES[sourceType];

/**
 * Open the record behind a ledger row.
 *
 * The documents are shared record screens, registered in every stack a report
 * lives in (navigations-maps/sharedRecords), so this is a push onto the
 * current tab: back returns to the report, open line and all. Hopping into
 * the Transactions tab instead left back popping to that tab's hub.
 */
export const useOpenSource = (): ((sourceType: string, sourceId: string) => void) => {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object>>>();
  return useCallback(
    (sourceType: string, sourceId: string) => {
      const route = SOURCE_ROUTES[sourceType];
      if (!route || !sourceId) return;
      navigation.navigate(route.screen, { [route.param]: sourceId });
    },
    [navigation],
  );
};
