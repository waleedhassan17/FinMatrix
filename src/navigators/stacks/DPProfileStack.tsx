import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DPProfileScreen from '../../screens/Delivery/Personnel/DPProfileScreen';

export type DPProfileStackParamList = {
  DPProfile: undefined;
};

const Stack = createNativeStackNavigator<DPProfileStackParamList>();

const DPProfileStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DPProfile" component={DPProfileScreen} />
  </Stack.Navigator>
);

export default DPProfileStack;
