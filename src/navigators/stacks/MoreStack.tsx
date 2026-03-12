import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MoreHubScreen from '../../screens/More/MoreHubScreen';
import COAListScreen from '../../screens/ChartOfAccounts/COAList/COAListScreen';
import COAFormScreen from '../../screens/ChartOfAccounts/COAForm/COAFormScreen';
import COADetailScreen from '../../screens/ChartOfAccounts/COADetail/COADetailScreen';

export type MoreStackParamList = {
  MoreHub: undefined;
  COAList: undefined;
  COAForm: { accountId?: string } | undefined;
  COADetail: { accountId: string };
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

const MoreStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MoreHub" component={MoreHubScreen} />
    <Stack.Screen name="COAList" component={COAListScreen} />
    <Stack.Screen name="COAForm" component={COAFormScreen} />
    <Stack.Screen name="COADetail" component={COADetailScreen} />
  </Stack.Navigator>
);

export default MoreStack;
