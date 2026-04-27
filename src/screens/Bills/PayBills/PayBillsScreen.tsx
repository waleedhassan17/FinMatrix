// ═══════════════════════════════════════════════════════
// FinMatrix — Pay Bills Screen
// Select bank account, vendor filter, list open bills
// with checkboxes, batch payment, auto-distribute.
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectPayBillsState,
  setPayBillField,
  setPayBillVendor,
  toggleBillCheck,
  payAllBills,
  distributePayBillAmount,
  preselectBill,
  setPayBillErrors,
  resetPayBills,
  fetchAllBillsForPayment,
  savePayment,
} from './payBillsSlice';
import { fetchVendors, selectVendors } from '../../Vendors/VendorList/vendorListSlice';
import { fetchBills } from '../BillList/billListSlice';
import { chartOfAccountsData } from '../../../dummy-data/chartOfAccounts';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { PaymentMethod } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type PayRoute = RouteProp<TransactionsStackParamList, 'PayBills'>;

const METHOD_OPTIONS = [
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cash', value: 'cash' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Online (EasyPaisa / JazzCash)', value: 'online' },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const PayBillsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PayRoute>();
  const dispatch = useAppDispatch();

  const preVendorId = route.params?.vendorId;
  const preBillId = route.params?.billId;

  const form = useAppSelector(selectPayBillsState);
  const vendors = useAppSelector(selectVendors);

  // ── Vendor dropdown options ─────────────────────
  const vendorOptions = useMemo(
    () =>
      vendors
        .filter(v => v.isActive)
        .map(v => ({ label: v.name, value: v.id })),
    [vendors],
  );

  // ── Bank account options ────────────────────────
  const bankAccountOptions = useMemo(
    () =>
      chartOfAccountsData
        .filter(a => a.isActive && a.type === 'asset' && a.subType === 'current_asset' && ['1000', '1010', '1020'].includes(a.code))
        .map(a => ({ label: `${a.name} (${a.code})`, value: a.id })),
    [],
  );

  // ── Generate payment number ─────────────────────
  const generatePaymentNumber = useCallback(() => {
    return `BPAY-${String(Date.now()).slice(-6)}`;
  }, []);

  // ── Load data on mount ──────────────────────────
  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchAllBillsForPayment());
    dispatch(setPayBillField({ key: 'reference', value: generatePaymentNumber() }));
    return () => { dispatch(resetPayBills()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // ── Pre-select vendor & bill after bills load ──
  useEffect(() => {
    if (preVendorId && !form.vendorId && form.allBills.length > 0 && vendors.length > 0) {
      const vendor = vendors.find(v => v.id === preVendorId);
      if (vendor) {
        dispatch(setPayBillVendor({ id: vendor.id, name: vendor.name }));
      }
    }
  }, [preVendorId, form.vendorId, form.allBills, vendors, dispatch]);

  useEffect(() => {
    if (preBillId && form.outstandingRows.length > 0) {
      dispatch(preselectBill(preBillId));
    }
  }, [preBillId, form.outstandingRows.length, dispatch]);

  // ── Vendor change ───────────────────────────────
  const handleVendorChange = useCallback(
    (vendorId: string) => {
      const vendor = vendors.find(v => v.id === vendorId);
      if (!vendor) return;
      dispatch(setPayBillVendor({ id: vendor.id, name: vendor.name }));
    },
    [vendors, dispatch],
  );

  // ── Amount change → auto re-distribute ──────────
  const handleAmountChange = useCallback(
    (v: string) => {
      dispatch(setPayBillField({ key: 'amount', value: v.replace(/[^0-9.]/g, '') }));
      setTimeout(() => dispatch(distributePayBillAmount()), 0);
    },
    [dispatch],
  );

  // ── Totals ──────────────────────────────────────
  const totalAllocated = useMemo(
    () => form.outstandingRows.reduce((s, r) => s + r.allocated, 0),
    [form.outstandingRows],
  );

  const paymentAmount = parseFloat(form.amount) || 0;
  const overpayment = useMemo(
    () => Math.max(0, Math.round((paymentAmount - totalAllocated) * 100) / 100),
    [paymentAmount, totalAllocated],
  );

  // ── Validation ──────────────────────────────────
  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.vendorId) errs.vendorId = 'Select a vendor';
    if (!form.bankAccountId) errs.bankAccountId = 'Select a bank account';
    if (!form.paymentDate) errs.paymentDate = 'Payment date is required';
    if (!form.amount || paymentAmount <= 0) errs.amount = 'Enter a positive amount';
    if (totalAllocated <= 0) errs.allocations = 'Allocate payment to at least one bill';
    return errs;
  }, [form, paymentAmount, totalAllocated]);

  // ── Save ────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      dispatch(setPayBillErrors(validationErrors));
      Alert.alert('Validation Error', Object.values(validationErrors)[0]);
      return;
    }

    if (overpayment > 0) {
      const proceed = await new Promise<boolean>(resolve => {
        Alert.alert(
          'Overpayment Detected',
          `${formatCurrency(overpayment, 'Rs ')} exceeds the allocated amount. The excess will be recorded as a credit. Continue?`,
          [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Continue', onPress: () => resolve(true) },
          ],
        );
      });
      if (!proceed) return;
    }

    const allocations = form.outstandingRows
      .filter(r => r.allocated > 0)
      .map(r => ({
        billId: r.billId,
        billNumber: r.billNumber,
        amount: r.allocated,
      }));

    try {
      await dispatch(
        savePayment({
          paymentNumber: form.reference || generatePaymentNumber(),
          allocations,
        }),
      ).unwrap();

      await dispatch(fetchBills());

      Alert.alert(
        'Payment Recorded',
        `${formatCurrency(paymentAmount, 'Rs ')} payment to ${form.vendorName} has been recorded.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to record payment. Please try again.');
    }
  }, [form, paymentAmount, overpayment, totalAllocated, dispatch, navigation, validate, generatePaymentNumber]);

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Pay Bills</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Section: Vendor & Payment Info ────── */}
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.sectionCard}>
            <CustomDropdown
              label="Vendor *"
              options={vendorOptions}
              value={form.vendorId}
              onChange={handleVendorChange}
              placeholder="Select vendor…"
              error={form.errors.vendorId}
              searchable
            />
            <CustomDropdown
              label="Bank Account *"
              options={bankAccountOptions}
              value={form.bankAccountId}
              onChange={v => dispatch(setPayBillField({ key: 'bankAccountId', value: v }))}
              placeholder="Select bank account…"
              error={form.errors.bankAccountId}
            />
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomInput
                  label="Payment Date *"
                  value={form.paymentDate}
                  onChangeText={v =>
                    dispatch(setPayBillField({ key: 'paymentDate', value: v }))
                  }
                  placeholder="YYYY-MM-DD"
                  error={form.errors.paymentDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomDropdown
                  label="Method"
                  options={METHOD_OPTIONS}
                  value={form.method}
                  onChange={v =>
                    dispatch(setPayBillField({ key: 'method', value: v as PaymentMethod }))
                  }
                />
              </View>
            </View>
            <CustomInput
              label="Reference / Cheque #"
              value={form.reference}
              onChangeText={v =>
                dispatch(setPayBillField({ key: 'reference', value: v }))
              }
              placeholder="e.g. CHQ-12345"
            />

            <View style={styles.amountRow}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomInput
                  label="Amount (Rs) *"
                  value={form.amount}
                  onChangeText={handleAmountChange}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  error={form.errors.amount}
                />
              </View>
              <View style={{ marginTop: 24 }}>
                <CustomButton
                  title="Pay All"
                  onPress={() => dispatch(payAllBills())}
                  variant="secondary"
                  size="sm"
                  disabled={form.outstandingRows.length === 0}
                />
              </View>
            </View>
          </View>

          {/* ── Section: Outstanding Bills ────────── */}
          <Text style={styles.sectionTitle}>Outstanding Bills</Text>

          {form.outstandingRows.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>
                {form.vendorId
                  ? 'No outstanding bills for this vendor'
                  : 'Select a vendor to see outstanding bills'}
              </Text>
            </View>
          ) : (
            <>
              {form.errors.allocations && (
                <Text style={styles.errorText}>{form.errors.allocations}</Text>
              )}

              <View style={styles.tableHeader}>
                <View style={{ width: 32 }} />
                <Text style={[styles.thText, { flex: 1.2 }]}>Bill</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Due Date</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Balance</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Allocated</Text>
              </View>

              {form.outstandingRows.map((row, idx) => (
                <TouchableOpacity
                  key={row.billId}
                  style={[
                    styles.tableRow,
                    idx % 2 === 0 && styles.tableRowEven,
                    row.checked && styles.tableRowChecked,
                  ]}
                  activeOpacity={0.6}
                  onPress={() => dispatch(toggleBillCheck(row.billId))}
                >
                  <View style={styles.checkboxWrap}>
                    <View style={[styles.checkbox, row.checked && styles.checkboxChecked]}>
                      {row.checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </View>
                  <Text style={[styles.tdText, { flex: 1.2, fontWeight: '600' }]}>
                    {row.billNumber}
                  </Text>
                  <Text style={[styles.tdText, styles.tdRight, { flex: 1 }]}>
                    {formatDate(row.dueDate)}
                  </Text>
                  <Text style={[styles.tdText, styles.tdRight, { flex: 1 }]}>
                    {formatCurrency(row.balance, 'Rs ')}
                  </Text>
                  <Text
                    style={[
                      styles.tdText,
                      styles.tdRight,
                      { flex: 1, fontWeight: '700' },
                      row.allocated > 0 && { color: colors.success },
                    ]}
                  >
                    {row.allocated > 0 ? formatCurrency(row.allocated, 'Rs ') : '—'}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* ── Summary Panel ────────────────────── */}
          {paymentAmount > 0 && (
            <View style={styles.summaryCard}>
              <SummaryRow label="Payment Amount" value={formatCurrency(paymentAmount, 'Rs ')} />
              <SummaryRow label="Total Allocated" value={formatCurrency(totalAllocated, 'Rs ')} />
              {overpayment > 0 && (
                <SummaryRow
                  label="Overpayment (Credit)"
                  value={formatCurrency(overpayment, 'Rs ')}
                  valueColor={colors.warning}
                />
              )}
            </View>
          )}

          {/* ── Notes ────────────────────────────── */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Payment Notes"
              value={form.notes}
              onChangeText={v =>
                dispatch(setPayBillField({ key: 'notes', value: v }))
              }
              placeholder="Optional notes…"
              multiline
            />
          </View>

          {/* ── Actions (matches Estimates/SO) ────────── */}
          <View style={styles.btnRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <CustomButton
                title="Cancel"
                onPress={() => navigation.goBack()}
                variant="secondary"
                size="sm"
                fullWidth
                disabled={form.isSaving}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CustomButton
                title="Record Payment"
                onPress={handleSave}
                variant="primary"
                size="sm"
                fullWidth
                isLoading={form.isSaving}
                disabled={form.isSaving}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// SUMMARY ROW HELPER
// ═══════════════════════════════════════════════════════
const SummaryRow: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
}> = ({ label, value, valueColor }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, valueColor ? { color: valueColor } : undefined]}>
      {value}
    </Text>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, flex: 1 },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  rowFields: { flexDirection: 'row' },
  amountRow: { flexDirection: 'row', alignItems: 'flex-start' },

  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  emptyIcon: { fontSize: 36, marginBottom: spacing.xs },
  emptyText: { fontSize: 14, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, textAlign: 'center' },
  errorText: { fontSize: 12, color: colors.danger, marginBottom: spacing.sm, fontFamily: THEME.typography.fontFamily },

  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
  },
  thText: { fontSize: 11, fontWeight: '700', color: colors.primary, fontFamily: THEME.typography.fontFamily, textTransform: 'uppercase' },
  thRight: { textAlign: 'right' },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tableRowEven: { backgroundColor: colors.background },
  tableRowChecked: { backgroundColor: colors.success + '0C' },

  tdText: { fontSize: 12, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  tdRight: { textAlign: 'right' },

  checkboxWrap: { width: 32, alignItems: 'center' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  checkmark: { color: colors.white, fontSize: 13, fontWeight: '800', marginTop: -1 },

  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.card,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: { fontSize: 14, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  summaryValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  btnRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});

export default PayBillsScreen;
