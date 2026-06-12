// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Detail Screen
// ═══════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { selectVendors, upsertVendor } from '../VendorList/vendorListSlice';
import { selectAccounts } from '../../ChartOfAccounts/COAList/coaListSlice';
import {
  selectVendorDetail,
  selectVendorDetailTab,
  selectVendorDetailStatus,
  setActiveTab,
  resetVendorDetail,
  fetchVendorDetail,
  toggleActiveOnDetail,
  type VendorDetailTab,
} from './vendorDetailSlice';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { PAYMENT_TERMS_LABELS } from '../../../models/vendorModel';
import { vendorSingleSerializer } from '../../../serializers/vendorSerializer';
import type { PaymentTerms, Vendor } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type DetailRoute = RouteProp<MoreStackParamList, 'VendorDetail'>;

const TABS: { key: VendorDetailTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'bills', label: 'Bills' },
  { key: 'payments', label: 'Payments' },
];

// ── Mock Bills (filtered by vendor) ───────────────
interface MockBill {
  id: string;
  billNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'received' | 'overdue' | 'draft';
}

const MOCK_BILLS: MockBill[] = [
  { id: 'bill_1', billNumber: 'BILL-2026-001', date: '2026-03-01', dueDate: '2026-03-31', amount: 95000, status: 'received' },
  { id: 'bill_2', billNumber: 'BILL-2026-002', date: '2026-02-15', dueDate: '2026-03-17', amount: 52000, status: 'overdue' },
  { id: 'bill_3', billNumber: 'BILL-2026-003', date: '2026-01-20', dueDate: '2026-02-19', amount: 140000, status: 'paid' },
  { id: 'bill_4', billNumber: 'BILL-2025-048', date: '2025-12-10', dueDate: '2026-01-09', amount: 73000, status: 'paid' },
  { id: 'bill_5', billNumber: 'BILL-2025-039', date: '2025-11-05', dueDate: '2025-12-05', amount: 88000, status: 'paid' },
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
  { id: 'vpay_1', reference: 'VPAY-2026-012', date: '2026-03-05', amount: 140000, method: 'Bank Transfer' },
  { id: 'vpay_2', reference: 'VPAY-2026-008', date: '2026-02-20', amount: 73000, method: 'Cheque' },
  { id: 'vpay_3', reference: 'VPAY-2026-003', date: '2026-01-15', amount: 88000, method: 'Bank Transfer' },
  { id: 'vpay_4', reference: 'VPAY-2025-045', date: '2025-12-28', amount: 60000, method: 'Cash' },
  { id: 'vpay_5', reference: 'VPAY-2025-038', date: '2025-11-30', amount: 45000, method: 'Bank Transfer' },
];

const BILL_STATUS_COLORS: Record<string, string> = {
  paid: colors.success,
  received: colors.secondary,
  overdue: colors.danger,
  draft: colors.textLight,
};

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const VendorDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();

  const vendors = useAppSelector(selectVendors);
  const accounts = useAppSelector(selectAccounts);
  const activeTab = useAppSelector(selectVendorDetailTab);
  const detailVendor = useAppSelector(selectVendorDetail);
  const detailStatus = useAppSelector(selectVendorDetailStatus);

  // Prefer the detail-slice copy (always API-fresh) and fall back
  // to the list copy if the detail fetch is still in flight.
  const vendor = detailVendor ?? vendors.find(v => v.id === route.params.vendorId);

  const expenseAccountName = useMemo(() => {
    if (!vendor?.defaultExpenseAccountId) return '';
    const acct = accounts.find(a => a.id === vendor.defaultExpenseAccountId);
    return acct ? `${acct.code} – ${acct.name}` : vendor.defaultExpenseAccountId;
  }, [vendor, accounts]);

  React.useEffect(() => {
    dispatch(fetchVendorDetail(route.params.vendorId));
    return () => { dispatch(resetVendorDetail()); };
  }, [dispatch, route.params.vendorId]);

  if (!vendor) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          {detailStatus === 'loading' ? (
            <Text style={styles.emptyText}>Loading vendor…</Text>
          ) : (
            <>
              <Text style={styles.emptyIcon}>🏪</Text>
              <Text style={styles.emptyText}>Vendor not found</Text>
              <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="primary" size="md" />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Action handlers ─────────────────────────────
  const handleCreateBill = () => {
    Alert.alert('Create Bill', `Bill creation for ${vendor.name} will be available in the Bills module.`);
  };
  const handleRecordPayment = () => {
    Alert.alert('Record Payment', `Payment recording for ${vendor.name} will be available in the Payments module.`);
  };
  const handleSendStatement = () => {
    Alert.alert('Send Statement', `Account statement for ${vendor.name} sent successfully (simulated).`);
  };
  const handleToggleActive = async () => {
    const result: any = await dispatch(toggleActiveOnDetail(vendor.id));
    if (!result.error && result.payload) {
      // Keep the list slice in sync so the badge updates everywhere.
      const updated = vendorSingleSerializer(result.payload);
      if (updated) dispatch(upsertVendor(updated));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={24} color={colors.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{vendor.name}</Text>
        </View>
        <CustomButton
          title="Edit"
          onPress={() => navigation.navigate('VendorForm', { vendorId: vendor.id })}
          variant="secondary"
          size="sm"
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Top Card: Balance ───────────────────── */}
        <View style={styles.topCard}>
          <View style={styles.topCardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.topCardLabel}>Outstanding Balance</Text>
              <Text style={styles.topCardBalance}>{formatCurrency(vendor.balance, 'Rs ')}</Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: vendor.isActive ? colors.success + '18' : colors.textLight + '18' }]}>
            <Text style={[styles.statusBadgeText, { color: vendor.isActive ? colors.success : colors.textLight }]}>
              {vendor.isActive ? '● Active' : '● Inactive'}
            </Text>
          </View>
        </View>

        {/* ── Action Buttons ─────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCreateBill} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionLabel}>Create Bill</Text>
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
        {activeTab === 'overview' && (
          <OverviewTab vendor={vendor} expenseAccountName={expenseAccountName} onToggleActive={handleToggleActive} />
        )}
        {activeTab === 'bills' && <BillsTab />}
        {activeTab === 'payments' && <PaymentsTab />}
      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

const OverviewTab: React.FC<{
  vendor: Vendor;
  expenseAccountName: string;
  onToggleActive: () => void;
}> = ({ vendor, expenseAccountName, onToggleActive }) => (
  <View style={styles.tabContent}>
    {/* Contact Info */}
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>Contact Information</Text>
      <InfoRow icon="✉️" label="Email" value={vendor.email} />
      <InfoRow icon="📞" label="Phone" value={vendor.phone} />
      {!!vendor.contactPerson && <InfoRow icon="👤" label="Contact" value={vendor.contactPerson} />}
      {!!vendor.taxId && <InfoRow icon="🆔" label="Tax ID" value={vendor.taxId} />}
    </View>

    {/* Address */}
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>Address</Text>
      <Text style={styles.addressText}>
        {vendor.address}{'\n'}
        {vendor.city}{vendor.state ? `, ${vendor.state}` : ''} {vendor.zipCode}{'\n'}
        {vendor.country}
      </Text>
    </View>

    {/* Terms & Details */}
    <View style={styles.infoCard}>
      <Text style={styles.infoCardTitle}>Terms & Details</Text>
      <InfoRow icon="📋" label="Payment Terms" value={PAYMENT_TERMS_LABELS[vendor.paymentTerms as PaymentTerms] ?? vendor.paymentTerms} />
      {!!expenseAccountName && <InfoRow icon="📒" label="Expense Acct" value={expenseAccountName} />}
      <InfoRow icon="📅" label="Vendor Since" value={formatDate(vendor.createdAt)} />
      <InfoRow icon="🔄" label="Last Updated" value={formatDate(vendor.updatedAt)} />
    </View>

    {/* Notes */}
    {!!vendor.notes && (
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>Notes</Text>
        <Text style={styles.notesText}>{vendor.notes}</Text>
      </View>
    )}

    {/* Toggle Active */}
    <CustomButton
      title={vendor.isActive ? 'Deactivate Vendor' : 'Activate Vendor'}
      onPress={onToggleActive}
      variant={vendor.isActive ? 'danger' : 'primary'}
      size="md"
      fullWidth
    />
  </View>
);

const BillsTab: React.FC = () => (
  <View style={styles.tabContent}>
    {MOCK_BILLS.map(bill => (
      <View key={bill.id} style={styles.listCard}>
        <View style={styles.listCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listCardTitle}>{bill.billNumber}</Text>
            <Text style={styles.listCardSub}>{formatDate(bill.date)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.listCardAmount}>{formatCurrency(bill.amount, 'Rs ')}</Text>
            <View style={[styles.miniStatusBadge, { backgroundColor: BILL_STATUS_COLORS[bill.status] + '18' }]}>
              <Text style={[styles.miniStatusText, { color: BILL_STATUS_COLORS[bill.status] }]}>
                {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.listCardDetail}>Due: {formatDate(bill.dueDate)}</Text>
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
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: spacing.sm },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: { ...THEME.typography.h2, color: colors.textPrimary, flex: 1 },
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
  topCardLabel: { ...THEME.typography.caption, color: colors.textSecondary, marginBottom: 2 },
  topCardBalance: { ...THEME.typography.h1, color: colors.primary },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginTop: spacing.xs,
  },
  statusBadgeText: { ...THEME.typography.caption, fontWeight: '700' },

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
  actionLabel: { ...THEME.typography.labelSm, color: colors.textPrimary, textAlign: 'center' },

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
  tabText: { ...THEME.typography.labelLg, color: colors.textSecondary },
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
    ...THEME.typography.h4,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 1,
  },
  infoIcon: { fontSize: 14, marginRight: spacing.sm, width: 22 },
  infoLabel: { ...THEME.typography.bodySm, color: colors.textSecondary, width: 100 },
  infoValue: { ...THEME.typography.bodySm, fontWeight: '600', color: colors.textPrimary, flex: 1 },

  addressText: { ...THEME.typography.bodyMd, color: colors.textPrimary, lineHeight: 22 },
  notesText: { ...THEME.typography.bodyMd, color: colors.textSecondary, lineHeight: 21 },

  // ── List Cards (Bills / Payments) ──────────────
  listCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  listCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  listCardTitle: { ...THEME.typography.h4, fontWeight: '700', color: colors.textPrimary },
  listCardSub: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: 2 },
  listCardAmount: { ...THEME.typography.h4, fontWeight: '700', color: colors.textPrimary },
  listCardDetail: { ...THEME.typography.caption, color: colors.textLight, marginTop: spacing.sm },

  miniStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  miniStatusText: { ...THEME.typography.labelSm, fontWeight: '700' },

  // ── Empty / Center ─────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyIcon: { ...THEME.typography.displayLg, fontSize: 48 },
  emptyText: { ...THEME.typography.h4, fontWeight: '400', color: colors.textSecondary },
});

export default VendorDetailScreen;
