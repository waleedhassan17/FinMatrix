import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../utils/theme';

// Design-system tokens (see src/theme/theme.ts).
const { colors, radius, shadows, spacing, typography } = THEME;
import { useAppSelector } from '../../hooks/useReduxHooks';
import { selectFeatures, selectUser } from '../Auth/authSlice';
import { isFeatureVisible } from '../../utils/featureGates';
import { selectCustomers } from '../Customers/CustomerList/customerListSlice';
import { selectVendors } from '../Vendors/VendorList/vendorListSlice';
import { selectUnassignedDeliveries } from '../Delivery/Admin/AssignDeliveries/deliverySlice';
import NotificationBadge from '../../components/shared/NotificationBadge';
import { ReportContainer, ReportHeader, HEADER_NAVY } from '../../components/reports/ReportUI';
import type { MoreStackParamList } from '../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

interface MoreRow {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  subtitle: string;
  badgeSelector?: string;
  onPress: (nav: Nav) => void;
  /** Three-tier model: row only shows when this feature is on (undefined = always). */
  feature?: string;
}

interface MoreSection {
  title: string;
  rows: MoreRow[];
}

/* ───────────── colour tokens for icon circles ───────────── */
const IC = {
  blueBg: colors.actionGreenLighter, blue: colors.actionGreen,
  greenBg: colors.successLighter, green: colors.success,
  amberBg: colors.warningLighter, amber: colors.warning,
  tealBg: colors.actionGreenLighter, teal: colors.info,
  purpleBg: colors.secondaryLight, purple: colors.secondary,
  redBg: colors.dangerLighter, red: colors.danger,
  indigoBg: colors.infoLight, indigo: colors.info,
  cyanBg: colors.actionGreenLighter, cyan: colors.info,
  orangeBg: colors.warningLighter, orange: colors.warning,
  grayBg: colors.neutral100, gray: colors.textSecondary
};

const SECTIONS: MoreSection[] = [
  {
    title: 'ACCOUNTING',
    rows: [
      {
        key: 'coa', icon: 'book-open', iconBg: IC.blueBg, iconColor: IC.blue,
        label: 'Chart of Accounts',
        subtitle: 'Manage accounts, balances & categories',
        onPress: nav => nav.navigate('COAList'),
      },
      {
        key: 'reconcile', icon: 'check-square', iconBg: IC.tealBg, iconColor: IC.teal,
        label: 'Bank Reconciliation',
        subtitle: 'Match cash/bank ledger to a statement',
        onPress: nav => nav.navigate('BankReconciliationList'),
        feature: 'bankReconciliation',
      },
    ]
  },
  {
    title: 'PEOPLE',
    rows: [
      {
        key: 'customers', icon: 'users', iconBg: IC.greenBg, iconColor: IC.green,
        label: 'Customers',
        subtitle: 'Manage customers, balances & invoices',
        badgeSelector: 'customers',
        onPress: nav => nav.navigate('CustomerList'),
      },
      {
        key: 'vendors', icon: 'shopping-bag', iconBg: IC.orangeBg, iconColor: IC.orange,
        label: 'Vendors',
        subtitle: 'Manage vendors, bills & payments',
        badgeSelector: 'vendors',
        onPress: nav => nav.navigate('VendorList'),
      },
      {
        key: 'payroll', icon: 'briefcase', iconBg: IC.purpleBg, iconColor: IC.purple,
        label: 'Employees & Payroll',
        subtitle: 'Staff, run payroll & pay stubs',
        onPress: nav => nav.navigate('EmployeeList'),
        feature: 'payroll',
      },
    ]
  },
  {
    title: 'MONEY',
    rows: [
      {
        key: 'tax', icon: 'percent', iconBg: IC.amberBg, iconColor: IC.amber,
        label: 'Tax Management',
        subtitle: 'Tax rates, liability report & payments',
        onPress: nav => nav.navigate('TaxSettings'),
      },
    ]
  },
  {
    title: 'OPERATIONS',
    rows: [
      {
        key: 'delivery', icon: 'truck', iconBg: IC.blueBg, iconColor: IC.blue,
        label: 'Delivery Management',
        subtitle: 'Assign, monitor & approve deliveries',
        badgeSelector: 'delivery',
        onPress: nav => nav.navigate('AssignDeliveries'),
        feature: 'delivery',
      },
      {
        key: 'personnel', icon: 'user-plus', iconBg: IC.purpleBg, iconColor: IC.purple,
        label: 'Delivery Personnel',
        subtitle: 'Add riders & assign login credentials',
        onPress: nav => nav.navigate('DeliveryPersonnelList'),
        feature: 'delivery',
      },
      {
        key: 'agencies', icon: 'box', iconBg: IC.amberBg, iconColor: IC.amber,
        label: 'Warehouse Agencies',
        subtitle: 'Manage agencies, inventory & sync',
        onPress: nav => nav.navigate('AgencyList'),
        feature: 'agencies',
      },
    ]
  },
  {
    title: 'SYSTEM',
    rows: [
      {
        key: 'settings', icon: 'settings', iconBg: IC.grayBg, iconColor: IC.gray,
        label: 'Settings',
        subtitle: 'Company, users, preferences & app config',
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

  const customerCount = useAppSelector(selectCustomers).length;
  const vendorCount = useAppSelector(selectVendors).length;
  const pendingDeliveries = useAppSelector(selectUnassignedDeliveries).length;

  const getBadge = (key: string): number => {
    switch (key) {
      case 'customers': return customerCount;
      case 'vendors': return vendorCount;
      case 'delivery': return pendingDeliveries;
      default: return 0;
    }
  };

  return (
    <ReportContainer>
      <ReportHeader title="More" subtitle="Tools, modules & settings" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.background }}>
        {sections.map(section => (
          <View key={section.title}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.rows.map((row, idx) => {
                const badge = row.badgeSelector ? getBadge(row.key) : 0;
                return (
                  <React.Fragment key={row.key}>
                    {idx > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.row}
                      activeOpacity={0.6}
                      onPress={() => row.onPress(navigation)}
                    >
                      <View style={[styles.rowIcon, { backgroundColor: row.iconBg }]}>
                        <Feather name={row.icon} size={20} color={row.iconColor} />
                        {badge > 0 && <NotificationBadge count={badge} />}
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={styles.rowLabel}>{row.label}</Text>
                        <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
    title: {
      ...THEME.typography.h2,
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
    },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    ...THEME.typography.labelSm,
    
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: spacing.xl,
    marginBottom: spacing.xxs,
    marginLeft: spacing.xxs,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadows.sm,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rowContent: { flex: 1, marginRight: spacing.xs },
  rowLabel: {
    ...THEME.typography.h4,
    
    color: colors.textPrimary,
    marginBottom: 2,
  },
  rowSubtitle: {
    ...THEME.typography.caption,
    color: colors.textSecondary,
  }
});

export default MoreHubScreen;
