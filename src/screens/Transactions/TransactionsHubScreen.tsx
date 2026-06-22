// ═══════════════════════════════════════════════════════
// FinMatrix — Transactions Hub
// Sales + Purchases entry points (enterprise-consistent UI)
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../utils/theme';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';
import { ReportContainer, ReportHeader, SectionCard, ACCENT } from '../../components/reports/ReportUI';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;

interface HubRow {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  label: string;
  subtitle: string;
  onPress: (nav: Nav) => void;
}

const SALES_ROWS: HubRow[] = [
  {
    key: 'estimates',
    icon: 'edit-3',
    accent: ACCENT.blue,
    label: 'Estimates',
    subtitle: 'Create quotes; convert to invoice or sales order',
    onPress: nav => nav.navigate('EstimateList'),
  },
  {
    key: 'salesOrders',
    icon: 'clipboard',
    accent: ACCENT.amber,
    label: 'Sales Orders',
    subtitle: 'Track fulfillment and invoice orders',
    onPress: nav => nav.navigate('SalesOrderList'),
  },
  {
    key: 'invoices',
    icon: 'file-text',
    accent: ACCENT.brand,
    label: 'Invoices',
    subtitle: 'Create, send, and track customer invoices',
    onPress: nav => nav.navigate('InvoiceList'),
  },
  {
    key: 'payments',
    icon: 'dollar-sign',
    accent: ACCENT.green,
    label: 'Receive Payments',
    subtitle: 'Record and allocate customer payments',
    onPress: nav => nav.navigate('ReceivePayment'),
  },
];

const PURCHASE_ROWS: HubRow[] = [
  {
    key: 'bills',
    icon: 'file',
    accent: ACCENT.blue,
    label: 'Bills',
    subtitle: 'Manage vendor bills and expenses',
    onPress: nav => nav.navigate('BillList'),
  },
  {
    key: 'payBills',
    icon: 'credit-card',
    accent: ACCENT.violet,
    label: 'Pay Bills',
    subtitle: 'Record payments to vendors',
    onPress: nav => nav.navigate('PayBills'),
  },
  {
    key: 'purchaseOrders',
    icon: 'clipboard',
    accent: ACCENT.amber,
    label: 'Purchase Orders',
    subtitle: 'Create and track vendor purchase orders',
    onPress: nav => nav.navigate('POList'),
  },
];

const TransactionsHubScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const renderRow = (row: HubRow, last: boolean) => (
    <TouchableOpacity
      key={row.key}
      style={[styles.row, !last && styles.rowBordered]}
      activeOpacity={0.6}
      onPress={() => row.onPress(navigation)}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${row.accent}14` }]}>
        <Feather name={row.icon} size={18} color={row.accent} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{row.label}</Text>
        <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={THEME.colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <ReportContainer>
      <ReportHeader title="Transactions" subtitle="Sales & purchases" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionCard title="Sales" icon="trending-up">
          <View style={styles.list}>{SALES_ROWS.map((r, i) => renderRow(r, i === SALES_ROWS.length - 1))}</View>
        </SectionCard>

        <SectionCard title="Purchases" icon="shopping-cart">
          <View style={styles.list}>{PURCHASE_ROWS.map((r, i) => renderRow(r, i === PURCHASE_ROWS.length - 1))}</View>
        </SectionCard>

        <View style={{ height: THEME.spacing.xl }} />
      </ScrollView>
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  content: { padding: THEME.spacing.md, gap: THEME.spacing.sm + 2 },
  list: { marginHorizontal: -THEME.spacing.md, marginVertical: -THEME.spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 13,
  },
  rowBordered: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: THEME.colors.borderLight },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: THEME.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.sm,
  },
  rowContent: { flex: 1, marginRight: THEME.spacing.sm },
  rowLabel: { ...THEME.typography.h5, color: THEME.colors.textPrimary, marginBottom: 1 },
  rowSubtitle: { ...THEME.typography.caption, color: THEME.colors.textSecondary },
});

export default TransactionsHubScreen;
