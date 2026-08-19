// ═══════════════════════════════════════════════════════
// FinMatrix — Bill Detail Screen
// Professional bill preview with vendor info, metadata,
// line items table, totals, payment history,
// remaining balance, and status-based action bar.
// Actions: Edit, Pay, Void.
// ═══════════════════════════════════════════════════════

import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Alert } from '../../../utils/alert';
import { useCompanyInfo } from '../../../utils/companyInfo';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchBillDetail,
  resetBillDetail,
  selectBillDetail,
  selectBillPayments,
  selectBillDetailLoading,
  selectBillDetailError,
  updateBillStatus,
} from './billDetailSlice';
import { fetchBills, upsertBill, removeBill } from '../BillList/billListSlice';
import { BILL_STATUS_COLORS, BILL_STATUS_LABELS } from '../../../models/billModel';
import { billSingleSerializer } from '../../../serializers/billSerializer';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { BillStatus, BillPayment } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type DetailRoute = RouteProp<TransactionsStackParamList, 'BillDetail'>;

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
};

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const BillDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();
  const companyInfo = useCompanyInfo();

  const billId = route.params.billId;
  const bill = useAppSelector(selectBillDetail);
  const payments = useAppSelector(selectBillPayments);
  const isLoading = useAppSelector(selectBillDetailLoading);
  const error = useAppSelector(selectBillDetailError);

  const [refreshing, setRefreshing] = React.useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const paymentsY = useRef(0);
  // "View Payments" used to be onPress={() => {}} — a button that did nothing.
  const scrollToPayments = useCallback(
    () => scrollRef.current?.scrollTo({ y: Math.max(0, paymentsY.current - 12), animated: true }),
    [],
  );

  // Refetch on focus, not just on mount. This screen stays mounted while Pay
  // Bills is pushed over it, so returning from a payment used to show the
  // pre-payment bill — which is why a fully paid bill kept offering Pay Bill,
  // Edit and Void, and why Amount Paid looked unchanged.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchBillDetail(billId));
    }, [billId, dispatch]),
  );

  useEffect(() => () => { dispatch(resetBillDetail()); }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchBillDetail(billId));
    setRefreshing(false);
  }, [billId, dispatch]);

  const balance = useMemo(
    () => (bill ? bill.total - bill.amountPaid : 0),
    [bill],
  );

  // Money left to pay, not merely a status string. A hair of tolerance so a
  // rounding remainder never leaves a bill looking payable.
  const isSettled = !!bill && balance <= 0.005 && bill.status !== 'void';
  const canPay = !!bill && balance > 0.005 && bill.status !== 'draft' && bill.status !== 'void';
  // The API refuses to edit anything but a draft (CANNOT_EDIT_POSTED), so
  // offering Edit on a posted bill was offering a guaranteed failure.
  const canEdit = !!bill && bill.status === 'draft';
  // DELETE reverses the bill; the server blocks it once payments exist.
  const canDelete = !!bill && bill.amountPaid <= 0.005 && bill.status !== 'void';

  // ── Delete action ───────────────────────
  // What used to be "Void" sent `status: 'draft'`, but UpdateBillDto has no
  // status field and the API whitelists it away — so it 400'd with
  // CANNOT_EDIT_POSTED and reported "Voided" anyway. DELETE is the real
  // reversal: it posts a reversing journal entry and the server already
  // refuses when the bill has payments (BILL_HAS_PAYMENTS).
  const handleDelete = useCallback(async () => {
    if (!bill) return;
    Alert.alert(
      'Delete Bill',
      `Delete ${bill.billNumber}? A reversing journal entry is posted, so the ledger stays auditable.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(removeBill(bill.id)).unwrap();
              Toast.show({ type: 'success', text1: 'Bill deleted', text2: `${bill.billNumber} was reversed and removed.` });
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Could not delete', e?.message ?? 'Please try again.');
            }
          },
        },
      ],
    );
  }, [bill, dispatch, navigation]);

  // ── Loading / Error ─────────────────────────────
  if (isLoading && !bill) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !bill) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Bill not found'}</Text>
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="secondary" size="md" />
        </View>
      </SafeAreaView>
    );
  }

  const statusCol = BILL_STATUS_COLORS[bill.status];

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{bill.billNumber}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusCol + '18' }]}>
            <Text style={[styles.badgeText, { color: statusCol }]}>
              {BILL_STATUS_LABELS[bill.status]}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* ── Bill Card ───────────────────────────── */}
        <View style={styles.billCard}>
          <Text style={styles.companyName}>{companyInfo.name}</Text>
          {(companyInfo.addressLine1 || companyInfo.addressLine2) ? (
            <Text style={styles.companyMeta}>
              {[companyInfo.addressLine1, companyInfo.addressLine2].filter(Boolean).join(', ')}
            </Text>
          ) : null}
          {(companyInfo.email || companyInfo.phone) ? (
            <Text style={styles.companyMeta}>
              {[companyInfo.email, companyInfo.phone].filter(Boolean).join('  •  ')}
            </Text>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.billLabel}>BILL</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Bill #</Text>
              <Text style={styles.metaVal}>{bill.billNumber}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Issue Date</Text>
              <Text style={styles.metaVal}>{formatDate(bill.issueDate)}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Due Date</Text>
              <Text style={styles.metaVal}>{formatDate(bill.dueDate)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── Vendor ────────────────────────────── */}
          <Text style={styles.sectionLabel}>Vendor</Text>
          <Text style={styles.vendorName}>{bill.vendorName}</Text>

          <View style={styles.divider} />

          {/* ── Line Items Table ──────────────────── */}
          <Text style={styles.sectionLabel}>Items</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.thText, { flex: 1.2 }]}>Account</Text>
            <Text style={[styles.thText, { flex: 1.5 }]}>Description</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 0.6 }]}>Tax</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Amount</Text>
          </View>

          {bill.lines.map((line, idx) => (
            <View
              key={line.id}
              style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}
            >
              <Text style={[styles.tdText, { flex: 1.2 }]} numberOfLines={1}>
                {line.accountName}
              </Text>
              <Text style={[styles.tdText, { flex: 1.5 }]} numberOfLines={2}>
                {line.description}
              </Text>
              <Text style={[styles.tdText, styles.tdRight, { flex: 0.6 }]}>{line.taxRate}%</Text>
              <Text style={[styles.tdText, styles.tdRight, { flex: 1 }]}>
                {formatCurrency(line.amount, 'Rs ')}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          {/* ── Totals ────────────────────────────── */}
          <View style={styles.totalsBlock}>
            <TotalsRow label="Subtotal" value={formatCurrency(bill.subtotal, 'Rs ')} />
            <TotalsRow label="Tax" value={formatCurrency(bill.taxAmount, 'Rs ')} />
            <View style={styles.grandTotalDivider} />
            <TotalsRow label="Grand Total" value={formatCurrency(bill.total, 'Rs ')} bold />
            <TotalsRow label="Amount Paid" value={formatCurrency(bill.amountPaid, 'Rs ')} valueColor={colors.success} />
            <View style={styles.grandTotalDivider} />
            <TotalsRow
              label="Balance Due"
              value={formatCurrency(balance, 'Rs ')}
              bold
              valueColor={balance > 0 ? colors.danger : colors.success}
            />
          </View>

          {/* ── Notes ─────────────────────────────── */}
          {!!bill.notes && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Notes</Text>
              <Text style={styles.notesText}>{bill.notes}</Text>
            </>
          )}
        </View>

        {/* ── Payment History ─────────────────────── */}
        <View onLayout={e => { paymentsY.current = e.nativeEvent.layout.y; }} />
        <Text style={styles.outerSectionTitle}>Payment History</Text>
        {payments.length === 0 ? (
          <View style={styles.emptyPayments}>
            <Text style={styles.emptyPaymentsIcon}>💰</Text>
            <Text style={styles.emptyPaymentsText}>No payments recorded yet</Text>
          </View>
        ) : (
          payments.map((pmt: BillPayment) => (
            <View key={pmt.id} style={styles.paymentCard}>
              <View style={styles.paymentTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentNumber}>{pmt.paymentNumber}</Text>
                  <Text style={styles.paymentDate}>{formatDate(pmt.date)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.paymentAmount}>{formatCurrency(pmt.amount, 'Rs ')}</Text>
                  <View style={styles.methodBadge}>
                    <Text style={styles.methodBadgeText}>{METHOD_LABEL[pmt.method] ?? pmt.method}</Text>
                  </View>
                </View>
              </View>
              {!!pmt.reference && (
                <Text style={styles.paymentRef}>Ref: {pmt.reference}</Text>
              )}
            </View>
          ))
        )}

        <View style={{ height: spacing.xl * 3 }} />
      </ScrollView>

      {/* ── Action Bar ──────────────────────────────
          Gated on the BALANCE, not just the status: a bill with nothing left
          to pay must not keep offering Pay Bill / Edit / Delete. */}
      <View style={styles.actionBar}>
        {canEdit && (
          <View style={styles.actionSecondary}>
            <CustomButton
              title="Edit"
              onPress={() => navigation.navigate('BillForm', { billId: bill.id })}
              variant="secondary"
              size="sm"
              fullWidth
            />
          </View>
        )}

        {canDelete && (
          <View style={styles.actionSecondary}>
            <CustomButton title="Delete" onPress={handleDelete} variant="secondary" size="sm" fullWidth />
          </View>
        )}

        {canPay && (
          <View style={styles.actionPrimary}>
            <CustomButton
              title="Pay Bill"
              onPress={() => navigation.navigate('PayBills', { vendorId: bill.vendorId, billId: bill.id })}
              variant="primary"
              size="sm"
              fullWidth
            />
          </View>
        )}

        {isSettled && (
          <View style={styles.actionPrimary}>
            <CustomButton title="View Payments" onPress={scrollToPayments} variant="primary" size="sm" fullWidth />
          </View>
        )}

        {bill.status === 'void' && (
          <View style={styles.actionPrimary}>
            <CustomButton
              title="Back to Bills"
              onPress={() => navigation.navigate('BillList')}
              variant="secondary"
              size="sm"
              fullWidth
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// TOTALS ROW HELPER
// ═══════════════════════════════════════════════════════
const TotalsRow: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}> = ({ label, value, bold, valueColor }) => (
  <View style={styles.totalsRow}>
    <Text style={[styles.totalsLabel, bold && styles.totalsLabelBold]}>{label}</Text>
    <Text
      style={[
        styles.totalsValue,
        bold && styles.totalsValueBold,
        valueColor ? { color: valueColor } : undefined,
      ]}
    >
      {value}
    </Text>
  </View>
);

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  errorText: { fontSize: 15, color: colors.danger, fontFamily: THEME.typography.fontFamily },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, flex: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  billCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  companyName: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily, marginBottom: 2 },
  companyMeta: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm + 2 },
  billLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaCol: { alignItems: 'center', flex: 1 },
  metaKey: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily, marginBottom: 2 },
  metaVal: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: THEME.typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  vendorName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
  },
  thText: { fontSize: 11, fontWeight: '700', color: colors.primary, fontFamily: THEME.typography.fontFamily, textTransform: 'uppercase' },
  thRight: { textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tableRowEven: { backgroundColor: colors.background },
  tdText: { fontSize: 12, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  tdRight: { textAlign: 'right' },

  totalsBlock: { marginLeft: 'auto', width: '65%' },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  totalsLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  totalsLabelBold: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  totalsValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  totalsValueBold: { fontSize: 16, fontWeight: '800' },
  grandTotalDivider: { height: 1.5, backgroundColor: colors.primary, marginVertical: spacing.xs },

  notesText: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, lineHeight: 20 },

  outerSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyPayments: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  emptyPaymentsIcon: { fontSize: 36, marginBottom: spacing.xs },
  emptyPaymentsText: { fontSize: 14, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },

  paymentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  paymentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  paymentNumber: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  paymentDate: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  paymentAmount: { fontSize: 16, fontWeight: '800', color: colors.success, fontFamily: THEME.typography.fontFamily },
  methodBadge: {
    marginTop: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.secondary + '18',
    borderRadius: 4,
  },
  methodBadgeText: { fontSize: 11, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily },
  paymentRef: { fontSize: 12, color: colors.textLight, fontFamily: THEME.typography.fontFamily, marginTop: spacing.xs },

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
    ...shadows.small,
  },
  actionPrimary: { flex: 1.4 },
  actionSecondary: { flex: 1 },
});

export default BillDetailScreen;
