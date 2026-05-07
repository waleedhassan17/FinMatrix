import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InventoryListScreen from '../../screens/Inventory/InventoryList/InventoryListScreen';
import InventoryFormScreen from '../../screens/Inventory/InventoryForm/InventoryFormScreen';
import InventoryDetailScreen from '../../screens/Inventory/InventoryDetail/InventoryDetailScreen';
import AdjustmentScreen from '../../screens/Inventory/Adjustment/AdjustmentScreen';
import PhysicalCountScreen from '../../screens/Inventory/PhysicalCount/PhysicalCountScreen';
import StockTransferScreen from '../../screens/Inventory/StockTransfer/StockTransferScreen';

export type InventoryStackParamList = {
  InventoryList: undefined;
  InventoryForm: { itemId?: string } | undefined;
  InventoryDetail: { itemId: string };
  Adjustment: { itemId?: string } | undefined;
  PhysicalCount: undefined;
  StockTransfer: undefined;
};

const Stack = createNativeStackNavigator<InventoryStackParamList>();

const InventoryStack: React.FC = () => (
  <Stack.Navigator id="InventoryStack" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="InventoryList" component={InventoryListScreen} />
    <Stack.Screen name="InventoryForm" component={InventoryFormScreen} />
    <Stack.Screen name="InventoryDetail" component={InventoryDetailScreen} />
    <Stack.Screen name="Adjustment" component={AdjustmentScreen} />
    <Stack.Screen name="PhysicalCount" component={PhysicalCountScreen} />
    <Stack.Screen name="StockTransfer" component={StockTransferScreen} />
  </Stack.Navigator>
);

export default InventoryStack;
