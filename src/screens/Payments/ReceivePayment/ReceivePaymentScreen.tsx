// ═══════════════════════════════════════════════════════
// FinMatrix — Receive Payment Screen
// Premium Enterprise UI
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { THEME } from '../../../utils/theme';

// Design-system tokens (see src/theme/theme.ts).
const { colors, spacing, radius, shadows, typography } = THEME;
const PANEL = THEME.form.summaryPanel;
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
import { PrimaryButton, SecondaryButton } from '../../../components/form/FormUI';
import { DateField, ReportHeader, HEADER_NAVY } from '../../../components/reports/ReportUI';
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
const ReceivePaymentScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PaymentRoute>();
  const dispatch = useAppDispatch();

  const preCustomerId = route.params?.customerId;
  const preInvoiceId = route.params?.invoiceId;

  const form = useAppSelector(selectReceivePaymentState);
  const customers = useAppSelector(selectCustomers);

  // ── Success overlay state ───────────────────────
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [successSub, setSuccessSub] = useState('');
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

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

  const animateSuccess = useCallback(() => {
    successScale.setValue(0);
    successOpacity.setValue(0);
    checkScale.setValue(0);
    setShowSuccess(true);
    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();
    });
  }, [successScale, successOpacity, checkScale]);

  const handleSuccessDismiss = useCallback(() => {
    Animated.timing(successOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowSuccess(false);
      navigation.goBack();
    });
  }, [successOpacity, navigation]);

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

      const amt = formatCurrency(paymentAmount, 'Rs ');
      if (overpayment > 0 && form.saveOverpaymentAsCredit) {
        setSuccessMsg(amt);
        setSuccessSub(`${formatCurrency(overpayment, 'Rs ')} saved as customer credit`);
      } else {
        setSuccessMsg(amt);
        setSuccessSub(`Payment from ${form.customerName} recorded`);
      }
      animateSuccess();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record payment.');
    }
  }, [dispatch, validate, paymentAmount, overpayment, form.saveOverpaymentAsCredit, form.customerName, animateSuccess]);

  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <ReportHeader
        title={'Receive Payment'}
        subtitle={'Record an incoming payment'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.neutral100 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Payment Details ─────────────────────── */}
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.actionGreen }]} />
            <Text style={styles.sectionTitle}>PAYMENT DETAILS</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={[styles.cardAccent, { backgroundColor: colors.actionGreen }]} />
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
                <View style={{ flex: 1, marginRight: spacing.xs }}>
                  <DateField
                    label="Payment Date *"
                    value={form.paymentDate}
                    onChangeText={v => dispatch(setPaymentField({ key: 'paymentDate', value: v }))}
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
                  <Feather name="zap" size={14} color={colors.actionGreen} />
                  <Text style={styles.payFullChipText}>
                    Pay in Full ({formatCurrency(totalOutstanding, 'Rs ')})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Outstanding Invoices ─────────────────── */}
          <View style={styles.sectionLabelRow2}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs + 2 }}>
              <View style={[styles.sectionDot, { backgroundColor: colors.info }]} />
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
                <Feather name="user" size={20} color={colors.info} />
              </View>
              <Text style={styles.emptyTitle}>Select a customer</Text>
              <Text style={styles.emptyText}>Pick a customer above to see their outstanding invoices.</Text>
            </View>
          ) : !hasOutstanding ? (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconBg, { backgroundColor: colors.actionGreenLighter }]}>
                <Feather name="check-circle" size={20} color={colors.actionGreen} />
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
                      {row.checked && <Feather name="check" size={13} color={colors.neutral0} />}
                    </View>
                  </View>
                  <Text style={[styles.tdText, styles.tdStrong, { flex: 1.2 }]}>{row.invoiceNumber}</Text>
                  <Text style={[styles.tdText, styles.tdRight, { flex: 1 }]}>{formatDate(row.dueDate)}</Text>
                  <Text style={[styles.tdText, styles.tdRight, { flex: 1 }]}>{formatCurrency(row.balance, 'Rs ')}</Text>
                  <Text
                    style={[styles.tdText, styles.tdRight, styles.tdStrong, { flex: 1 }, row.allocated > 0 && { color: colors.success }]}
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
              colors={PANEL.gradient}
              style={styles.summaryCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.summaryHeader}>
                <Feather name="credit-card" size={16} color={PANEL.accent} />
                <Text style={styles.summaryHeaderText}>Payment Summary</Text>
              </View>
              <View style={styles.summaryDivider} />
              <SummaryRow label="Payment Amount" value={formatCurrency(paymentAmount, 'Rs ')} />
              <SummaryRow label="Applied to Invoices" value={formatCurrency(totalAllocated, 'Rs ')} valueColor={totalAllocated > 0 ? PANEL.positive : undefined} />
              {overpayment > 0 && (
                <>
                  <SummaryRow label="Unapplied Amount" value={formatCurrency(overpayment, 'Rs ')} valueColor={form.saveOverpaymentAsCredit ? PANEL.caution : PANEL.negative} />
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
            <View style={[styles.sectionDot, { backgroundColor: colors.secondary }]} />
            <Text style={styles.sectionTitle}>NOTES</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={[styles.cardAccent, { backgroundColor: colors.secondary }]} />
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

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Sticky Action Bar ─────────────────────── */}
      <View style={styles.actionBar}>
        <View style={{ flex: 1, marginRight: spacing.xs }}>
          <SecondaryButton title="Cancel" onPress={() => navigation.goBack()} disabled={form.isSaving} />
        </View>
        <View style={{ flex: 1.4 }}>
          <PrimaryButton
            title={form.isSaving ? 'Recording…' : 'Record Payment'}
            onPress={handleSave}
            isLoading={form.isSaving}
            icon={<Feather name="check-circle" size={16} color={colors.neutral0} />}
          />
        </View>
      </View>

      {/* ── Success Overlay Modal ──────────────────── */}
      <Modal visible={showSuccess} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[sStyles.overlay, { opacity: successOpacity }]}>
          <Animated.View style={[sStyles.card, { transform: [{ scale: successScale }] }]}>
            <Animated.View style={[sStyles.checkCircle, { transform: [{ scale: checkScale }] }]}>
              <Feather name="check" size={40} color={colors.neutral0} />
            </Animated.View>
            <Text style={sStyles.title}>Payment Recorded!</Text>
            <Text style={sStyles.amount}>{successMsg}</Text>
            <Text style={sStyles.sub}>{successSub}</Text>
            <View style={sStyles.divider} />
            <TouchableOpacity style={sStyles.btn} onPress={handleSuccessDismiss} activeOpacity={0.8}>
              <LinearGradient colors={[colors.actionGreen, colors.actionGreenDark]} style={sStyles.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Feather name="arrow-left" size={16} color="#FFF" />
                <Text style={sStyles.btnText}>Back to Invoice</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>
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
  container: { flex: 1, backgroundColor: colors.neutral100 },
  safeTop: { backgroundColor: HEADER_NAVY[0] },


  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xs, gap: spacing.xxs + 2 },
  sectionLabelRow2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.xs },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { ...THEME.form.sectionTitle },
  sectionHint: { ...typography.labelSm, color: colors.neutral400 },

  sectionCard: {
    flexDirection: 'row', backgroundColor: colors.neutral0, borderRadius: radius.lg,
    overflow: 'hidden', ...shadows.xs, borderWidth: 1, borderColor: colors.neutral200,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md },
  rowFields: { flexDirection: 'row' },

  payFullChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    backgroundColor: colors.actionGreenLighter, borderWidth: 1, borderColor: colors.successLight,
    borderRadius: 20, paddingHorizontal: spacing.xs + 2, paddingVertical: spacing.xxs + 2, marginTop: spacing.xxs,
  },
  payFullChipText: { ...typography.labelMd, color: colors.actionGreen },

  emptyCard: {
    backgroundColor: colors.neutral0, borderRadius: radius.lg, paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral200, borderStyle: 'dashed',
  },
  emptyIconBg: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.infoLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxs,
  },
  emptyTitle: { ...typography.h5, color: colors.textPrimary, marginBottom: 2 },
  emptyText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  allocError: { ...typography.caption, color: colors.danger, paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, backgroundColor: colors.dangerLighter, borderRadius: radius.sm, marginBottom: spacing.xxs },

  tableWrap: { backgroundColor: colors.neutral0, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.neutral200, ...shadows.xs },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xxs + 2,
    paddingHorizontal: spacing.xs, backgroundColor: colors.neutral50, borderBottomWidth: 2, borderBottomColor: colors.actionGreen,
  },
  thText: { ...typography.overline, color: colors.actionGreen },
  thRight: { textAlign: 'right' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs, backgroundColor: colors.neutral0,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral100,
  },
  tableRowEven: { backgroundColor: colors.backgroundAlt },
  tableRowChecked: { backgroundColor: colors.actionGreenLighter },
  tdText: { ...typography.caption, color: colors.textPrimary },
  // labelSm carries emphasis at the same 12px, so an emphasised cell
  // never reflows the column.
  tdStrong: { ...typography.labelSm },
  tdRight: { textAlign: 'right' },

  checkboxWrap: { width: 32, alignItems: 'center' },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.neutral300,
    justifyContent: 'center', alignItems: 'center', backgroundColor: colors.neutral0,
  },
  checkboxChecked: { backgroundColor: colors.actionGreen, borderColor: colors.actionGreen },

  summaryCard: { borderRadius: radius.lg + 4, padding: spacing.md + 4, marginTop: spacing.xl, ...shadows.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs + 2, marginBottom: spacing.xs },
  summaryHeaderText: { ...typography.labelMd, color: PANEL.accent, letterSpacing: 0.5 },
  summaryDivider: { height: 1, backgroundColor: PANEL.divider, marginVertical: spacing.xxs + 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xxs + 1 },
  summaryLabel: { ...typography.bodySm, color: PANEL.label },
  summaryValue: { ...typography.h5, color: PANEL.text, fontVariant: ['tabular-nums'] },

  creditToggleRow: {
    flexDirection: 'row', alignItems: 'center', paddingTop: spacing.xs, marginTop: spacing.xxs,
    borderTopWidth: 1, borderTopColor: PANEL.divider,
  },
  creditToggleLabel: { ...typography.labelMd, color: PANEL.text },
  creditToggleHint: { ...typography.caption, color: PANEL.label, marginTop: 2 },
  toggleSwitch: { width: 44, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', paddingHorizontal: 2, marginLeft: spacing.xs },
  toggleSwitchOn: { backgroundColor: colors.actionGreen },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.neutral0, ...shadows.xs },
  toggleKnobOn: { transform: [{ translateX: 18 }] },

  actionBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2, backgroundColor: colors.neutral0,
    borderTopWidth: 1, borderTopColor: colors.neutral200, ...shadows.sm,
  },
});

// ── Success Overlay Styles ────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const sStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.75)',
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    width: SCREEN_W * 0.82, backgroundColor: colors.neutral0,
    borderRadius: 24, paddingVertical: 36, paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25, shadowRadius: 24, elevation: 20,
  },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.actionGreen, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.actionGreen, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  title: {
    ...typography.h2, color: colors.neutral900, marginBottom: 6,
  },
  amount: {
    ...typography.h1, color: colors.actionGreen, marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  sub: {
    ...typography.bodySm, color: colors.neutral500, textAlign: 'center', lineHeight: 20,
  },
  divider: {
    width: '80%', height: 1, backgroundColor: colors.neutral200,
    marginVertical: 22,
  },
  btn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  btnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  btnText: {
    ...typography.h4, color: colors.neutral0,
  },
});

export default ReceivePaymentScreen;
