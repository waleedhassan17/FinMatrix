// ═══════════════════════════════════════════════════════
// FinMatrix — InventoryStack (dumb mapper over navigations-maps/Inventory)
// ═══════════════════════════════════════════════════════
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { INVENTORY_ROUTES } from '../../navigations-maps/Inventory';

export type InventoryStackParamList = {
  InventoryList: undefined;
  InventoryForm: { itemId?: string } | undefined;
  InventoryDetail: { itemId: string };
  Adjustment: { itemId?: string } | undefined;
  PhysicalCount: undefined;
  StockTransfer: undefined;
};

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
