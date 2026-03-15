// ═══════════════════════════════════════════════════════
// FinMatrix — Receive Payment Screen
// Customer dropdown, payment date, method, reference,
// amount, "Pay in Full", outstanding invoices table with
// checkboxes, auto-distribute oldest first, overpayment
// handling.
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

import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectReceivePaymentState,
  setPaymentField,
  setPaymentCustomer,
  toggleInvoiceCheck,
  payInFull,
  distributeAmount,
  setPaymentErrors,
  setPaymentIsSaving,
  preselectInvoice,
  resetReceivePayment,
  fetchAllInvoicesForPayment,
} from './receivePaymentSlice';
import { fetchCustomers, selectCustomers } from '../../Customers/CustomerList/customerListSlice';
import { fetchInvoices } from '../../Invoices/InvoiceList/invoiceListSlice';
import { createPaymentAPI } from '../../../network/paymentNetwork';
import { updateInvoiceAPI } from '../../../network/invoiceNetwork';
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
        .map(c => ({ label: `${c.name} — ${c.company}`, value: c.id })),
    [customers],
  );

  // ── Generate payment number ─────────────────────
  const generatePaymentNumber = useCallback(() => {
    return `PAY-${String(Date.now()).slice(-6)}`;
  }, []);

  // ── Load data on mount ──────────────────────────
  useEffect(() => {
    dispatch(fetchCustomers());
    dispatch(fetchAllInvoicesForPayment());

    dispatch(
      setPaymentField({ key: 'reference', value: generatePaymentNumber() }),
    );

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
      if (cust) {
        dispatch(setPaymentCustomer({ id: cust.id, name: cust.name }));
      }
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

  // ── Validation ──────────────────────────────────
  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.customerId) errs.customerId = 'Select a customer';
    if (!form.paymentDate) errs.paymentDate = 'Payment date is required';
    if (!form.amount || paymentAmount <= 0) errs.amount = 'Enter a positive amount';
    if (totalAllocated <= 0) errs.allocations = 'Allocate payment to at least one invoice';
    return errs;
  }, [form, paymentAmount, totalAllocated]);

  // ── Save ────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      dispatch(setPaymentErrors(validationErrors));
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

    dispatch(setPaymentIsSaving(true));

    try {
      const allocations = form.outstandingRows
        .filter(r => r.allocated > 0)
        .map(r => ({
          invoiceId: r.invoiceId,
          invoiceNumber: r.invoiceNumber,
          amount: r.allocated,
        }));

      await createPaymentAPI({
        companyId: 'comp_001',
        paymentNumber: form.reference || generatePaymentNumber(),
        customerId: form.customerId,
        customerName: form.customerName,
        date: new Date(form.paymentDate).toISOString(),
        method: form.method,
        reference: form.reference,
        amount: paymentAmount,
        allocations,
        notes: form.notes,
        createdBy: 'admin_001',
      });

      // Update each allocated invoice's amountPaid
      for (const alloc of allocations) {
        const inv = form.allInvoices.find(i => i.id === alloc.invoiceId);
        if (inv) {
          const newAmountPaid = inv.amountPaid + alloc.amount;
          const newStatus = newAmountPaid >= inv.total ? 'paid' : inv.status;
          await updateInvoiceAPI(inv.id, {
            amountPaid: newAmountPaid,
            status: newStatus,
          });
        }
      }

      await dispatch(fetchInvoices());

      Alert.alert(
        'Payment Recorded',
        `${formatCurrency(paymentAmount, 'Rs ')} payment from ${form.customerName} has been recorded.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert('Error', 'Failed to record payment. Please try again.');
    } finally {
      dispatch(setPaymentIsSaving(false));
    }
  }, [form, paymentAmount, overpayment, totalAllocated, dispatch, navigation, validate, generatePaymentNumber]);

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive Payment</Text>
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
                  onChangeText={v =>
                    dispatch(setPaymentField({ key: 'paymentDate', value: v }))
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
                    dispatch(
                      setPaymentField({ key: 'method', value: v as PaymentMethod }),
                    )
                  }
                />
              </View>
            </View>
            <CustomInput
              label="Reference / Cheque #"
              value={form.reference}
              onChangeText={v =>
                dispatch(setPaymentField({ key: 'reference', value: v }))
              }
              placeholder="e.g. CHQ-12345"
            />

            {/* Amount + Pay in Full */}
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
                  title="Pay in Full"
                  onPress={() => dispatch(payInFull())}
                  variant="secondary"
                  size="sm"
                  disabled={form.outstandingRows.length === 0}
                />
              </View>
            </View>
          </View>

          {/* ── Section: Outstanding Invoices ─────── */}
          <Text style={styles.sectionTitle}>Outstanding Invoices</Text>

          {form.outstandingRows.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyText}>
                {form.customerId
                  ? 'No outstanding invoices for this customer'
                  : 'Select a customer to see outstanding invoices'}
              </Text>
            </View>
          ) : (
            <>
              {form.errors.allocations && (
                <Text style={styles.errorText}>{form.errors.allocations}</Text>
              )}

              {/* Table header */}
              <View style={styles.tableHeader}>
                <View style={{ width: 32 }} />
                <Text style={[styles.thText, { flex: 1.2 }]}>Invoice</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Due Date</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Balance</Text>
                <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Allocated</Text>
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
                dispatch(setPaymentField({ key: 'notes', value: v }))
              }
              placeholder="Optional notes…"
              multiline
            />
          </View>

          {/* ── Save Button ──────────────────────── */}
          <View style={styles.btnRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <CustomButton
                title="Cancel"
                onPress={() => navigation.goBack()}
                variant="secondary"
                size="lg"
                fullWidth
              />
            </View>
            <View style={{ flex: 1 }}>
              <CustomButton
                title="Record Payment"
                onPress={handleSave}
                variant="primary"
                size="lg"
                fullWidth
                isLoading={form.isSaving}
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

  // ── Header ─────────────────────────────────────
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.xs,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },

  // ── Sections ───────────────────────────────────
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
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

  // ── Empty state ────────────────────────────────
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  emptyIcon: { fontSize: 36, marginBottom: spacing.xs },
  emptyText: { fontSize: 14, color: colors.textSecondary, fontFamily: typography.fontFamily, textAlign: 'center' },
  errorText: { fontSize: 12, color: colors.danger, marginBottom: spacing.sm, fontFamily: typography.fontFamily },

  // ── Table ──────────────────────────────────────
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
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: typography.fontFamily,
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
  tableRowEven: { backgroundColor: colors.background },
  tableRowChecked: { backgroundColor: colors.success + '0C' },

  tdText: { fontSize: 12, color: colors.textPrimary, fontFamily: typography.fontFamily },
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
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: { color: colors.white, fontSize: 13, fontWeight: '800', marginTop: -1 },

  // ── Summary ────────────────────────────────────
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
  summaryLabel: { fontSize: 14, color: colors.textSecondary, fontFamily: typography.fontFamily },
  summaryValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: typography.fontFamily },

  // ── Buttons ────────────────────────────────────
  btnRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});

export default ReceivePaymentScreen;
