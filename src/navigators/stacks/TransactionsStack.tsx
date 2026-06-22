import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TransactionsHubScreen from '../../screens/Transactions/TransactionsHubScreen';
import InvoiceListScreen from '../../screens/Invoices/InvoiceList/InvoiceListScreen';
import InvoiceFormScreen from '../../screens/Invoices/InvoiceForm/InvoiceFormScreen';
import InvoiceDetailScreen from '../../screens/Invoices/InvoiceDetail/InvoiceDetailScreen';
import EstimateListScreen from '../../screens/Estimates/EstimateListScreen';
import EstimateFormScreen from '../../screens/Estimates/EstimateFormScreen';
import EstimateDetailScreen from '../../screens/Estimates/EstimateDetailScreen';
import SalesOrderListScreen from '../../screens/SalesOrders/SalesOrderListScreen';
import SalesOrderDetailScreen from '../../screens/SalesOrders/SalesOrderDetailScreen';
import CreditMemoListScreen from '../../screens/CreditMemos/CreditMemoListScreen';
import CreditMemoFormScreen from '../../screens/CreditMemos/CreditMemoFormScreen';
import CreditMemoDetailScreen from '../../screens/CreditMemos/CreditMemoDetailScreen';
import VendorCreditListScreen from '../../screens/VendorCredits/VendorCreditListScreen';
import VendorCreditFormScreen from '../../screens/VendorCredits/VendorCreditFormScreen';
import VendorCreditDetailScreen from '../../screens/VendorCredits/VendorCreditDetailScreen';
import ReceivePaymentScreen from '../../screens/Payments/ReceivePayment/ReceivePaymentScreen';
import BillListScreen from '../../screens/Bills/BillList/BillListScreen';
import BillFormScreen from '../../screens/Bills/BillForm/BillFormScreen';
import BillDetailScreen from '../../screens/Bills/BillDetail/BillDetailScreen';
import PayBillsScreen from '../../screens/Bills/PayBills/PayBillsScreen';
import POListScreen from '../../screens/PurchaseOrders/POList/POListScreen';
import POFormScreen from '../../screens/PurchaseOrders/POForm/POFormScreen';
import PODetailScreen from '../../screens/PurchaseOrders/PODetail/PODetailScreen';

export type TransactionsStackParamList = {
  TransactionsHub: undefined;
  InvoiceList: undefined;
  InvoiceForm: { invoiceId?: string } | undefined;
  InvoiceDetail: { invoiceId: string };
  EstimateList: undefined;
  EstimateForm: { estimateId?: string } | undefined;
  EstimateDetail: { estimateId: string };
  SalesOrderList: undefined;
  SalesOrderDetail: { salesOrderId: string };
  CreditMemoList: undefined;
  CreditMemoForm: { creditMemoId?: string } | undefined;
  CreditMemoDetail: { creditMemoId: string };
  VendorCreditList: undefined;
  VendorCreditForm: { vendorCreditId?: string } | undefined;
  VendorCreditDetail: { vendorCreditId: string };
  ReceivePayment: { customerId?: string; invoiceId?: string } | undefined;
  BillList: undefined;
  BillForm: { billId?: string; fromPOId?: string } | undefined;
  BillDetail: { billId: string };
  PayBills: { vendorId?: string; billId?: string } | undefined;
  POList: undefined;
  POForm: { poId?: string } | undefined;
  PODetail: { poId: string };
};

const Stack = createNativeStackNavigator<TransactionsStackParamList>();

const TransactionsStack: React.FC = () => (
  <Stack.Navigator id="TransactionsStack" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TransactionsHub" component={TransactionsHubScreen} />
    <Stack.Screen name="InvoiceList" component={InvoiceListScreen} />
    <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} />
    <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
    <Stack.Screen name="EstimateList" component={EstimateListScreen} />
    <Stack.Screen name="EstimateForm" component={EstimateFormScreen} />
    <Stack.Screen name="EstimateDetail" component={EstimateDetailScreen} />
    <Stack.Screen name="SalesOrderList" component={SalesOrderListScreen} />
    <Stack.Screen name="SalesOrderDetail" component={SalesOrderDetailScreen} />
    <Stack.Screen name="CreditMemoList" component={CreditMemoListScreen} />
    <Stack.Screen name="CreditMemoForm" component={CreditMemoFormScreen} />
    <Stack.Screen name="CreditMemoDetail" component={CreditMemoDetailScreen} />
    <Stack.Screen name="VendorCreditList" component={VendorCreditListScreen} />
    <Stack.Screen name="VendorCreditForm" component={VendorCreditFormScreen} />
    <Stack.Screen name="VendorCreditDetail" component={VendorCreditDetailScreen} />
    <Stack.Screen name="ReceivePayment" component={ReceivePaymentScreen} />
    <Stack.Screen name="BillList" component={BillListScreen} />
    <Stack.Screen name="BillForm" component={BillFormScreen} />
    <Stack.Screen name="BillDetail" component={BillDetailScreen} />
    <Stack.Screen name="PayBills" component={PayBillsScreen} />
    <Stack.Screen name="POList" component={POListScreen} />
    <Stack.Screen name="POForm" component={POFormScreen} />
    <Stack.Screen name="PODetail" component={PODetailScreen} />
  </Stack.Navigator>
);

export default TransactionsStack;
