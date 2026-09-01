// ═══════════════════════════════════════════════════════
// FinMatrix — Staff "More" allow-list
// ═══════════════════════════════════════════════════════
// The route names staff may reach, and NOTHING ELSE.
//
// This file deliberately has no imports. StaffMore.ts pairs each name with a
// screen component, and its array is typed against StaffMoreRouteName, so a
// route that is not on this list cannot be registered — TypeScript rejects it
// before any test runs. Keeping the names separate also means the allow-list
// can be asserted without loading every screen (and with them, the whole Expo
// native stack) into a unit test.
//
// Left off on purpose — these are governance screens the server 403s for
// staff, and leaving the ROUTE out means a deep link or a stale navigation
// reference cannot reach them either:
//
//   Settings · CompanyProfile · CompanySwitcher
//   UserManagement
//   COAList · COAForm · COADetail
//   StaffApprovals            (the OWNER's inbox)
//   EmployeeList · Payroll*
//
// InventoryApproval IS on the list: signing off a rider's delivery is a staff
// action (Table B row 4), and it is not the owner's approvals inbox.

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

/** Every name staff may reach, as a plain array. */
export const STAFF_MORE_ROUTE_NAMES = Object.values(
  StaffMoreRouteNames,
) as StaffMoreRouteName[];

/**
 * Screens staff must never reach. Named explicitly rather than inferred as
 * "everything not on the list", so that adding a governance screen to the
 * admin stack without thinking about staff is caught by a failing test rather
 * than passing silently.
 */
export const STAFF_FORBIDDEN_ROUTES = [
  'Settings',
  'CompanyProfile',
  'CompanySwitcher',
  'UserManagement',
  'StaffApprovals',
  'COAList',
  'COAForm',
  'COADetail',
  'EmployeeList',
  'EmployeeForm',
  'PayrollRunList',
  'PayrollRunDetail',
] as const;
