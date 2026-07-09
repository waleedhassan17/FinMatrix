// ═══════════════════════════════════════════════════════
// FinMatrix — TransactionsStack (dumb mapper over navigations-maps/Transactions)
// ═══════════════════════════════════════════════════════
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TRANSACTIONS_ROUTES } from '../../navigations-maps/Transactions';

export type TransactionsStackParamList = {
  TransactionsHub: undefined;
  InvoiceList: undefined;
  InvoiceForm: { invoiceId?: string; customerId?: string } | undefined;
  InvoiceDetail: { invoiceId: string };
  EstimateList: undefined;
  EstimateForm: { estimateId?: string } | undefined;
  EstimateDetail: { estimateId: string };
  SalesOrderList: undefined;
  SalesOrderForm: { salesOrderId?: string } | undefined;
  SalesOrderDetail: { salesOrderId: string };
  CreditMemoList: undefined;
  CreditMemoForm: { creditMemoId?: string } | undefined;
  CreditMemoDetail: { creditMemoId: string };
  VendorCreditList: undefined;
  VendorCreditForm: { vendorCreditId?: string } | undefined;
  VendorCreditDetail: { vendorCreditId: string };
  ReceivePayment: { customerId?: string; invoiceId?: string } | undefined;
  BillList: undefined;
  BillForm: { billId?: string; fromPOId?: string; vendorId?: string } | undefined;
  BillDetail: { billId: string };
  PayBills: { vendorId?: string; billId?: string } | undefined;
  POList: undefined;
  POForm: { poId?: string } | undefined;
  PODetail: { poId: string };
  JournalEntryList: undefined;
  JournalEntryForm: { entryId?: string } | undefined;
  JournalEntryDetail: { entryId: string };
};

const Stack = createNativeStackNavigator();

const TransactionsStack: React.FC = () => (
  <Stack.Navigator id="TransactionsStack" screenOptions={{ headerShown: false }}>
    {TRANSACTIONS_ROUTES.map(route => (
      <Stack.Screen
        key={route.title}
        name={route.title}
        component={route.component}
        options={route.options}
      />
    ))}
  </Stack.Navigator>
);

export default TransactionsStack;
