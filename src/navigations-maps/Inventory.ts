// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory navigation map
// ═══════════════════════════════════════════════════════
// Route list for InventoryStack (Consultant_Mobile convention): the
// navigator maps over this array — screens register here only.

import type { IRoute } from './types';
import InventoryListScreen from '../screens/Inventory/InventoryList/InventoryListScreen';
import InventoryFormScreen from '../screens/Inventory/InventoryForm/InventoryFormScreen';
import InventoryDetailScreen from '../screens/Inventory/InventoryDetail/InventoryDetailScreen';
import AdjustmentScreen from '../screens/Inventory/Adjustment/AdjustmentScreen';

export const InventoryRouteNames = {
  InventoryList: 'InventoryList',
  InventoryForm: 'InventoryForm',
  InventoryDetail: 'InventoryDetail',
  Adjustment: 'Adjustment',
} as const;

export type InventoryRouteName = typeof InventoryRouteNames[keyof typeof InventoryRouteNames];

export const INVENTORY_ROUTES: IRoute[] = [
  { title: InventoryRouteNames.InventoryList, component: InventoryListScreen },
  { title: InventoryRouteNames.InventoryForm, component: InventoryFormScreen },
  { title: InventoryRouteNames.InventoryDetail, component: InventoryDetailScreen },
  { title: InventoryRouteNames.Adjustment, component: AdjustmentScreen },
];
