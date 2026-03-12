import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MoreHubScreen from '../../screens/More/MoreHubScreen';
import COAListScreen from '../../screens/ChartOfAccounts/COAList/COAListScreen';
import COAFormScreen from '../../screens/ChartOfAccounts/COAForm/COAFormScreen';
import COADetailScreen from '../../screens/ChartOfAccounts/COADetail/COADetailScreen';
import GLScreen from '../../screens/GeneralLedger/GLScreen';
import JEListScreen from '../../screens/JournalEntries/JEList/JEListScreen';
import JEFormScreen from '../../screens/JournalEntries/JEForm/JEFormScreen';
import JEDetailScreen from '../../screens/JournalEntries/JEDetail/JEDetailScreen';

export type MoreStackParamList = {
  MoreHub: undefined;
  COAList: undefined;
  COAForm: { accountId?: string } | undefined;
  COADetail: { accountId: string };
  GeneralLedger: undefined;
  JEList: undefined;
  JEForm: { entryId?: string } | undefined;
  JEDetail: { entryId: string };
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

const MoreStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MoreHub" component={MoreHubScreen} />
    <Stack.Screen name="COAList" component={COAListScreen} />
    <Stack.Screen name="COAForm" component={COAFormScreen} />
    <Stack.Screen name="COADetail" component={COADetailScreen} />
    <Stack.Screen name="GeneralLedger" component={GLScreen} />
    <Stack.Screen name="JEList" component={JEListScreen} />
    <Stack.Screen name="JEForm" component={JEFormScreen} />
    <Stack.Screen name="JEDetail" component={JEDetailScreen} />
  </Stack.Navigator>
);

export default MoreStack;
