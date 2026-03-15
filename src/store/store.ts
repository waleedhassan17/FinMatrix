import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Global slices ──
import authReducer from '../screens/Auth/authSlice';
import companyReducer from '../screens/Auth/companySlice';

// ── App-level slices ──
import { appContainerSlice } from '../components/app-container/appContainerSlice';
import { realtimeMiddleware } from './realtimeMiddleware';

// ── Per-screen slices ──
import { signInSlice } from '../screens/Auth/SignIn/signInSlice';
import { signUpSlice } from '../screens/Auth/SignUp/signUpSlice';
import { forgotPasswordSlice } from '../screens/Auth/ForgotPassword/forgotPasswordSlice';
import { emailVerificationSlice } from '../screens/Auth/EmailVerification/emailVerificationSlice';
import { onboardingSlice } from '../screens/Onboarding/onboardingSlice';
import { roleSelectionSlice } from '../screens/RoleSelection/roleSelectionSlice';
import { companySetupSlice } from '../screens/Auth/CompanySetup/companySetupSlice';
import { createCompanySlice } from '../screens/Auth/CreateCompany/createCompanySlice';
import { joinCompanySlice } from '../screens/Auth/JoinCompany/joinCompanySlice';
import { deliveryOnboardingSlice } from '../screens/Auth/DeliveryOnboarding/deliveryOnboardingSlice';
import { dpDashboardSlice } from '../screens/Delivery/Personnel/DPDashboard/dpDashboardSlice';
import { dpDeliveryListSlice } from '../screens/Delivery/Personnel/DPDeliveryList/dpDeliveryListSlice';
import { dpDeliveryDetailSlice } from '../screens/Delivery/Personnel/DPDeliveryDetail/dpDeliveryDetailSlice';
import { dpInventorySlice } from '../screens/Delivery/Personnel/DPInventory/dpInventorySlice';
import { dpProfileSlice } from '../screens/Delivery/Personnel/DPProfile/dpProfileSlice';
import { dpShadowInventorySlice } from '../screens/Delivery/Personnel/DPShadowInventory/dpShadowInventorySlice';
import { dpHistorySlice } from '../screens/Delivery/Personnel/DPHistory/dpHistorySlice';
import { dpSettingsSlice } from '../screens/Delivery/Personnel/DPSettings/dpSettingsSlice';
import { dpSignatureCaptureSlice } from '../screens/Delivery/Personnel/SignatureCapture/dpSignatureCaptureSlice';
import { dpCustomerConfirmSlice } from '../screens/Delivery/Personnel/CustomerConfirm/dpCustomerConfirmSlice';
import { dpDeliveryCompleteSlice } from '../screens/Delivery/Personnel/DeliveryComplete/dpDeliveryCompleteSlice';
import { deliveryPersonnelListSlice } from '../screens/Delivery/Admin/DeliveryPersonnelList/deliveryPersonnelListSlice';
import { addDeliveryPersonnelSlice } from '../screens/Delivery/Admin/AddDeliveryPersonnel/addDeliveryPersonnelSlice';
import { deliveryPersonnelDetailSlice } from '../screens/Delivery/Admin/DeliveryPersonnelDetail/deliveryPersonnelDetailSlice';
import { assignDeliveriesSlice } from '../screens/Delivery/Admin/AssignDeliveries/assignDeliveriesSlice';
import { createDeliveryScreenSlice } from '../screens/Delivery/Admin/CreateDelivery/createDeliverySlice';
import { assignWorkSlice } from '../screens/Delivery/Admin/AssignWork/assignWorkSlice';
import { deliveryMonitorSlice } from '../screens/Delivery/Admin/DeliveryMonitor/deliveryMonitorSlice';
import { adminDeliveryDetailSlice } from '../screens/Delivery/Admin/AdminDeliveryDetail/adminDeliveryDetailSlice';
import { inventoryApprovalSlice } from '../screens/Delivery/Admin/InventoryApproval/inventoryApprovalSlice';
import { adminDashboardSlice } from '../screens/HomeScreen/adminDashboardSlice';
import { coaListSlice } from '../screens/ChartOfAccounts/COAList/coaListSlice';
import { coaFormSlice } from '../screens/ChartOfAccounts/COAForm/coaFormSlice';
import { coaDetailSlice } from '../screens/ChartOfAccounts/COADetail/coaDetailSlice';
import { glSlice } from '../screens/GeneralLedger/glSlice';
import { jeListSlice } from '../screens/JournalEntries/JEList/jeListSlice';
import { jeFormSlice } from '../screens/JournalEntries/JEForm/jeFormSlice';
import { jeDetailSlice } from '../screens/JournalEntries/JEDetail/jeDetailSlice';
import { inventoryListSlice } from '../screens/Inventory/InventoryList/inventoryListSlice';
import { inventoryFormSlice } from '../screens/Inventory/InventoryForm/inventoryFormSlice';
import { inventoryDetailSlice } from '../screens/Inventory/InventoryDetail/inventoryDetailSlice';
import { adjustmentSlice } from '../screens/Inventory/Adjustment/adjustmentSlice';
import { physicalCountSlice } from '../screens/Inventory/PhysicalCount/physicalCountSlice';
import { stockTransferSlice } from '../screens/Inventory/StockTransfer/stockTransferSlice';
import { agencyListSlice } from '../screens/Agency/AgencyList/agencyListSlice';
import { agencyDetailSlice } from '../screens/Agency/AgencyDetail/agencyDetailSlice';
import { agencyFormSlice } from '../screens/Agency/AgencyForm/agencyFormSlice';
import { agencyInventorySyncSlice } from '../screens/Agency/AgencyInventorySync/agencyInventorySyncSlice';
import { customerListSlice } from '../screens/Customers/CustomerList/customerListSlice';
import { customerFormSlice } from '../screens/Customers/CustomerForm/customerFormSlice';
import { customerDetailSlice } from '../screens/Customers/CustomerDetail/customerDetailSlice';
import { invoiceListSlice } from '../screens/Invoices/InvoiceList/invoiceListSlice';
import { invoiceFormSlice } from '../screens/Invoices/InvoiceForm/invoiceFormSlice';
import { invoiceDetailSlice } from '../screens/Invoices/InvoiceDetail/invoiceDetailSlice';
import { receivePaymentSlice } from '../screens/Payments/ReceivePayment/receivePaymentSlice';
import { estimateListSlice } from '../screens/Estimates/EstimateList/estimateListSlice';
import { estimateFormSlice } from '../screens/Estimates/EstimateForm/estimateFormSlice';
import { estimateDetailSlice } from '../screens/Estimates/EstimateDetail/estimateDetailSlice';
import { soListSlice } from '../screens/SalesOrders/SOList/soListSlice';
import { soFormSlice } from '../screens/SalesOrders/SOForm/soFormSlice';
import { soDetailSlice } from '../screens/SalesOrders/SODetail/soDetailSlice';
import { creditMemoListSlice } from '../screens/CreditMemos/CreditMemoList/creditMemoListSlice';
import { creditMemoFormSlice } from '../screens/CreditMemos/CreditMemoForm/creditMemoFormSlice';
import { vendorListSlice } from '../screens/Vendors/VendorList/vendorListSlice';
import { vendorFormSlice } from '../screens/Vendors/VendorForm/vendorFormSlice';
import { vendorDetailSlice } from '../screens/Vendors/VendorDetail/vendorDetailSlice';
import { billListSlice } from '../screens/Bills/BillList/billListSlice';
import { billFormSlice } from '../screens/Bills/BillForm/billFormSlice';
import { billDetailSlice } from '../screens/Bills/BillDetail/billDetailSlice';
import { payBillsSlice } from '../screens/Bills/PayBills/payBillsSlice';
import { vendorCreditFormSlice } from '../screens/Bills/VendorCreditForm/vendorCreditFormSlice';
import { poListSlice } from '../screens/PurchaseOrders/POList/poListSlice';
import { poFormSlice } from '../screens/PurchaseOrders/POForm/poFormSlice';
import { poDetailSlice } from '../screens/PurchaseOrders/PODetail/poDetailSlice';
import { deliverySlice } from '../screens/Delivery/Admin/AssignDeliveries/deliverySlice';
import { notificationCenterSlice } from '../screens/Notifications/notificationCenterSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  company: companyReducer,
  appContainer: appContainerSlice.reducer,
  notificationCenter: notificationCenterSlice.reducer,
  signIn: signInSlice.reducer,
  signUp: signUpSlice.reducer,
  forgotPassword: forgotPasswordSlice.reducer,
  emailVerification: emailVerificationSlice.reducer,
  onboarding: onboardingSlice.reducer,
  roleSelection: roleSelectionSlice.reducer,
  companySetup: companySetupSlice.reducer,
  createCompany: createCompanySlice.reducer,
  joinCompany: joinCompanySlice.reducer,
  deliveryOnboarding: deliveryOnboardingSlice.reducer,
  dpDashboard: dpDashboardSlice.reducer,
  dpDeliveryList: dpDeliveryListSlice.reducer,
  dpDeliveryDetail: dpDeliveryDetailSlice.reducer,
  dpInventory: dpInventorySlice.reducer,
  dpProfile: dpProfileSlice.reducer,
  dpShadowInventory: dpShadowInventorySlice.reducer,
  dpHistory: dpHistorySlice.reducer,
  dpSettings: dpSettingsSlice.reducer,
  dpSignatureCapture: dpSignatureCaptureSlice.reducer,
  dpCustomerConfirm: dpCustomerConfirmSlice.reducer,
  dpDeliveryComplete: dpDeliveryCompleteSlice.reducer,
  deliveryPersonnelList: deliveryPersonnelListSlice.reducer,
  addDeliveryPersonnel: addDeliveryPersonnelSlice.reducer,
  deliveryPersonnelDetail: deliveryPersonnelDetailSlice.reducer,
  assignDeliveries: assignDeliveriesSlice.reducer,
  createDeliveryScreen: createDeliveryScreenSlice.reducer,
  assignWork: assignWorkSlice.reducer,
  deliveryMonitor: deliveryMonitorSlice.reducer,
  adminDeliveryDetail: adminDeliveryDetailSlice.reducer,
  inventoryApproval: inventoryApprovalSlice.reducer,
  delivery: deliverySlice.reducer,
  adminDashboard: adminDashboardSlice.reducer,
  coaList: coaListSlice.reducer,
  coaForm: coaFormSlice.reducer,
  coaDetail: coaDetailSlice.reducer,
  gl: glSlice.reducer,
  jeList: jeListSlice.reducer,
  jeForm: jeFormSlice.reducer,
  jeDetail: jeDetailSlice.reducer,
  inventoryList: inventoryListSlice.reducer,
  inventoryForm: inventoryFormSlice.reducer,
  inventoryDetail: inventoryDetailSlice.reducer,
  adjustment: adjustmentSlice.reducer,
  physicalCount: physicalCountSlice.reducer,
  stockTransfer: stockTransferSlice.reducer,
  agencyList: agencyListSlice.reducer,
  agencyDetail: agencyDetailSlice.reducer,
  agencyForm: agencyFormSlice.reducer,
  agencyInventorySync: agencyInventorySyncSlice.reducer,
  customerList: customerListSlice.reducer,
  customerForm: customerFormSlice.reducer,
  customerDetail: customerDetailSlice.reducer,
  invoiceList: invoiceListSlice.reducer,
  invoiceForm: invoiceFormSlice.reducer,
  invoiceDetail: invoiceDetailSlice.reducer,
  receivePayment: receivePaymentSlice.reducer,
  estimateList: estimateListSlice.reducer,
  estimateForm: estimateFormSlice.reducer,
  estimateDetail: estimateDetailSlice.reducer,
  soList: soListSlice.reducer,
  soForm: soFormSlice.reducer,
  soDetail: soDetailSlice.reducer,
  creditMemoList: creditMemoListSlice.reducer,
  creditMemoForm: creditMemoFormSlice.reducer,
  vendorList: vendorListSlice.reducer,
  vendorForm: vendorFormSlice.reducer,
  vendorDetail: vendorDetailSlice.reducer,
  billList: billListSlice.reducer,
  billForm: billFormSlice.reducer,
  billDetail: billDetailSlice.reducer,
  payBills: payBillsSlice.reducer,
  vendorCreditForm: vendorCreditFormSlice.reducer,
  poList: poListSlice.reducer,
  poForm: poFormSlice.reducer,
  poDetail: poDetailSlice.reducer,
});

const persistConfig = {
  key: 'finmatrix-root',
  storage: AsyncStorage,
  whitelist: ['auth', 'company'],
  stateReconciler: autoMergeLevel2 as any,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(realtimeMiddleware),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
