// ═══════════════════════════════════════════════════════
// FinMatrix — Transactions Hub
// Sales, purchases and journal entry points, drawn with the shared hub list
// (components/shared/HubList) so this tab reads like Reports and More.
// ═══════════════════════════════════════════════════════

import React from 'react';
import { ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppSelector } from '../../hooks/useReduxHooks';
import { selectFeatures, selectUser } from '../Auth/authSlice';
import { isFeatureVisible } from '../../utils/featureGates';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';
import { ReportContainer, ReportHeader } from '../../components/reports/ReportUI';
import { HubRow, HubSection, hubContentStyle } from '../../components/shared/HubList';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;

export interface TransactionHubRow {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  /** One line, at most HUB_SUBTITLE_MAX characters. */
  subtitle: string;
  onPress: (nav: Nav) => void;
  /** Three-tier model: row only shows when this feature is on (undefined = always). */
  feature?: string;
}

export const SALES_ROWS: TransactionHubRow[] = [
  {
    key: 'estimates',
    icon: 'edit-3',
    label: 'Estimates',
    subtitle: 'Quotes you can convert to a sale',
    onPress: nav => nav.navigate('EstimateList'),
  },
  {
    key: 'salesOrders',
    icon: 'clipboard',
    label: 'Sales Orders',
    subtitle: 'Orders to fulfil and invoice',
    onPress: nav => nav.navigate('SalesOrderList'),
    feature: 'salesOrders',
  },
  {
    key: 'invoices',
    icon: 'file-text',
    label: 'Invoices',
    subtitle: "Bill customers, track what's paid",
    onPress: nav => nav.navigate('InvoiceList'),
  },
  {
    key: 'payments',
    icon: 'dollar-sign',
    label: 'Receive Payments',
    subtitle: 'Record money from customers',
    onPress: nav => nav.navigate('ReceivePayment'),
  },
  {
    key: 'creditMemos',
    icon: 'rotate-ccw',
    label: 'Credit Memos',
    subtitle: 'Credits and refunds to customers',
    onPress: nav => nav.navigate('CreditMemoList'),
  },
];

export const PURCHASE_ROWS: TransactionHubRow[] = [
  {
    key: 'bills',
    icon: 'file',
    label: 'Bills',
    subtitle: 'Vendor bills and expenses',
    onPress: nav => nav.navigate('BillList'),
  },
  {
    key: 'payBills',
    icon: 'credit-card',
    label: 'Pay Bills',
    subtitle: 'Record payments to vendors',
    onPress: nav => nav.navigate('PayBills'),
  },
  {
    key: 'purchaseOrders',
    icon: 'shopping-cart',
    label: 'Purchase Orders',
    subtitle: 'Order stock from vendors',
    onPress: nav => nav.navigate('POList'),
    feature: 'purchaseOrders',
  },
  {
    key: 'vendorCredits',
    icon: 'corner-up-left',
    label: 'Vendor Credits',
    subtitle: 'Returns and credits from vendors',
    onPress: nav => nav.navigate('VendorCreditList'),
  },
];

export const ACCOUNTING_ROWS: TransactionHubRow[] = [
  {
    key: 'generalJournal',
    icon: 'book-open',
    label: 'General Journal',
    subtitle: 'Manual double-entry postings',
    onPress: nav => nav.navigate('JournalEntryList'),
  },
];

const TransactionsHubScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  // Feature-filtered rows (three-tier model): legacy sessions (no flags)
  // see everything, matching the server's fully-unlocked fallback;
  // warehouse-only rows are hard-gated by company type (featureGates.ts).
  const features = useAppSelector(selectFeatures);
  const companyType = useAppSelector(selectUser)?.companyType;
  const sections = [
    { title: 'Sales', rows: SALES_ROWS },
    { title: 'Purchases', rows: PURCHASE_ROWS },
    { title: 'Accounting', rows: ACCOUNTING_ROWS },
  ]
    .map(s => ({ ...s, rows: s.rows.filter(r => isFeatureVisible(r.feature, features, companyType)) }))
    .filter(s => s.rows.length > 0);

  return (
    <ReportContainer>
      <ReportHeader title="Transactions" subtitle="Sales & purchases" />
      <ScrollView contentContainerStyle={hubContentStyle} showsVerticalScrollIndicator={false}>
        {sections.map(section => (
          <HubSection key={section.title} title={section.title}>
            {section.rows.map((row, i) => (
              <HubRow
                key={row.key}
                icon={row.icon}
                title={row.label}
                subtitle={row.subtitle}
                onPress={() => row.onPress(navigation)}
                last={i === section.rows.length - 1}
              />
            ))}
          </HubSection>
        ))}
      </ScrollView>
    </ReportContainer>
  );
};

export default TransactionsHubScreen;
