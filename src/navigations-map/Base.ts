export const ROUTES = {
  ONBOARDING: 'Onboarding',
  ROLE_SELECTION: 'RoleSelection',
  SIGN_IN: 'SignIn',
  SIGN_UP: 'SignUp',
  FORGOT_PASSWORD: 'ForgotPassword',
  EMAIL_VERIFICATION: 'EmailVerification',
  COMPANY_SETUP: 'CompanySetup',
  CREATE_COMPANY: 'CreateCompany',
  JOIN_COMPANY: 'JoinCompany',
  DELIVERY_ONBOARDING: 'DeliveryOnboarding',

  // Admin Tab Navigator
  ADMIN_TABS: 'AdminTabs',
  ADMIN_DASHBOARD: 'AdminDashboard',
  TRANSACTIONS_HUB: 'TransactionsHub',
  REPORTS_HUB: 'ReportsHub',
  INVENTORY_HUB: 'InventoryHub',
  MORE_HUB: 'MoreHub',

  // Admin Stacks (tab-level)
  DASHBOARD_STACK: 'DashboardStack',
  TRANSACTIONS_STACK: 'TransactionsStack',
  REPORTS_STACK: 'ReportsStack',
  INVENTORY_STACK: 'InventoryStack',
  MORE_STACK: 'MoreStack',

  // Delivery Tab Navigator
  DELIVERY_TABS: 'DeliveryTabs',
  DP_DASHBOARD: 'DPDashboard',
  DP_DELIVERIES: 'DPDeliveries',
  DP_INVENTORY: 'DPInventory',
  DP_PROFILE: 'DPProfile',

  // Delivery Stacks (tab-level)
  DP_DASHBOARD_STACK: 'DPDashboardStack',
  DP_DELIVERIES_STACK: 'DPDeliveriesStack',
  DP_INVENTORY_STACK: 'DPInventoryStack',
  DP_PROFILE_STACK: 'DPProfileStack',

  // Shared / nested
  DELIVERY_PERSONNEL_LIST: 'DeliveryPersonnelList',
  ADD_DELIVERY_PERSONNEL: 'AddDeliveryPersonnel',
  DELIVERY_PERSONNEL_DETAIL: 'DeliveryPersonnelDetail',
  COA_LIST: 'COAList',
} as const;
