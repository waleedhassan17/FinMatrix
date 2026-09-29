// ═══════════════════════════════════════════════════════
// FinMatrix — DPDashboard navigation map
// ═══════════════════════════════════════════════════════
// Route list for DPDashboardStack (Consultant_Mobile convention): the
// navigator maps over this array — screens register here only.

import type { IRoute } from './types';
import DPDashboardScreen from '../screens/Delivery/Personnel/DPDashboard/DPDashboardScreen';
import DPDeliveryDetailScreen from '../screens/Delivery/Personnel/DPDeliveryDetail/DPDeliveryDetailScreen';
import BillPhotoCaptureScreen from '../screens/Delivery/Personnel/BillPhotoCapture/BillPhotoCaptureScreen';
import CustomerConfirmScreen from '../screens/Delivery/Personnel/CustomerConfirm/CustomerConfirmScreen';
import DeliveryCompleteScreen from '../screens/Delivery/Personnel/DeliveryComplete/DeliveryCompleteScreen';
import DPHistoryScreen from '../screens/Delivery/Personnel/DPHistory/DPHistoryScreen';

export const DPDashboardRouteNames = {
  DPDashboard: 'DPDashboard',
  DPDeliveryDetail: 'DPDeliveryDetail',
  BillPhotoCapture: 'BillPhotoCapture',
  CustomerConfirm: 'CustomerConfirm',
  DeliveryComplete: 'DeliveryComplete',
  DPHistory: 'DPHistory',
} as const;

export type DPDashboardRouteName = typeof DPDashboardRouteNames[keyof typeof DPDashboardRouteNames];

export const DP_DASHBOARD_ROUTES: IRoute[] = [
  { title: DPDashboardRouteNames.DPDashboard, component: DPDashboardScreen },
  { title: DPDashboardRouteNames.DPDeliveryDetail, component: DPDeliveryDetailScreen },
  { title: DPDashboardRouteNames.BillPhotoCapture, component: BillPhotoCaptureScreen },
  { title: DPDashboardRouteNames.CustomerConfirm, component: CustomerConfirmScreen },
  { title: DPDashboardRouteNames.DeliveryComplete, component: DeliveryCompleteScreen },
  // Delivery history — its home is the Profile tab; registered here too so
  // "View all" opens it on this tab and back returns here (QA #14, #15).
  { title: DPDashboardRouteNames.DPHistory, component: DPHistoryScreen },
];
