// ═══════════════════════════════════════════════════════
// FinMatrix — Staff "More" navigation map
// ═══════════════════════════════════════════════════════
// The staff equivalent of More.ts, and deliberately an ALLOW-LIST rather than
// the admin list with rows hidden.
//
// Hiding a row still leaves the route registered, so anything holding a
// navigation reference — a deep link, a stale param, a shared component that
// calls navigate('Settings') — reaches a screen staff must not see. Screens
// left out of this array simply do not exist in the staff navigator, and
// navigating to one is a no-op instead of a leak. The server's 403s remain the
// real enforcement; this is the matching UX.
//
// NOT here, on purpose:
//   Settings, CompanyProfile, CompanySwitcher   governance
//   UserManagement                              governance
//   COAList / COAForm / COADetail               chart of accounts
//   StaffApprovals                              the OWNER's inbox
//   EmployeeList / Payroll*                     owner-only areas
//
// InventoryApproval IS here: approving a rider's delivery is a staff action
// (Table B row 4). It is not the owner's approvals inbox — that is the separate
// StaffApprovals screen above.

import type { IRoute } from './types';
import { isFeatureEnabled } from '../utils/featureGates';
import StaffMoreHubScreen from '../screens/More/StaffMoreHubScreen';
import CustomerListScreen from '../screens/Customers/CustomerList/CustomerListScreen';
import CustomerDetailScreen from '../screens/Customers/CustomerDetail/CustomerDetailScreen';
import CustomerFormScreen from '../screens/Customers/CustomerForm/CustomerFormScreen';
import VendorListScreen from '../screens/Vendors/VendorList/VendorListScreen';
import VendorDetailScreen from '../screens/Vendors/VendorDetail/VendorDetailScreen';
import VendorFormScreen from '../screens/Vendors/VendorForm/VendorFormScreen';
import AssignDeliveriesScreen from '../screens/Delivery/Admin/AssignDeliveries/AssignDeliveriesScreen';
import CreateDeliveryScreen from '../screens/Delivery/Admin/CreateDelivery/CreateDeliveryScreen';
import AssignWorkScreen from '../screens/Delivery/Admin/AssignWork/AssignWorkScreen';
import DeliveryMonitorScreen from '../screens/Delivery/Admin/DeliveryMonitor/DeliveryMonitorScreen';
import AdminDeliveryDetailScreen from '../screens/Delivery/Admin/AdminDeliveryDetail/AdminDeliveryDetailScreen';
import InventoryApprovalScreen from '../screens/Delivery/Admin/InventoryApproval/InventoryApprovalScreen';
import DeliveryPersonnelListScreen from '../screens/Delivery/Admin/DeliveryPersonnelList/DeliveryPersonnelListScreen';
import AddDeliveryPersonnelScreen from '../screens/Delivery/Admin/AddDeliveryPersonnel/AddDeliveryPersonnelScreen';
import DeliveryPersonnelDetailScreen from '../screens/Delivery/Admin/DeliveryPersonnelDetail/DeliveryPersonnelDetailScreen';
import BankReconciliationListScreen from '../screens/BankReconciliation/BankReconciliationListScreen';
import BankReconciliationScreen from '../screens/BankReconciliation/BankReconciliationScreen';
import BankReconciliationDetailScreen from '../screens/BankReconciliation/BankReconciliationDetailScreen';
import TaxLiabilityScreen from '../screens/Tax/TaxLiability/TaxLiabilityScreen';
import GlobalSearchScreen from '../screens/GlobalSearch/GlobalSearchScreen';
import MyRequestsScreen from '../screens/Approvals/MyRequestsScreen';

export const StaffMoreRouteNames = {
  StaffMoreHub: 'StaffMoreHub',
  MyRequests: 'MyRequests',
  CustomerList: 'CustomerList',
  CustomerDetail: 'CustomerDetail',
  CustomerForm: 'CustomerForm',
  VendorList: 'VendorList',
  VendorDetail: 'VendorDetail',
  VendorForm: 'VendorForm',
  AssignDeliveries: 'AssignDeliveries',
  CreateDelivery: 'CreateDelivery',
  AssignWork: 'AssignWork',
  DeliveryMonitor: 'DeliveryMonitor',
  AdminDeliveryDetail: 'AdminDeliveryDetail',
  InventoryApproval: 'InventoryApproval',
  DeliveryPersonnelList: 'DeliveryPersonnelList',
  AddDeliveryPersonnel: 'AddDeliveryPersonnel',
  DeliveryPersonnelDetail: 'DeliveryPersonnelDetail',
  BankReconciliationList: 'BankReconciliationList',
  BankReconciliation: 'BankReconciliation',
  BankReconciliationDetail: 'BankReconciliationDetail',
  TaxLiability: 'TaxLiability',
  GlobalSearch: 'GlobalSearch',
} as const;

export type StaffMoreRouteName =
  typeof StaffMoreRouteNames[keyof typeof StaffMoreRouteNames];

export const STAFF_MORE_ROUTES: IRoute[] = [
  { title: StaffMoreRouteNames.StaffMoreHub, component: StaffMoreHubScreen },
  { title: StaffMoreRouteNames.MyRequests, component: MyRequestsScreen },

  // People
  { title: StaffMoreRouteNames.CustomerList, component: CustomerListScreen },
  { title: StaffMoreRouteNames.CustomerDetail, component: CustomerDetailScreen },
  { title: StaffMoreRouteNames.CustomerForm, component: CustomerFormScreen },
  { title: StaffMoreRouteNames.VendorList, component: VendorListScreen },
  { title: StaffMoreRouteNames.VendorDetail, component: VendorDetailScreen },
  { title: StaffMoreRouteNames.VendorForm, component: VendorFormScreen },

  // Delivery — the staff working set, including signing off completions.
  ...(isFeatureEnabled('delivery')
    ? [
        { title: StaffMoreRouteNames.AssignDeliveries, component: AssignDeliveriesScreen },
        { title: StaffMoreRouteNames.CreateDelivery, component: CreateDeliveryScreen },
        { title: StaffMoreRouteNames.AssignWork, component: AssignWorkScreen },
        { title: StaffMoreRouteNames.DeliveryMonitor, component: DeliveryMonitorScreen },
        { title: StaffMoreRouteNames.AdminDeliveryDetail, component: AdminDeliveryDetailScreen },
        { title: StaffMoreRouteNames.InventoryApproval, component: InventoryApprovalScreen },
        { title: StaffMoreRouteNames.DeliveryPersonnelList, component: DeliveryPersonnelListScreen },
        { title: StaffMoreRouteNames.AddDeliveryPersonnel, component: AddDeliveryPersonnelScreen },
        { title: StaffMoreRouteNames.DeliveryPersonnelDetail, component: DeliveryPersonnelDetailScreen },
      ]
    : []),

  // Read-only reference
  { title: StaffMoreRouteNames.BankReconciliationList, component: BankReconciliationListScreen },
  { title: StaffMoreRouteNames.BankReconciliation, component: BankReconciliationScreen },
  { title: StaffMoreRouteNames.BankReconciliationDetail, component: BankReconciliationDetailScreen },
  { title: StaffMoreRouteNames.TaxLiability, component: TaxLiabilityScreen },
  { title: StaffMoreRouteNames.GlobalSearch, component: GlobalSearchScreen },
];
