// ═══════════════════════════════════════════════════════
// FinMatrix — Transactions Hub (Final)
// Sales section + Purchases section (placeholders)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;

interface HubRow {
  key: string;
  icon: string;
  label: string;
  subtitle: string;
  onPress: (nav: Nav) => void;
  disabled?: boolean;
}

const SALES_ROWS: HubRow[] = [
  {
    key: 'invoices',
    icon: '🧾',
    label: 'Invoices',
    subtitle: 'Create, send, and track customer invoices',
    onPress: nav => nav.navigate('InvoiceList'),
  },
  {
    key: 'estimates',
    icon: '📋',
    label: 'Estimates',
    subtitle: 'Prepare and send quotes to customers',
    onPress: nav => nav.navigate('EstimateList'),
  },
  {
    key: 'salesOrders',
    icon: '📦',
    label: 'Sales Orders',
    subtitle: 'Track orders and fulfillment progress',
    onPress: nav => nav.navigate('SOList'),
  },
  {
    key: 'creditMemos',
    icon: '🔄',
    label: 'Credit Memos',
    subtitle: 'Issue credits for returns or adjustments',
    onPress: nav => nav.navigate('CreditMemoList'),
  },
  {
    key: 'payments',
    icon: '💳',
    label: 'Receive Payments',
    subtitle: 'Record and allocate customer payments',
    onPress: nav => nav.navigate('ReceivePayment'),
  },
];

const PURCHASE_ROWS: HubRow[] = [
  {
    key: 'bills',
    icon: '📄',
    label: 'Bills',
    subtitle: 'Manage vendor bills and expenses',
    onPress: nav => nav.navigate('BillList'),
  },
  {
    key: 'payBills',
    icon: '💰',
    label: 'Pay Bills',
    subtitle: 'Record payments to vendors',
    onPress: nav => nav.navigate('PayBills'),
  },
  {
    key: 'vendorCredits',
    icon: '🔁',
    label: 'Vendor Credits',
    subtitle: 'Track credits received from vendors',
    onPress: nav => nav.navigate('VendorCreditForm'),
  },
  {
    key: 'purchaseOrders',
    icon: '📝',
    label: 'Purchase Orders',
    subtitle: 'Create and track vendor purchase orders',
    onPress: nav => nav.navigate('POList'),
  },
];

const TransactionsHubScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const renderRow = (row: HubRow) => (
    <TouchableOpacity
      key={row.key}
      style={[styles.row, row.disabled && styles.rowDisabled]}
      activeOpacity={row.disabled ? 1 : 0.6}
      onPress={() => !row.disabled && row.onPress(navigation)}
    >
      <View style={[styles.rowIcon, row.disabled && styles.rowIconDisabled]}>
        <Text style={styles.rowIconText}>{row.icon}</Text>
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, row.disabled && styles.rowLabelDisabled]}>{row.label}</Text>
        <Text style={styles.rowSubtitle}>
          {row.disabled ? 'Coming soon' : row.subtitle}
        </Text>
      </View>
      {!row.disabled && <Text style={styles.chevron}>›</Text>}
      {row.disabled && (
        <View style={styles.soonBadge}>
          <Text style={styles.soonBadgeText}>Soon</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sales section */}
        <Text style={styles.sectionHeader}>Sales</Text>
        <View style={styles.sectionCard}>
          {SALES_ROWS.map(renderRow)}
        </View>

        {/* Purchases section */}
        <Text style={styles.sectionHeader}>Purchases</Text>
        <View style={styles.sectionCard}>
          {PURCHASE_ROWS.map(renderRow)}
        </View>

        <View style={{ height: spacing.xl * 2 }} />
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
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowDisabled: { opacity: 0.5 },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: colors.primary + '0C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rowIconDisabled: { backgroundColor: colors.border + '60' },
  rowIconText: { fontSize: 19 },
  rowContent: { flex: 1, marginRight: spacing.sm },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    marginBottom: 1,
  },
  rowLabelDisabled: { color: colors.textSecondary },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textLight,
  },
  soonBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  soonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: typography.fontFamily,
  },
});

export default TransactionsHubScreen;
