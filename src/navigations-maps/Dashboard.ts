// ═══════════════════════════════════════════════════════
// FinMatrix — Dashboard navigation map
// ═══════════════════════════════════════════════════════
// Route list for DashboardStack (Consultant_Mobile convention): the
// navigator maps over this array — screens register here only.

import type { IRoute } from './types';
import AdminDashboardScreen from '../screens/HomeScreen/AdminDashboardScreen';
import DeliveryPersonnelListScreen from '../screens/Delivery/Admin/DeliveryPersonnelList/DeliveryPersonnelListScreen';
import AddDeliveryPersonnelScreen from '../screens/Delivery/Admin/AddDeliveryPersonnel/AddDeliveryPersonnelScreen';
import DeliveryPersonnelDetailScreen from '../screens/Delivery/Admin/DeliveryPersonnelDetail/DeliveryPersonnelDetailScreen';
import AssignDeliveriesScreen from '../screens/Delivery/Admin/AssignDeliveries/AssignDeliveriesScreen';
import CreateDeliveryScreen from '../screens/Delivery/Admin/CreateDelivery/CreateDeliveryScreen';
import AssignWorkScreen from '../screens/Delivery/Admin/AssignWork/AssignWorkScreen';
import DeliveryMonitorScreen from '../screens/Delivery/Admin/DeliveryMonitor/DeliveryMonitorScreen';
import AdminDeliveryDetailScreen from '../screens/Delivery/Admin/AdminDeliveryDetail/AdminDeliveryDetailScreen';
import InventoryApprovalScreen from '../screens/Delivery/Admin/InventoryApproval/InventoryApprovalScreen';
import GlobalSearchScreen from '../screens/GlobalSearch/GlobalSearchScreen';

export const DashboardRouteNames = {
  AdminDashboard: 'AdminDashboard',
  DeliveryPersonnelList: 'DeliveryPersonnelList',
  AddDeliveryPersonnel: 'AddDeliveryPersonnel',
  DeliveryPersonnelDetail: 'DeliveryPersonnelDetail',
  AssignDeliveries: 'AssignDeliveries',
  CreateDelivery: 'CreateDelivery',
  AssignWork: 'AssignWork',
  DeliveryMonitor: 'DeliveryMonitor',
  AdminDeliveryDetail: 'AdminDeliveryDetail',
  InventoryApproval: 'InventoryApproval',
  GlobalSearch: 'GlobalSearch',
} as const;

export type DashboardRouteName = typeof DashboardRouteNames[keyof typeof DashboardRouteNames];

export const DASHBOARD_ROUTES: IRoute[] = [
  { title: DashboardRouteNames.AdminDashboard, component: AdminDashboardScreen },
  { title: DashboardRouteNames.DeliveryPersonnelList, component: DeliveryPersonnelListScreen },
  { title: DashboardRouteNames.AddDeliveryPersonnel, component: AddDeliveryPersonnelScreen },
  { title: DashboardRouteNames.DeliveryPersonnelDetail, component: DeliveryPersonnelDetailScreen },
  { title: DashboardRouteNames.AssignDeliveries, component: AssignDeliveriesScreen },
  { title: DashboardRouteNames.CreateDelivery, component: CreateDeliveryScreen },
  { title: DashboardRouteNames.AssignWork, component: AssignWorkScreen },
  { title: DashboardRouteNames.DeliveryMonitor, component: DeliveryMonitorScreen },
  { title: DashboardRouteNames.AdminDeliveryDetail, component: AdminDeliveryDetailScreen },
  { title: DashboardRouteNames.InventoryApproval, component: InventoryApprovalScreen },
  { title: DashboardRouteNames.GlobalSearch, component: GlobalSearchScreen },
];
