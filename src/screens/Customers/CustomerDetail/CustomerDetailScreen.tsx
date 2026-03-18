// ═══════════════════════════════════════════════════════
// FinMatrix — Customer Detail Screen
// ═══════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectCustomers, toggleCustomerActive } from '../CustomerList/customerListSlice';
import {
  selectCustomerDetailTab,
  setActiveTab,
  resetCustomerDetail,
  type CustomerDetailTab,
} from './customerDetailSlice';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { PAYMENT_TERMS_LABELS } from '../../../models/customerModel';
import type { PaymentTerms, Customer } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type DetailRoute = RouteProp<MoreStackParamList, 'CustomerDetail'>;

const TABS: { key: CustomerDetailTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Payments' },
];

// ── Mock Invoices (filtered by customer) ──────────
interface MockInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'sent' | 'overdue' | 'draft';
}

const MOCK_INVOICES: MockInvoice[] = [
  { id: 'inv_1', invoiceNumber: 'INV-2026-001', date: '2026-03-01', dueDate: '2026-03-31', amount: 85000, status: 'sent' },
  { id: 'inv_2', invoiceNumber: 'INV-2026-002', date: '2026-02-15', dueDate: '2026-03-17', amount: 45000, status: 'overdue' },
  { id: 'inv_3', invoiceNumber: 'INV-2026-003', date: '2026-01-20', dueDate: '2026-02-19', amount: 120000, status: 'paid' },
  { id: 'inv_4', invoiceNumber: 'INV-2025-048', date: '2025-12-10', dueDate: '2026-01-09', amount: 67000, status: 'paid' },
  { id: 'inv_5', invoiceNumber: 'INV-2025-039', date: '2025-11-05', dueDate: '2025-12-05', amount: 93000, status: 'paid' },
];

// ── Mock Payments ─────────────────────────────────
interface MockPayment {
  id: string;
  reference: string;
  date: string;
  amount: number;
  method: string;
}

const MOCK_PAYMENTS: MockPayment[] = [
  { id: 'pay_1', reference: 'PAY-2026-012', date: '2026-03-05', amount: 120000, method: 'Bank Transfer' },
  { id: 'pay_2', reference: 'PAY-2026-008', date: '2026-02-20', amount: 67000, method: 'Cheque' },
  { id: 'pay_3', reference: 'PAY-2026-003', date: '2026-01-15', amount: 93000, method: 'Bank Transfer' },
  { id: 'pay_4', reference: 'PAY-2025-045', date: '2025-12-28', amount: 55000, method: 'Cash' },
  { id: 'pay_5', reference: 'PAY-2025-038', date: '2025-11-30', amount: 78000, method: 'Bank Transfer' },
];

const INVOICE_STATUS_COLORS: Record<string, string> = {
  paid: colors.success,
  sent: colors.secondary,
  overdue: colors.danger,
  draft: colors.textLight,
};

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const CustomerDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();

  const customers = useAppSelector(selectCustomers);
  const activeTab = useAppSelector(selectCustomerDetailTab);

  const customer = customers.find(c => c.id === route.params.customerId);

  React.useEffect(() => {
    return () => { dispatch(resetCustomerDetail()); };
  }, [dispatch]);

  if (!customer) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyText}>Customer not found</Text>
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="primary" size="md" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Credit usage ────────────────────────────────
  const creditUsagePercent = customer.creditLimit > 0
    ? Math.min((customer.balance / customer.creditLimit) * 100, 100)
    : 0;
  const creditBarColor = creditUsagePercent >= 80
    ? colors.danger
    : creditUsagePercent >= 50
      ? colors.warning
      : colors.success;

  // ── Action handlers ─────────────────────────────
  const handleCreateInvoice = () => {
    Alert.alert('Create Invoice', `Invoice creation for ${customer.name} will be available in Module 2.`);
  };
  const handleRecordPayment = () => {
    Alert.alert('Record Payment', `Payment recording for ${customer.name} will be available in Module 2.`);
  };
  const handleSendStatement = () => {
    Alert.alert('Send Statement', `Account statement for ${customer.name} sent successfully (simulated).`);
  };
  const handleToggleActive = async () => {
    await dispatch(toggleCustomerActive(customer.id));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{customer.name}</Text>
        </View>
        <CustomButton
          title="Edit"
          onPress={() => navigation.navigate('CustomerForm', { customerId: customer.id })}
          variant="secondary"
          size="sm"
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Top Card: Balance + Credit Usage ────── */}
        <View style={styles.topCard}>
          <View style={styles.topCardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.topCardLabel}>Outstanding Balance</Text>
              <Text style={styles.topCardBalance}>{formatCurrency(customer.balance, 'Rs ')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.topCardLabel}>Total Purchases</Text>
              <Text style={styles.topCardPurchases}>{formatCurrency(customer.totalPurchases, 'Rs ')}</Text>
            </View>
          </View>

          {/* Credit Usage Bar */}
          {customer.creditLimit > 0 && (
            <View style={styles.creditSection}>
              <View style={styles.creditHeader}>
                <Text style={styles.creditLabel}>Credit Usage</Text>
                <Text style={styles.creditPercent}>{creditUsagePercent.toFixed(0)}%</Text>
              </View>
              <View style={styles.creditBarTrack}>
                <View
                  style={[styles.creditBarFill, { width: `${creditUsagePercent}%`, backgroundColor: creditBarColor }]}
                />
              </View>
              <View style={styles.creditFooter}>
                <Text style={styles.creditFooterText}>
                  {formatCurrency(customer.balance, 'Rs ')} of {formatCurrency(customer.creditLimit, 'Rs ')}
                </Text>
              </View>
            </View>
          )}

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: customer.isActive ? colors.success + '18' : colors.textLight + '18' }]}>
            <Text style={[styles.statusBadgeText, { color: customer.isActive ? colors.success : colors.textLight }]}>
              {customer.isActive ? '● Active' : '● Inactive'}
            </Text>
          </View>
        </View>

        {/* ── Action Buttons ─────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCreateInvoice} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionLabel}>Create Invoice</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleRecordPayment} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={styles.actionLabel}>Record Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleSendStatement} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>📨</Text>
            <Text style={styles.actionLabel}>Send Statement</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tabs ───────────────────────────────── */}
        <View style={styles.tabRow}>
          {TABS.map(t => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, isActive && styles.tabActive]}
                activeOpacity={0.7}
                onPress={() => dispatch(setActiveTab(t.key))}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab Content ────────────────────────── */}
        {activeTab === 'overview' && <OverviewTab customer={customer} onToggleActive={handleToggleActive} />}
        {activeTab === 'invoices' && <InvoicesTab />}
        {activeTab === 'payments' && <PaymentsTab />}
      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

const OverviewTab: React.FC<{
  customer: Customer;
  onToggleActive: () => void;
}> = ({ customer, onToggleActive }) => (
  <View style={styles.tabContent}>
    {/* Contact Info */}
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>Contact Information</Text>
      <InfoRow icon="✉️" label="Email" value={customer.email} />
      <InfoRow icon="📞" label="Phone" value={customer.phone} />
      {!!customer.contactPerson && <InfoRow icon="👤" label="Contact" value={customer.contactPerson} />}
      {!!customer.company && <InfoRow icon="🏢" label="Company" value={customer.company} />}
      {!!customer.taxId && <InfoRow icon="🆔" label="Tax ID" value={customer.taxId} />}
    </View>

    {/* Billing Address */}
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>Billing Address</Text>
      <Text style={styles.addressText}>
        {customer.billingAddress.street}{'\n'}
        {customer.billingAddress.city}, {customer.billingAddress.state} {customer.billingAddress.zipCode}{'\n'}
        {customer.billingAddress.country}
      </Text>
    </View>

    {/* Shipping Address */}
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>Shipping Address</Text>
      <Text style={styles.addressText}>
        {customer.shippingAddress.street}{'\n'}
        {customer.shippingAddress.city}, {customer.shippingAddress.state} {customer.shippingAddress.zipCode}{'\n'}
        {customer.shippingAddress.country}
      </Text>
    </View>

    {/* Terms & Dates */}
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>Terms & Details</Text>
      <InfoRow icon="📋" label="Payment Terms" value={PAYMENT_TERMS_LABELS[customer.paymentTerms as PaymentTerms] ?? customer.paymentTerms} />
      <InfoRow icon="💳" label="Credit Limit" value={formatCurrency(customer.creditLimit, 'Rs ')} />
      <InfoRow icon="📅" label="Customer Since" value={formatDate(customer.createdAt)} />
      <InfoRow icon="🔄" label="Last Updated" value={formatDate(customer.updatedAt)} />
    </View>

    {/* Notes */}
    {!!customer.notes && (
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>Notes</Text>
        <Text style={styles.notesText}>{customer.notes}</Text>
      </View>
    )}

    {/* Toggle Active */}
    <CustomButton
      title={customer.isActive ? 'Deactivate Customer' : 'Activate Customer'}
      onPress={onToggleActive}
      variant={customer.isActive ? 'danger' : 'primary'}
      size="md"
      fullWidth
    />
  </View>
);

const InvoicesTab: React.FC = () => (
  <View style={styles.tabContent}>
    {MOCK_INVOICES.map(inv => (
      <View key={inv.id} style={styles.listCard}>
        <View style={styles.listCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listCardTitle}>{inv.invoiceNumber}</Text>
            <Text style={styles.listCardSub}>{formatDate(inv.date)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.listCardAmount}>{formatCurrency(inv.amount, 'Rs ')}</Text>
            <View style={[styles.miniStatusBadge, { backgroundColor: INVOICE_STATUS_COLORS[inv.status] + '18' }]}>
              <Text style={[styles.miniStatusText, { color: INVOICE_STATUS_COLORS[inv.status] }]}>
                {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.listCardDetail}>Due: {formatDate(inv.dueDate)}</Text>
      </View>
    ))}
  </View>
);

const PaymentsTab: React.FC = () => (
  <View style={styles.tabContent}>
    {MOCK_PAYMENTS.map(pay => (
      <View key={pay.id} style={styles.listCard}>
        <View style={styles.listCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listCardTitle}>{pay.reference}</Text>
            <Text style={styles.listCardSub}>{formatDate(pay.date)}</Text>
          </View>
          <Text style={[styles.listCardAmount, { color: colors.success }]}>
            {formatCurrency(pay.amount, 'Rs ')}
          </Text>
        </View>
        <Text style={styles.listCardDetail}>Method: {pay.method}</Text>
      </View>
    ))}
  </View>
);

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
  </View>
);

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1, marginRight: spacing.sm },
  backBtn: { fontSize: 14, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.xs },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  scrollContent: { paddingBottom: spacing.xl },

  // ── Top Card ───────────────────────────────────
  topCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  topCardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  topCardLabel: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginBottom: 2 },
  topCardBalance: { fontSize: 24, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily },
  topCardPurchases: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  creditSection: { marginBottom: spacing.sm },
  creditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  creditLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  creditPercent: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  creditBarTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  creditBarFill: { height: '100%', borderRadius: 4 },
  creditFooter: { marginTop: spacing.xs },
  creditFooterText: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginTop: spacing.xs,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: THEME.typography.fontFamily },

  // ── Action Buttons ─────────────────────────────
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.small,
  },
  actionIcon: { fontSize: 22, marginBottom: spacing.xs },
  actionLabel: { fontSize: 11, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, textAlign: 'center' },

  // ── Tabs ───────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    ...shadows.small,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  tabTextActive: { color: colors.white },

  // ── Tab Content ────────────────────────────────
  tabContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  // ── Info Cards ─────────────────────────────────
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 1,
  },
  infoIcon: { fontSize: 14, marginRight: spacing.sm, width: 22 },
  infoLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, width: 100 },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, flex: 1 },

  addressText: { fontSize: 14, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, lineHeight: 22 },
  notesText: { fontSize: 14, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, lineHeight: 21 },

  // ── List Cards (Invoices / Payments) ───────────
  listCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  listCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  listCardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  listCardSub: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  listCardAmount: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  listCardDetail: { fontSize: 12, color: colors.textLight, fontFamily: THEME.typography.fontFamily, marginTop: spacing.sm },

  miniStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  miniStatusText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },

  // ── Empty / Center ─────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
});

export default CustomerDetailScreen;
