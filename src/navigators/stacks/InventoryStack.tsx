// ═══════════════════════════════════════════════════════
// FinMatrix — InventoryStack (dumb mapper over navigations-maps/Inventory)
// ═══════════════════════════════════════════════════════
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { INVENTORY_ROUTES } from '../../navigations-maps/Inventory';
import type { SharedRecordParamList } from './sharedRecordParams';

export type InventoryStackParamList = {
  InventoryList: undefined;
  // An item's detail, its forms, its purchase orders and everything those open
  // are the shared record screens, registered here so back returns to the item
  // instead of popping into the Transactions tab. See navigations-maps/sharedRecords.
} & SharedRecordParamList;

const Stack = createNativeStackNavigator();

const InventoryStack: React.FC = () => (
  <Stack.Navigator id="InventoryStack" screenOptions={{ headerShown: false }}>
    {INVENTORY_ROUTES.map(route => (
      <Stack.Screen
        key={route.title}
        name={route.title}
        component={route.component}
        options={route.options}
      />
    ))}
  </Stack.Navigator>
);

export default InventoryStack;
