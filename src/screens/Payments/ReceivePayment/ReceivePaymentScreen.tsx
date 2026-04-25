// ═══════════════════════════════════════════════════════
// FinMatrix — Receive Payment Screen
// Customer dropdown · Date · Method · Reference · Amount
// "Pay in Full" · Outstanding-invoices table with checkboxes
// Auto-distribute oldest first · Overpayment-as-credit toggle
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
  selectReceivePaymentState,
  setPaymentField,
  setPaymentCustomer,
  toggleInvoiceCheck,
  payInFull,
  distributeAmount,
  setPaymentErrors,
  toggleSaveOverpaymentAsCredit,
  preselectInvoice,
  resetReceivePayment,
  fetchAllInvoicesForPayment,
  savePayment,
} from './receivePaymentSlice';
import { fetchCustomers, selectCustomers } from '../../Customers/CustomerList/customerListSlice';
import { fetchInvoices } from '../../Invoices/InvoiceList/invoiceListSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { PaymentMethod } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type PaymentRoute = RouteProp<TransactionsStackParamList, 'ReceivePayment'>;

const METHOD_OPTIONS = [
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cash', value: 'cash' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Online (EasyPaisa / JazzCash)', value: 'online' },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const ReceivePaymentScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PaymentRoute>();
  const dispatch = useAppDispatch();

  const preCustomerId = route.params?.customerId;
  const preInvoiceId = route.params?.invoiceId;

  const form = useAppSelector(selectReceivePaymentState);
  const customers = useAppSelector(selectCustomers);

  // ── Customer options ────────────────────────────
  const customerOptions = useMemo(
    () =>
      customers
        .filter(c => c.isActive)
        .map(c => ({ label: c.company ? `${c.name} — ${c.company}` : c.name, value: c.id })),
    [customers],
  );

  // ── Generate payment number ─────────────────────
  const generatePaymentNumber = useCallback(
    () => `PAY-${String(Date.now()).slice(-6)}`,
    [],
  );

  // ── Load data on mount ──────────────────────────
  useEffect(() => {
    if (customers.length === 0) dispatch(fetchCustomers());
    dispatch(fetchAllInvoicesForPayment());

    dispatch(setPaymentField({ key: 'reference', value: generatePaymentNumber() }));

    return () => { dispatch(resetReceivePayment()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // ── Pre-select customer & invoice after invoices load ──
  useEffect(() => {
    if (
      preCustomerId &&
      !form.customerId &&
      form.allInvoices.length > 0 &&
      customers.length > 0
    ) {
      const cust = customers.find(c => c.id === preCustomerId);
      if (cust) dispatch(setPaymentCustomer({ id: cust.id, name: cust.name }));
    }
  }, [preCustomerId, form.customerId, form.allInvoices, customers, dispatch]);

  useEffect(() => {
    if (preInvoiceId && form.outstandingRows.length > 0) {
      dispatch(preselectInvoice(preInvoiceId));
    }
  }, [preInvoiceId, form.outstandingRows.length, dispatch]);

  // ── Customer change ─────────────────────────────
  const handleCustomerChange = useCallback(
    (custId: string) => {
      const cust = customers.find(c => c.id === custId);
      if (!cust) return;
      dispatch(setPaymentCustomer({ id: cust.id, name: cust.name }));
    },
    [customers, dispatch],
  );

  // ── Amount change → auto re-distribute ──────────
  const handleAmountChange = useCallback(
    (v: string) => {
      dispatch(setPaymentField({ key: 'amount', value: v.replace(/[^0-9.]/g, '') }));
      // Run distribute on the next microtask so the new amount is in state.
      setTimeout(() => dispatch(distributeAmount()), 0);
    },
    [dispatch],
  );

  // ── Total allocated & overpayment ───────────────
  const totalAllocated = useMemo(
    () => form.outstandingRows.reduce((s, r) => s + r.allocated, 0),
    [form.outstandingRows],
  );

  const paymentAmount = parseFloat(form.amount) || 0;
  const overpayment = useMemo(
    () => Math.max(0, Math.round((paymentAmount - totalAllocated) * 100) / 100),
    [paymentAmount, totalAllocated],
  );
  const hasOutstanding = form.outstandingRows.length > 0;
  const totalOutstanding = useMemo(
    () => form.outstandingRows.reduce((s, r) => s + r.balance, 0),
    [form.outstandingRows],
  );

  // ── Validation ──────────────────────────────────
  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.customerId) errs.customerId = 'Select a customer';
    if (!form.paymentDate) errs.paymentDate = 'Payment date is required';
    if (!form.amount || paymentAmount <= 0) errs.amount = 'Enter a positive amount';
    if (totalAllocated <= 0 && !(overpayment > 0 && form.saveOverpaymentAsCredit)) {
      errs.allocations =
        'Allocate the payment to at least one invoice, or enable "Save as customer credit" to record the full amount as a credit.';
    }
    if (overpayment > 0 && !form.saveOverpaymentAsCredit) {
      errs.allocations =
        'The amount exceeds what you allocated. Either reduce the amount, allocate more, or enable "Save as customer credit".';
    }
    return errs;
  }, [form, paymentAmount, totalAllocated, overpayment]);

  // ── Save ────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      dispatch(setPaymentErrors(validationErrors));
      Alert.alert('Cannot Save Payment', Object.values(validationErrors)[0]);
      return;
    }

    try {
      const result: any = await dispatch(savePayment());
      if (result.error) throw new Error(result.error.message);

      // Refresh invoice cache so updated balances/statuses show everywhere.
      dispatch(fetchInvoices());

      const message =
        overpayment > 0 && form.saveOverpaymentAsCredit
          ? `${formatCurrency(paymentAmount, 'Rs ')} recorded — ${formatCurrency(overpayment, 'Rs ')} kept as credit for ${form.customerName}.`
          : `${formatCurrency(paymentAmount, 'Rs ')} from ${form.customerName} has been recorded.`;

      Alert.alert('Payment Recorded', message, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record payment. Please try again.');
    }
  }, [dispatch, navigation, validate, paymentAmount, overpayment, form.saveOverpaymentAsCredit, form.customerName]);

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header — icon back button matches Estimate / SO / Invoice detail screens */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Receive Payment</Text>
          </View>
        </View>
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
          {/* ── Section: Customer & Payment Info ──── */}
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.sectionCard}>
            <CustomDropdown
              label="Customer *"
              options={customerOptions}
              value={form.customerId}
              onChange={handleCustomerChange}
              placeholder="Select customer…"
              error={form.errors.customerId}
              searchable
            />
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomInput
                  label="Payment Date *"
                  value={form.paymentDate}
                  onChangeText={v => dispatch(setPaymentField({ key: 'paymentDate', value: v }))}
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
                    dispatch(setPaymentField({ key: 'method', value: v as PaymentMethod }))
                  }
                />
              </View>
            </View>
            <CustomInput
              label="Reference / Cheque #"
              value={form.reference}
              onChangeText={v => dispatch(setPaymentField({ key: 'reference', value: v }))}
              placeholder="e.g. CHQ-12345"
            />

            <CustomInput
              label="Amount (Rs) *"
              value={form.amount}
              onChangeText={handleAmountChange}
              placeholder="0"
              keyboardType="decimal-pad"
              error={form.errors.amount}
            />

            {/* Pay-in-full helper — full-width chip under amount */}
            {hasOutstanding && (
              <TouchableOpacity
                onPress={() => dispatch(payInFull())}
                activeOpacity={0.7}
                style={styles.payFullChip}
              >
                <Text style={styles.payFullChipText}>
                  ⚡ Pay in Full ({formatCurrency(totalOutstanding, 'Rs ')})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Section: Outstanding Invoices ─────── */}
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Outstanding Invoices</Text>
            {hasOutstanding && (
              <Text style={styles.sectionTitleHint}>
                {form.outstandingRows.filter(r => r.checked).length} of {form.outstandingRows.length} selected
              </Text>
            )}
          </View>

          {!form.customerId ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyTitle}>Select a customer</Text>
              <Text style={styles.emptyText}>
                Pick a customer above to see their outstanding invoices.
              </Text>
            </View>
          ) : !hasOutstanding ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptyText}>
                {form.customerName} has no outstanding invoices. Any amount you enter will be saved as a credit.
              </Text>
            </View>
          ) : (
            <View style={styles.tableWrap}>
              {form.errors.allocations && (
                <Text style={styles.allocError}>{form.errors.allocations}</Text>
              )}

              {/* Table header */}
              <View style={styles.tableHeader}>
                <View style={{ width: 32 }} />
                <Text style={[styles.thText, { flex: 1.2 }]}>Invoice</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Due</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Balance</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Applied</Text>
              </View>

              {form.outstandingRows.map((row, idx) => (
                <TouchableOpacity
                  key={row.invoiceId}
                  style={[
                    styles.tableRow,
                    idx % 2 === 0 && styles.tableRowEven,
                    row.checked && styles.tableRowChecked,
                  ]}
                  activeOpacity={0.6}
                  onPress={() => dispatch(toggleInvoiceCheck(row.invoiceId))}
                >
                  <View style={styles.checkboxWrap}>
                    <View style={[styles.checkbox, row.checked && styles.checkboxChecked]}>
                      {row.checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </View>
                  <Text style={[styles.tdText, { flex: 1.2, fontWeight: '600' }]}>
                    {row.invoiceNumber}
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
            </View>
          )}

          {/* ── Summary Panel ────────────────────── */}
          {paymentAmount > 0 && (
            <View style={styles.summaryCard}>
              <SummaryRow
                label="Payment Amount"
                value={formatCurrency(paymentAmount, 'Rs ')}
              />
              <SummaryRow
                label="Applied to Invoices"
                value={formatCurrency(totalAllocated, 'Rs ')}
                valueColor={totalAllocated > 0 ? colors.success : undefined}
              />
              {overpayment > 0 && (
                <>
                  <SummaryRow
                    label="Unapplied Amount"
                    value={formatCurrency(overpayment, 'Rs ')}
                    valueColor={form.saveOverpaymentAsCredit ? colors.warning : colors.danger}
                  />
                  <View style={styles.creditToggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.creditToggleLabel}>
                        Save as Customer Credit
                      </Text>
                      <Text style={styles.creditToggleHint}>
                        Keep the unapplied {formatCurrency(overpayment, 'Rs ')} on file for {form.customerName}'s next purchase.
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => dispatch(toggleSaveOverpaymentAsCredit())}
                      activeOpacity={0.8}
                      style={[
                        styles.toggleSwitch,
                        form.saveOverpaymentAsCredit && styles.toggleSwitchOn,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleKnob,
                          form.saveOverpaymentAsCredit && styles.toggleKnobOn,
                        ]}
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── Notes ────────────────────────────── */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Payment Notes"
              value={form.notes}
              onChangeText={v => dispatch(setPaymentField({ key: 'notes', value: v }))}
              placeholder="Optional notes…"
              multiline
            />
          </View>

          <View style={{ height: spacing.xl * 2 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Sticky Action Bar ─────────────────── */}
      <View style={styles.actionBar}>
        <View style={styles.actionSecondary}>
          <CustomButton
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="secondary"
            size="md"
            fullWidth
          />
        </View>
        <View style={styles.actionPrimary}>
          <CustomButton
            title={form.isSaving ? 'Recording…' : 'Record Payment'}
            onPress={handleSave}
            variant="primary"
            size="md"
            fullWidth
            isLoading={form.isSaving}
            disabled={form.isSaving}
          />
        </View>
      </View>
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

  // ── Header (icon back button, matches detail screens) ──
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: {
    fontSize: 20, fontWeight: '700',
    color: colors.textPrimary, fontFamily: THEME.typography.fontFamily,
  },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  // ── Sections ───────────────────────────────────
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...THEME.typography.bodyMd,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitleHint: {
    ...THEME.typography.caption,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowFields: { flexDirection: 'row' },

  // ── Pay-in-full chip ───────────────────────────
  payFullChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary + '12',
    borderWidth: 1,
    borderColor: colors.secondary + '40',
    borderRadius: 18,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    marginTop: spacing.xs,
  },
  payFullChipText: {
    ...THEME.typography.bodySm,
    fontWeight: '700',
    color: colors.secondary,
  },

  // ── Empty state ────────────────────────────────
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyIcon: { fontSize: 32, marginBottom: spacing.xs },
  emptyTitle: { ...THEME.typography.h4, color: colors.textPrimary, marginBottom: 2 },
  emptyText: {
    ...THEME.typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  allocError: {
    ...THEME.typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.danger + '0C',
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },

  // ── Table ──────────────────────────────────────
  tableWrap: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
  },
  thText: {
    ...THEME.typography.labelSm,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
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
  tableRowEven: { backgroundColor: '#FCFCFD' },
  tableRowChecked: { backgroundColor: colors.success + '0C' },
  tdText: { ...THEME.typography.caption, color: colors.textPrimary },
  tdRight: { textAlign: 'right' },

  // ── Checkbox ───────────────────────────────────
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

  // ── Summary ────────────────────────────────────
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: { ...THEME.typography.bodySm, color: colors.textSecondary },
  summaryValue: {
    ...THEME.typography.bodyMd,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // ── Credit toggle ──────────────────────────────
  creditToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  creditToggleLabel: {
    ...THEME.typography.bodySm,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  creditToggleHint: {
    ...THEME.typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  toggleSwitch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginLeft: spacing.sm,
  },
  toggleSwitchOn: { backgroundColor: colors.success },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    ...shadows.small,
  },
  toggleKnobOn: { transform: [{ translateX: 18 }] },

  // ── Sticky Action Bar ──────────────────────────
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    ...shadows.small,
  },
  actionPrimary: { flex: 1.4 },
  actionSecondary: { flex: 1 },
});

export default ReceivePaymentScreen;
