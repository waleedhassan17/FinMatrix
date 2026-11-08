import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { selectFeatures, selectUser } from '../Auth/authSlice';
import { isFeatureVisible } from '../../utils/featureGates';
import { ReportContainer, ReportHeader } from '../../components/reports/ReportUI';
import { HubRow, HubSection, hubContentStyle, type HubCountTone } from '../../components/shared/HubList';
import {
  fetchPendingCount,
  selectPendingApprovalCount,
} from '../Approvals/approvalsSlice';
import { selectUnassignedDeliveries } from '../Delivery/Admin/AssignDeliveries/deliverySlice';
import type { StaffMoreRouteName } from '../../navigations-maps/StaffMore';

type Nav = NativeStackNavigationProp<Record<string, undefined>>;

export interface StaffRow {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  /** One line, at most HUB_SUBTITLE_MAX characters. */
  subtitle: string;
  route: StaffMoreRouteName;
  badge?: 'requests' | 'deliveries';
  feature?: string;
}

/**
 * A request the staff member sent is waiting on the owner, so its count is a
 * plain figure; a delivery nobody has assigned is this person's job, so it is
 * the one count drawn red.
 */
const BADGE_TONE: Record<NonNullable<StaffRow['badge']>, HubCountTone> = {
  requests: 'neutral',
  deliveries: 'alert',
};

interface StaffSection {
  title: string;
  rows: StaffRow[];
}

/**
 * The staff "More" hub.
 *
 * A separate screen from MoreHubScreen rather than the same one with rows
 * filtered: the two roles genuinely have different jobs, and the staff list is
 * short enough that hiding half of the owner's rows would read as a stripped
 * version of somebody else's screen instead of their own.
 *
 * There is deliberately no Settings, User management, Chart of Accounts or
 * approvals-inbox row — those routes are not even registered in the staff
 * navigator (see navigations-maps/StaffMore.ts).
 */
export const STAFF_SECTIONS: StaffSection[] = [
  {
    title: 'MY WORK',
    rows: [
      {
        key: 'my-requests',
        icon: 'send',
        label: 'My Requests',
        subtitle: 'Sent to the owner for approval',
        route: 'MyRequests',
        badge: 'requests',
      },
    ],
  },
  {
    title: 'DELIVERY',
    rows: [
      {
        key: 'assign',
        icon: 'truck',
        label: 'Assign Deliveries',
        subtitle: 'Plan one and put it on a rider',
        route: 'AssignDeliveries',
        badge: 'deliveries',
        feature: 'delivery',
      },
      {
        key: 'approvals',
        icon: 'check-square',
        label: 'Approve Completions',
        subtitle: 'Sign off finished deliveries',
        route: 'InventoryApproval',
        feature: 'delivery',
      },
      {
        key: 'monitor',
        icon: 'map',
        label: 'Delivery Monitor',
        subtitle: 'Where everything is right now',
        route: 'DeliveryMonitor',
        feature: 'delivery',
      },
      {
        key: 'personnel',
        icon: 'user-plus',
        label: 'Delivery Personnel',
        subtitle: 'Riders and their logins',
        route: 'DeliveryPersonnelList',
        feature: 'delivery',
      },
    ],
  },
  {
    title: 'PEOPLE',
    rows: [
      {
        key: 'customers',
        icon: 'users',
        label: 'Customers',
        subtitle: 'Customers and their balances',
        route: 'CustomerList',
      },
      {
        key: 'vendors',
        icon: 'shopping-bag',
        label: 'Vendors',
        subtitle: 'Suppliers you order from',
        route: 'VendorList',
      },
    ],
  },
  {
    title: 'REFERENCE',
    rows: [
      {
        key: 'tax',
        icon: 'percent',
        label: 'Tax Liability',
        subtitle: 'What is owed this period',
        route: 'TaxLiability',
      },
    ],
  },
  {
    title: 'ACCOUNT',
    rows: [
      // Replaces the Search row, which duplicated the search icon already in
      // the dashboard header. This is also the only way a staff member can
      // sign out -- before it there was none anywhere in their surface.
      {
        key: 'settings',
        icon: 'settings',
        label: 'Settings',
        subtitle: 'Your account and sign out',
        route: 'StaffSettings',
      },
    ],
  },
];

const StaffMoreHubScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const features = useAppSelector(selectFeatures);
  const companyType = useAppSelector(selectUser)?.companyType;
  const pendingRequests = useAppSelector(selectPendingApprovalCount);
  const pendingDeliveries = useAppSelector(selectUnassignedDeliveries).length;

  // Refresh the badge on focus — a request the owner approved while this sat
  // in the background should stop being counted.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchPendingCount());
    }, [dispatch]),
  );

  const sections = STAFF_SECTIONS.map(section => ({
    ...section,
    rows: section.rows.filter(r => isFeatureVisible(r.feature, features, companyType)),
  })).filter(section => section.rows.length > 0);

  const badgeFor = (row: StaffRow): number => {
    if (row.badge === 'requests') return pendingRequests;
    if (row.badge === 'deliveries') return pendingDeliveries;
    return 0;
  };

  return (
    <ReportContainer>
      <ReportHeader title="More" subtitle="Your tools and requests" />
      <ScrollView contentContainerStyle={hubContentStyle} showsVerticalScrollIndicator={false}>
        {sections.map(section => (
          <HubSection key={section.title} title={section.title}>
            {section.rows.map((row, idx) => (
              <HubRow
                key={row.key}
                icon={row.icon}
                title={row.label}
                subtitle={row.subtitle}
                count={badgeFor(row)}
                countTone={row.badge ? BADGE_TONE[row.badge] : 'neutral'}
                onPress={() => navigation.navigate(row.route as never)}
                last={idx === section.rows.length - 1}
              />
            ))}
          </HubSection>
        ))}
      </ScrollView>
    </ReportContainer>
  );
};

export default StaffMoreHubScreen;
