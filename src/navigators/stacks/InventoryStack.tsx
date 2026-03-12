import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InventoryHubScreen from '../../screens/Inventory/InventoryHubScreen';

export type InventoryStackParamList = {
  InventoryHub: undefined;
};

const Stack = createNativeStackNavigator<InventoryStackParamList>();

const InventoryStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="InventoryHub" component={InventoryHubScreen} />
  </Stack.Navigator>
);

export default InventoryStack;
