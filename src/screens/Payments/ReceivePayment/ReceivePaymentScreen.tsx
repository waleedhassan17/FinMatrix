// ═══════════════════════════════════════════════════════
// FinMatrix — Receive Payment Screen
// Premium Enterprise UI
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
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

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

const P = {
  headerFrom: '#0A1628',
  headerTo: '#132F4C',
  accent: '#059669',
  accentLight: '#ECFDF5',
  totalsGold: '#F59E0B',
};

// ═══════════════════════════════════════════════════════
const ReceivePaymentScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PaymentRoute>();
  const dispatch = useAppDispatch();

  const preCustomerId = route.params?.customerId;
  const preInvoiceId = route.params?.invoiceId;

  const form = useAppSelector(selectReceivePaymentState);
  const customers = useAppSelector(selectCustomers);

  const customerOptions = useMemo(
    () =>
      customers
        .filter(c => c.isActive)
        .map(c => ({ label: c.company ? `${c.name} — ${c.company}` : c.name, value: c.id })),
    [customers],
  );

  const generatePaymentNumber = useCallback(
    () => `PAY-${String(Date.now()).slice(-6)}`,
    [],
  );

  useEffect(() => {
    if (customers.length === 0) dispatch(fetchCustomers());
    dispatch(fetchAllInvoicesForPayment());
    dispatch(setPaymentField({ key: 'reference', value: generatePaymentNumber() }));
    return () => { dispatch(resetReceivePayment()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (preCustomerId && !form.customerId && form.allInvoices.length > 0 && customers.length > 0) {
      const cust = customers.find(c => c.id === preCustomerId);
      if (cust) dispatch(setPaymentCustomer({ id: cust.id, name: cust.name }));
    }
  }, [preCustomerId, form.customerId, form.allInvoices, customers, dispatch]);

  useEffect(() => {
    if (preInvoiceId && form.outstandingRows.length > 0) {
      dispatch(preselectInvoice(preInvoiceId));
    }
  }, [preInvoiceId, form.outstandingRows.length, dispatch]);

  const handleCustomerChange = useCallback(
    (custId: string) => {
      const cust = customers.find(c => c.id === custId);
      if (!cust) return;
      dispatch(setPaymentCustomer({ id: cust.id, name: cust.name }));
    },
    [customers, dispatch],
  );

  const handleAmountChange = useCallback(
    (v: string) => {
      dispatch(setPaymentField({ key: 'amount', value: v.replace(/[^0-9.]/g, '') }));
      setTimeout(() => dispatch(distributeAmount()), 0);
    },
    [dispatch],
  );

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

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.customerId) errs.customerId = 'Select a customer';
    if (!form.paymentDate) errs.paymentDate = 'Payment date is required';
    if (!form.amount || paymentAmount <= 0) errs.amount = 'Enter a positive amount';
    if (totalAllocated <= 0 && !(overpayment > 0 && form.saveOverpaymentAsCredit)) {
      errs.allocations = 'Allocate the payment to at least one invoice, or enable "Save as customer credit".';
    }
    if (overpayment > 0 && !form.saveOverpaymentAsCredit) {
      errs.allocations = 'The amount exceeds allocation. Reduce or enable "Save as customer credit".';
    }
    return errs;
  }, [form, paymentAmount, totalAllocated, overpayment]);

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
      dispatch(fetchInvoices());

      const message =
        overpayment > 0 && form.saveOverpaymentAsCredit
          ? `${formatCurrency(paymentAmount, 'Rs ')} recorded — ${formatCurrency(overpayment, 'Rs ')} kept as credit.`
          : `${formatCurrency(paymentAmount, 'Rs ')} from ${form.customerName} has been recorded.`;

      Alert.alert('Payment Recorded', message, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record payment.');
    }
  }, [dispatch, navigation, validate, paymentAmount, overpayment, form.saveOverpaymentAsCredit, form.customerName]);

  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={P.headerFrom} />
      <LinearGradient colors={[P.headerFrom, P.headerTo]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Receive Payment</Text>
          <Text style={styles.headerSub}>Record an incoming payment</Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: P.accentLight }]}>
          <Feather name="dollar-sign" size={16} color={P.accent} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F1F5F9' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Payment Details ─────────────────────── */}
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionDot, { backgroundColor: P.accent }]} />
            <Text style={styles.sectionTitle}>PAYMENT DETAILS</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={[styles.cardAccent, { backgroundColor: P.accent }]} />
            <View style={styles.cardBody}>
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
                    onChange={v => dispatch(setPaymentField({ key: 'method', value: v as PaymentMethod }))}
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
              {hasOutstanding && (
                <TouchableOpacity onPress={() => dispatch(payInFull())} activeOpacity={0.7} style={styles.payFullChip}>
                  <Feather name="zap" size={14} color={P.accent} />
                  <Text style={styles.payFullChipText}>
                    Pay in Full ({formatCurrency(totalOutstanding, 'Rs ')})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Outstanding Invoices ─────────────────── */}
          <View style={styles.sectionLabelRow2}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}>
              <View style={[styles.sectionDot, { backgroundColor: '#6366F1' }]} />
              <Text style={styles.sectionTitle}>OUTSTANDING INVOICES</Text>
            </View>
            {hasOutstanding && (
              <Text style={styles.sectionHint}>
                {form.outstandingRows.filter(r => r.checked).length}/{form.outstandingRows.length}
              </Text>
            )}
          </View>

          {!form.customerId ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBg}>
                <Feather name="user" size={20} color="#6366F1" />
              </View>
              <Text style={styles.emptyTitle}>Select a customer</Text>
              <Text style={styles.emptyText}>Pick a customer above to see their outstanding invoices.</Text>
            </View>
          ) : !hasOutstanding ? (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="check-circle" size={20} color={P.accent} />
              </View>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptyText}>{form.customerName} has no outstanding invoices.</Text>
            </View>
          ) : (
            <View style={styles.tableWrap}>
              {form.errors.allocations && (
                <Text style={styles.allocError}>{form.errors.allocations}</Text>
              )}
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
                  style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven, row.checked && styles.tableRowChecked]}
                  activeOpacity={0.6}
                  onPress={() => dispatch(toggleInvoiceCheck(row.invoiceId))}
                >
                  <View style={styles.checkboxWrap}>
                    <View style={[styles.checkbox, row.checked && styles.checkboxChecked]}>
                      {row.checked && <Feather name="check" size={13} color="#FFFFFF" />}
                    </View>
                  </View>
                  <Text style={[styles.tdText, { flex: 1.2, fontWeight: '600' }]}>{row.invoiceNumber}</Text>
                  <Text style={[styles.tdText, styles.tdRight, { flex: 1 }]}>{formatDate(row.dueDate)}</Text>
                  <Text style={[styles.tdText, styles.tdRight, { flex: 1 }]}>{formatCurrency(row.balance, 'Rs ')}</Text>
                  <Text
                    style={[styles.tdText, styles.tdRight, { flex: 1, fontWeight: '700' }, row.allocated > 0 && { color: colors.success }]}
                  >
                    {row.allocated > 0 ? formatCurrency(row.allocated, 'Rs ') : '—'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Summary Panel ────────────────────────── */}
          {paymentAmount > 0 && (
            <LinearGradient
              colors={['#0F172A', '#1E293B']}
              style={styles.summaryCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.summaryHeader}>
                <Feather name="credit-card" size={16} color="#F59E0B" />
                <Text style={styles.summaryHeaderText}>Payment Summary</Text>
              </View>
              <View style={styles.summaryDivider} />
              <SummaryRow label="Payment Amount" value={formatCurrency(paymentAmount, 'Rs ')} />
              <SummaryRow label="Applied to Invoices" value={formatCurrency(totalAllocated, 'Rs ')} valueColor={totalAllocated > 0 ? '#34D399' : undefined} />
              {overpayment > 0 && (
                <>
                  <SummaryRow label="Unapplied Amount" value={formatCurrency(overpayment, 'Rs ')} valueColor={form.saveOverpaymentAsCredit ? '#FBBF24' : '#F87171'} />
                  <View style={styles.creditToggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.creditToggleLabel}>Save as Customer Credit</Text>
                      <Text style={styles.creditToggleHint}>
                        Keep {formatCurrency(overpayment, 'Rs ')} on file for next purchase.
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => dispatch(toggleSaveOverpaymentAsCredit())}
                      activeOpacity={0.8}
                      style={[styles.toggleSwitch, form.saveOverpaymentAsCredit && styles.toggleSwitchOn]}
                    >
                      <View style={[styles.toggleKnob, form.saveOverpaymentAsCredit && styles.toggleKnobOn]} />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </LinearGradient>
          )}

          {/* ── Notes ────────────────────────────────── */}
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.sectionTitle}>NOTES</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={[styles.cardAccent, { backgroundColor: '#8B5CF6' }]} />
            <View style={styles.cardBody}>
              <CustomInput
                label="Payment Notes"
                value={form.notes}
                onChangeText={v => dispatch(setPaymentField({ key: 'notes', value: v }))}
                placeholder="Optional notes…"
                multiline
              />
            </View>
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Sticky Action Bar ─────────────────────── */}
      <View style={styles.actionBar}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1.4 }}>
          <TouchableOpacity style={styles.recordBtn} onPress={handleSave} activeOpacity={0.7} disabled={form.isSaving}>
            <LinearGradient colors={['#059669', '#047857']} style={styles.recordBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Feather name="check-circle" size={16} color="#FFFFFF" />
              <Text style={styles.recordBtnText}>{form.isSaving ? 'Recording…' : 'Record Payment'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
const SummaryRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({ label, value, valueColor }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
  </View>
);

// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  safeTop: { backgroundColor: P.headerFrom },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
    paddingTop: spacing.sm, paddingBottom: spacing.lg,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  headerCenter: { flex: 1, marginLeft: spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', fontFamily: THEME.typography.fontFamily },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  headerBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm, gap: spacing.xs + 2 },
  sectionLabelRow2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', fontFamily: THEME.typography.fontFamily, letterSpacing: 1 },
  sectionHint: { fontSize: 12, fontWeight: '600', color: '#94A3B8', fontFamily: THEME.typography.fontFamily },

  sectionCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    overflow: 'hidden', ...shadows.small, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md },
  rowFields: { flexDirection: 'row' },

  payFullChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0',
    borderRadius: 20, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2, marginTop: spacing.xs,
  },
  payFullChipText: { fontSize: 13, fontWeight: '700', color: '#059669', fontFamily: THEME.typography.fontFamily },

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md, paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  emptyIconBg: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, marginBottom: 2 },
  emptyText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', fontFamily: THEME.typography.fontFamily, lineHeight: 18 },
  allocError: { fontSize: 12, color: '#EF4444', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: '#FEF2F2', borderRadius: borderRadius.sm, marginBottom: spacing.xs, fontFamily: THEME.typography.fontFamily },

  tableWrap: { backgroundColor: '#FFFFFF', borderRadius: borderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', ...shadows.small },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm, backgroundColor: '#F8FAFC', borderBottomWidth: 2, borderBottomColor: '#059669',
  },
  thText: { fontSize: 10, fontWeight: '700', color: '#059669', textTransform: 'uppercase', fontFamily: THEME.typography.fontFamily, letterSpacing: 0.5 },
  thRight: { textAlign: 'right' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm, backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9',
  },
  tableRowEven: { backgroundColor: '#FAFBFC' },
  tableRowChecked: { backgroundColor: '#F0FDF4' },
  tdText: { fontSize: 12, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  tdRight: { textAlign: 'right' },

  checkboxWrap: { width: 32, alignItems: 'center' },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  checkboxChecked: { backgroundColor: '#059669', borderColor: '#059669' },

  summaryCard: { borderRadius: borderRadius.md + 4, padding: spacing.md + 4, marginTop: spacing.lg, ...shadows.large },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginBottom: spacing.sm },
  summaryHeaderText: { fontSize: 13, fontWeight: '700', color: '#F59E0B', fontFamily: THEME.typography.fontFamily, letterSpacing: 0.5 },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: spacing.xs + 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs + 1 },
  summaryLabel: { fontSize: 13, color: 'rgba(241,245,249,0.6)', fontFamily: THEME.typography.fontFamily },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#F1F5F9', fontFamily: THEME.typography.fontFamily },

  creditToggleRow: {
    flexDirection: 'row', alignItems: 'center', paddingTop: spacing.sm, marginTop: spacing.xs,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  creditToggleLabel: { fontSize: 13, fontWeight: '700', color: '#F1F5F9', fontFamily: THEME.typography.fontFamily },
  creditToggleHint: { fontSize: 11, color: 'rgba(241,245,249,0.5)', marginTop: 2, lineHeight: 16, fontFamily: THEME.typography.fontFamily },
  toggleSwitch: { width: 44, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', paddingHorizontal: 2, marginLeft: spacing.sm },
  toggleSwitchOn: { backgroundColor: '#059669' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', ...shadows.small },
  toggleKnobOn: { transform: [{ translateX: 18 }] },

  actionBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E2E8F0', ...shadows.card,
  },
  cancelBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
    borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#64748B', fontFamily: THEME.typography.fontFamily },
  recordBtn: { borderRadius: borderRadius.md, overflow: 'hidden', ...shadows.card },
  recordBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: 14 },
  recordBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: THEME.typography.fontFamily },
});

export default ReceivePaymentScreen;
