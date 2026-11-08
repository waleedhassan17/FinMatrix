import React from 'react';
import { ScrollView } from 'react-native';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { selectFeatures, selectUser } from '../Auth/authSlice';
import { isFeatureVisible } from '../../utils/featureGates';
import { getCustomersAPI } from '../../networks/sales/customerNetwork';
import { getVendorsAPI } from '../../networks/purchases/vendorNetwork';
import { listPaginationOf } from '../../models/documentListModel';
import { selectUnassignedDeliveries } from '../Delivery/Admin/AssignDeliveries/deliverySlice';
import {
  fetchPendingCount,
  selectPendingApprovalCount,
} from '../Approvals/approvalsSlice';
import { ReportContainer, ReportHeader } from '../../components/reports/ReportUI';
import { HubRow, HubSection, hubContentStyle, type HubCountTone } from '../../components/shared/HubList';
import type { MoreStackParamList } from '../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

export interface MoreRow {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  /** One line, at most HUB_SUBTITLE_MAX characters. */
  subtitle: string;
  /**
   * Shows a count before the chevron. `neutral` is a plain total; `alert` is
   * work waiting on the owner. Only an alert is red: Customers "8" in a red
   * dot read as eight problems when it was eight customers.
   */
  count?: HubCountTone;
  onPress: (nav: Nav) => void;
  /** Three-tier model: row only shows when this feature is on (undefined = always). */
  feature?: string;
}

interface MoreSection {
  title: string;
  rows: MoreRow[];
}

export const SECTIONS: MoreSection[] = [
  {
    title: 'ACCOUNTING',
    rows: [
      {
        key: 'coa', icon: 'list',
        label: 'Chart of Accounts',
        subtitle: 'Accounts, balances and categories',
        onPress: nav => nav.navigate('COAList'),
      },
      {
        key: 'reconcile', icon: 'check-square',
        label: 'Bank Reconciliation',
        subtitle: 'Match books to a bank statement',
        onPress: nav => nav.navigate('BankReconciliationList'),
        feature: 'bankReconciliation',
      },
    ]
  },
  {
    title: 'PEOPLE',
    rows: [
      {
        key: 'customers', icon: 'users',
        label: 'Customers',
        subtitle: 'Balances, invoices and contacts',
        count: 'neutral',
        onPress: nav => nav.navigate('CustomerList'),
      },
      {
        key: 'vendors', icon: 'shopping-bag',
        label: 'Vendors',
        subtitle: 'Balances, bills and payments',
        count: 'neutral',
        onPress: nav => nav.navigate('VendorList'),
      },
      {
        key: 'payroll', icon: 'briefcase',
        label: 'Employees & Payroll',
        subtitle: 'Staff, payroll runs and pay stubs',
        onPress: nav => nav.navigate('EmployeeList'),
        feature: 'payroll',
      },
    ]
  },
  {
    title: 'MONEY',
    rows: [
      // ── Tax Management: SHELVED for this release ──────────────────────
      // Commented out rather than deleted -- uncomment this row and the
      // TaxSettings registrations in navigations-maps/More.ts, Dashboard.ts,
      // tierRoutes.tsx and the SetupChecklist step to bring it back.
      //
      // Note while shelved: TaxSettingsScreen is the ONLY place in the app
      // that reads or writes company.salesTaxRegistered, so that flag is
      // frozen at its current value. It drives whether input tax on bills is
      // reclaimed to 1300 Sales Tax Recoverable.
      // {
      //   key: 'tax', icon: 'percent',
      //   label: 'Tax Management',
      //   subtitle: 'Tax rates, liability report & payments',
      //   onPress: nav => nav.navigate('TaxSettings'),
      // },
      // Tax Management was the owner's only route into tax, and the books
      // carry real unremitted sales tax on 2300. Without this row the OWNER
      // could not see or settle a liability that staff can still see.
      {
        key: 'taxLiability', icon: 'percent',
        label: 'Tax Liability',
        subtitle: 'Tax owed, and record a payment',
        onPress: nav => nav.navigate('TaxLiability'),
      },
    ]
  },
  {
    title: 'OPERATIONS',
    rows: [
      {
        key: 'delivery', icon: 'truck',
        label: 'Delivery Management',
        subtitle: 'Assign, track and approve',
        count: 'alert',
        onPress: nav => nav.navigate('AssignDeliveries'),
        feature: 'delivery',
      },
      {
        key: 'personnel', icon: 'user-plus',
        label: 'Delivery Personnel',
        subtitle: 'Riders and their logins',
        onPress: nav => nav.navigate('DeliveryPersonnelList'),
        feature: 'delivery',
      },
      {
        key: 'agencies', icon: 'box',
        label: 'Warehouse Agencies',
        subtitle: 'Agencies, stock and sync',
        onPress: nav => nav.navigate('AgencyList'),
        feature: 'agencies',
      },
    ]
  },
  {
    title: 'TEAM',
    rows: [
      {
        key: 'approvals', icon: 'inbox',
        label: 'Staff Approvals',
        subtitle: 'Requests waiting on you',
        count: 'alert',
        onPress: nav => nav.navigate('StaffApprovals'),
        feature: 'multiUser',
      },
      {
        key: 'users', icon: 'user-check',
        label: 'User Management',
        subtitle: 'Staff, roles and logins',
        onPress: nav => nav.navigate('UserManagement'),
        feature: 'multiUser',
      },
    ]
  },
  {
    title: 'SYSTEM',
    rows: [
      {
        key: 'settings', icon: 'settings',
        label: 'Settings',
        subtitle: 'Company and app preferences',
        onPress: nav => nav.navigate('Settings'),
      },
    ]
  },
];

const MoreHubScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  // Three-tier model: hide rows the company's tier can't open (server 403s
  // are the real enforcement; this keeps the UX free of dead links). Legacy
  // sessions without flags see everything; warehouse-only rows are hard-gated
  // by company type (see featureGates.ts).
  const features = useAppSelector(selectFeatures);
  const companyType = useAppSelector(selectUser)?.companyType;
  const sections = SECTIONS.map(section => ({
    ...section,
    rows: section.rows.filter(r => isFeatureVisible(r.feature, features, companyType))
  })).filter(section => section.rows.length > 0);

  // How many there are — the server's totals. These counted the rows the
  // Customers and Vendors screens happened to have loaded: "50", or 0 before
  // either screen was opened.
  const [customerCount, setCustomerCount] = React.useState(0);
  const [vendorCount, setVendorCount] = React.useState(0);
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      getCustomersAPI({ page: 1, limit: 1 })
        .then(p => { if (alive) setCustomerCount(listPaginationOf(p, 0).total); })
        .catch(() => {});
      getVendorsAPI({ page: 1, limit: 1 })
        .then(p => { if (alive) setVendorCount(listPaginationOf(p, 0).total); })
        .catch(() => {});
      return () => { alive = false; };
    }, []),
  );
  const pendingDeliveries = useAppSelector(selectUnassignedDeliveries).length;
  const pendingApprovals = useAppSelector(selectPendingApprovalCount);

  // Refresh the badge whenever the hub comes back into view, so a request that
  // arrived while the owner was elsewhere shows up without a manual reload.
  const dispatch = useAppDispatch();
  useFocusEffect(
    React.useCallback(() => {
      dispatch(fetchPendingCount());
    }, [dispatch]),
  );

  const getBadge = (key: string): number => {
    switch (key) {
      case 'customers': return customerCount;
      case 'vendors': return vendorCount;
      case 'delivery': return pendingDeliveries;
      case 'approvals': return pendingApprovals;
      default: return 0;
    }
  };

  return (
    <ReportContainer>
      <ReportHeader title="More" subtitle="Tools, modules & settings" />
      <ScrollView contentContainerStyle={hubContentStyle} showsVerticalScrollIndicator={false}>
        {sections.map(section => (
          <HubSection key={section.title} title={section.title}>
            {section.rows.map((row, idx) => (
              <HubRow
                key={row.key}
                icon={row.icon}
                title={row.label}
                subtitle={row.subtitle}
                count={row.count ? getBadge(row.key) : 0}
                countTone={row.count}
                onPress={() => row.onPress(navigation)}
                last={idx === section.rows.length - 1}
              />
            ))}
          </HubSection>
        ))}
      </ScrollView>
    </ReportContainer>
  );
};

export default MoreHubScreen;
