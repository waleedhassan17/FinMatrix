import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '../theme';
import { useAppSelector } from '../hooks/useReduxHooks';
import { selectUser } from '../screens/Auth/authSlice';
import { selectUnreadNotificationCountForUser } from '../screens/Notifications/notificationCenterSlice';
import NotificationBadge from '../components/NotificationBadge';

import DPDashboardStack from './stacks/DPDashboardStack';
import DPDeliveriesStack from './stacks/DPDeliveriesStack';
import DPInventoryStack from './stacks/DPInventoryStack';
import DPProfileStack from './stacks/DPProfileStack';

// ── Design Tokens ──
const ACTIVE = '#27AE60';
const INACTIVE = '#999999';
const TAB_HEIGHT = 64;
const ICON_BG_SIZE = 24;

type DeliveryTabParamList = {
  DPDashboardStack: undefined;
  DPDeliveriesStack: undefined;
  DPInventoryStack: undefined;
  DPProfileStack: undefined;
};

const Tab = createBottomTabNavigator<DeliveryTabParamList>();

const TabIcon: React.FC<{ label: string; focused: boolean; badgeCount?: number }> = ({
  label,
  focused,
  badgeCount = 0,
}) => (
  <View style={styles.iconWrapper}>
    {focused && <View style={styles.topIndicator} />}
    <View style={[styles.iconCircle, { backgroundColor: focused ? ACTIVE + '14' : '#F1F5F9' }]}>
      <Text style={[styles.iconText, { color: focused ? ACTIVE : INACTIVE }]}>{label}</Text>
    </View>
    <NotificationBadge count={badgeCount} />
  </View>
);

const DeliveryTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectUser);
  const unreadCount = useAppSelector(state =>
    selectUnreadNotificationCountForUser(state, 'delivery', user?.uid),
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: TAB_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E8ECF0',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          fontFamily: typography.fontFamily,
          marginTop: -2,
        },
        tabBarItemStyle: {
          paddingTop: 6,
        },
      }}>
      <Tab.Screen
        name="DPDashboardStack"
        component={DPDashboardStack}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="DSH" focused={focused} badgeCount={unreadCount} />
          ),
        }}
      />
      <Tab.Screen
        name="DPDeliveriesStack"
        component={DPDeliveriesStack}
        options={{
          tabBarLabel: 'Deliveries',
          tabBarIcon: ({ focused }) => <TabIcon label="DEL" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="DPInventoryStack"
        component={DPInventoryStack}
        options={{
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ focused }) => <TabIcon label="INV" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="DPProfileStack"
        component={DPProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon label="PRF" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    position: 'relative',
  },
  topIndicator: {
    position: 'absolute',
    top: -6,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: ACTIVE,
  },
  iconCircle: {
    width: ICON_BG_SIZE,
    height: ICON_BG_SIZE,
    borderRadius: ICON_BG_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: typography.fontFamily,
    letterSpacing: 0.4,
  },
});

export default DeliveryTabNavigator;
