import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DPProfileScreen from '../../screens/Delivery/Personnel/DPProfile/DPProfileScreen';
import DPHistoryScreen from '../../screens/Delivery/Personnel/DPHistory/DPHistoryScreen';
import DPSettingsScreen from '../../screens/Delivery/Personnel/DPSettings/DPSettingsScreen';

export type DPProfileStackParamList = {
  DPProfile: undefined;
  DPHistory: undefined;
  DPSettings: undefined;
};

const Stack = createNativeStackNavigator<DPProfileStackParamList>();

const DPProfileStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DPProfile" component={DPProfileScreen} />
    <Stack.Screen name="DPHistory" component={DPHistoryScreen} />
    <Stack.Screen name="DPSettings" component={DPSettingsScreen} />
  </Stack.Navigator>
);

export default DPProfileStack;
