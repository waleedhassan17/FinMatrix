import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { THEME } from '../../utils/theme';
import { useAppSelector } from '../../hooks/useReduxHooks';
import { selectCustomers } from '../Customers/CustomerList/customerListSlice';
import { selectVendors } from '../Vendors/VendorList/vendorListSlice';
import { selectEmployees } from '../Employees/EmployeeList/employeeListSlice';
import { selectUnassignedDeliveries } from '../Delivery/Admin/AssignDeliveries/deliverySlice';
import NotificationBadge from '../../components/NotificationBadge';
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
}

interface MoreSection {
  title: string;
  rows: MoreRow[];
}

/* ───────────── colour tokens for icon circles ───────────── */
const IC = {
  blueBg: '#EBF0F7', blue: '#1B3A5C',
  greenBg: '#E8F5E9', green: '#27AE60',
  amberBg: '#FFF8E1', amber: '#F39C12',
  tealBg: '#E0F7FA', teal: '#0891B2',
  purpleBg: '#F3E8FF', purple: '#7C3AED',
  redBg: '#FEE2E2', red: '#E74C3C',
  indigoBg: '#E8EAF6', indigo: '#3F51B5',
  cyanBg: '#E0F2F1', cyan: '#009688',
  orangeBg: '#FFF3E0', orange: '#E65100',
  grayBg: '#F1F3F5', gray: '#6B7280',
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
        key: 'gl', icon: 'layers', iconBg: IC.indigoBg, iconColor: IC.indigo,
        label: 'General Ledger',
        subtitle: 'View entries, balances & audit trail',
        onPress: nav => nav.navigate('GeneralLedger'),
      },
      {
        key: 'je', icon: 'edit-3', iconBg: IC.tealBg, iconColor: IC.teal,
        label: 'Journal Entries',
        subtitle: 'Create, post & manage journal entries',
        onPress: nav => nav.navigate('JEList'),
      },
    ],
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
        key: 'employees', icon: 'user-check', iconBg: IC.purpleBg, iconColor: IC.purple,
        label: 'Employees',
        subtitle: 'Team members, roles & departments',
        badgeSelector: 'employees',
        onPress: nav => nav.navigate('EmployeeList'),
      },
    ],
  },
  {
    title: 'MONEY',
    rows: [
      {
        key: 'banking', icon: 'credit-card', iconBg: IC.cyanBg, iconColor: IC.cyan,
        label: 'Banking',
        subtitle: 'Accounts, register, transfers & reconciliation',
        onPress: nav => nav.navigate('BankAccounts'),
      },
      {
        key: 'tax', icon: 'percent', iconBg: IC.amberBg, iconColor: IC.amber,
        label: 'Tax Management',
        subtitle: 'Tax rates, liability report & payments',
        onPress: nav => nav.navigate('TaxSettings'),
      },
    ],
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
      },
      {
        key: 'payroll', icon: 'dollar-sign', iconBg: IC.greenBg, iconColor: IC.green,
        label: 'Payroll Processing',
        subtitle: 'Run payroll, history & pay stubs',
        onPress: nav => nav.navigate('PayrollHistory'),
      },
      {
        key: 'agencies', icon: 'box', iconBg: IC.amberBg, iconColor: IC.amber,
        label: 'Warehouse Agencies',
        subtitle: 'Manage agencies, inventory & sync',
        onPress: nav => nav.navigate('AgencyList'),
      },
    ],
  },
  {
    title: 'SYSTEM',
    rows: [
      {
        key: 'audit', icon: 'activity', iconBg: IC.redBg, iconColor: IC.red,
        label: 'Audit Trail',
        subtitle: 'Track changes across all modules',
        onPress: nav => nav.navigate('AuditTrail'),
      },
      {
        key: 'settings', icon: 'settings', iconBg: IC.grayBg, iconColor: IC.gray,
        label: 'Settings',
        subtitle: 'Company, users, preferences & app config',
        onPress: nav => nav.navigate('Settings'),
      },
    ],
  },
];

const MoreHubScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const customerCount = useAppSelector(selectCustomers).length;
  const vendorCount = useAppSelector(selectVendors).length;
  const employeeCount = useAppSelector(selectEmployees).length;
  const pendingDeliveries = useAppSelector(selectUnassignedDeliveries).length;

  const getBadge = (key: string): number => {
    switch (key) {
      case 'customers': return customerCount;
      case 'vendors': return vendorCount;
      case 'employees': return employeeCount;
      case 'delivery': return pendingDeliveries;
      default: return 0;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {SECTIONS.map(section => (
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
                      <Feather name="chevron-right" size={18} color={colors.textLight} />
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    ...THEME.typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    ...shadows.card,
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
  rowContent: { flex: 1, marginRight: spacing.sm },
  rowLabel: {
    ...THEME.typography.bodyLg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  rowSubtitle: {
    ...THEME.typography.caption,
    color: colors.textSecondary,
  },
});

export default MoreHubScreen;
