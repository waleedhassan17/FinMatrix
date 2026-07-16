// ═══════════════════════════════════════════════════════
// FinMatrix — Pay Bills Screen
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
import { fetchAccounts, selectAccounts } from '../../ChartOfAccounts/COAList/coaListSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import { PrimaryButton, SecondaryButton } from '../../../components/form/FormUI';
import { DateField, ReportHeader, HEADER_NAVY } from '../../../components/reports/ReportUI';
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

const P = {
  headerFrom: '#0A1628',
  headerTo: '#132F4C',
  accent: '#DE350B',
  accentLight: '#FFF1F0',
  totalsGold: '#F59E0B',
};

// ═══════════════════════════════════════════════════════
const PayBillsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PayRoute>();
  const dispatch = useAppDispatch();

  const preVendorId = route.params?.vendorId;
  const preBillId = route.params?.billId;

  const form = useAppSelector(selectPayBillsState);
  const vendors = useAppSelector(selectVendors);
  const accounts = useAppSelector(selectAccounts);

  const vendorOptions = useMemo(
    () => vendors.filter(v => v.isActive).map(v => ({ label: v.name, value: v.id })),
    [vendors],
  );

  // Cash/Bank asset accounts from the backend chart of accounts —
  // the payment source QuickBooks lets you pick when paying bills.
  const bankAccountOptions = useMemo(
    () =>
      accounts
        .filter(a => a.isActive && a.type === 'asset' && ['Cash', 'Bank'].includes(String(a.subType)))
        .map(a => ({ label: `${a.name} (${a.code})`, value: a.id })),
    [accounts],
  );

  const generatePaymentNumber = useCallback(() => `BPAY-${String(Date.now()).slice(-6)}`, []);

  useEffect(() => {
    dispatch(fetchVendors());
    dispatch(fetchAccounts());
    dispatch(fetchAllBillsForPayment());
    dispatch(setPayBillField({ key: 'reference', value: generatePaymentNumber() }));
    return () => { dispatch(resetPayBills()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (preVendorId && !form.vendorId && form.allBills.length > 0 && vendors.length > 0) {
      const vendor = vendors.find(v => v.id === preVendorId);
      if (vendor) dispatch(setPayBillVendor({ id: vendor.id, name: vendor.name }));
    }
  }, [preVendorId, form.vendorId, form.allBills, vendors, dispatch]);

  useEffect(() => {
    if (preBillId && form.outstandingRows.length > 0) dispatch(preselectBill(preBillId));
  }, [preBillId, form.outstandingRows.length, dispatch]);

  const handleVendorChange = useCallback(
    (vendorId: string) => {
      const vendor = vendors.find(v => v.id === vendorId);
      if (!vendor) return;
      dispatch(setPayBillVendor({ id: vendor.id, name: vendor.name }));
    },
    [vendors, dispatch],
  );

  const handleAmountChange = useCallback(
    (v: string) => {
      dispatch(setPayBillField({ key: 'amount', value: v.replace(/[^0-9.]/g, '') }));
      setTimeout(() => dispatch(distributePayBillAmount()), 0);
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

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.vendorId) errs.vendorId = 'Select a vendor';
    if (!form.bankAccountId) errs.bankAccountId = 'Select a bank account';
    if (!form.paymentDate) errs.paymentDate = 'Payment date is required';
    if (!form.amount || paymentAmount <= 0) errs.amount = 'Enter a positive amount';
    if (totalAllocated <= 0) errs.allocations = 'Allocate payment to at least one bill';
    return errs;
  }, [form, paymentAmount, totalAllocated]);

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
          `${formatCurrency(overpayment, 'Rs ')} exceeds the allocated amount. Continue?`,
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
      .map(r => ({ billId: r.billId, billNumber: r.billNumber, amount: r.allocated }));

    try {
      await dispatch(savePayment({ paymentNumber: form.reference || generatePaymentNumber(), allocations })).unwrap();
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
  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <ReportHeader
        title={'Pay Bills'}
        subtitle={'Record a vendor payment'}
        onBack={() => navigation.goBack()}
      />

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
                  <DateField
                    label="Payment Date *"
                    value={form.paymentDate}
                    onChangeText={v => dispatch(setPayBillField({ key: 'paymentDate', value: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomDropdown
                    label="Method"
                    options={METHOD_OPTIONS}
                    value={form.method}
                    onChange={v => dispatch(setPayBillField({ key: 'method', value: v as PaymentMethod }))}
                  />
                </View>
              </View>
              <CustomInput
                label="Reference / Cheque #"
                value={form.reference}
                onChangeText={v => dispatch(setPayBillField({ key: 'reference', value: v }))}
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
                <TouchableOpacity
                  style={styles.payAllChip}
                  onPress={() => dispatch(payAllBills())}
                  activeOpacity={0.7}
                  disabled={form.outstandingRows.length === 0}
                >
                  <Feather name="zap" size={14} color={P.accent} />
                  <Text style={styles.payAllChipText}>Pay All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Outstanding Bills ─────────────────────── */}
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionDot, { backgroundColor: '#6554C0' }]} />
            <Text style={styles.sectionTitle}>OUTSTANDING BILLS</Text>
          </View>

          {form.outstandingRows.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBg}>
                <Feather name="file-text" size={20} color="#6554C0" />
              </View>
              <Text style={styles.emptyTitle}>
                {form.vendorId ? 'No outstanding bills' : 'Select a vendor'}
              </Text>
              <Text style={styles.emptyText}>
                {form.vendorId ? 'This vendor has no outstanding bills.' : 'Pick a vendor above to see their outstanding bills.'}
              </Text>
            </View>
          ) : (
            <>
              {form.errors.allocations && (
                <Text style={styles.errorText}>{form.errors.allocations}</Text>
              )}
              <View style={styles.tableWrap}>
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
                    style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven, row.checked && styles.tableRowChecked]}
                    activeOpacity={0.6}
                    onPress={() => dispatch(toggleBillCheck(row.billId))}
                  >
                    <View style={styles.checkboxWrap}>
                      <View style={[styles.checkbox, row.checked && styles.checkboxChecked]}>
                        {row.checked && <Feather name="check" size={13} color="#FFFFFF" />}
                      </View>
                    </View>
                    <Text style={[styles.tdText, { flex: 1.2, fontWeight: '600' }]}>{row.billNumber}</Text>
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
            </>
          )}

          {/* ── Summary ─────────────────────────────── */}
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
              <SummaryRow label="Total Allocated" value={formatCurrency(totalAllocated, 'Rs ')} />
              {overpayment > 0 && (
                <SummaryRow label="Overpayment (Credit)" value={formatCurrency(overpayment, 'Rs ')} valueColor="#FBBF24" />
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
                onChangeText={v => dispatch(setPayBillField({ key: 'notes', value: v }))}
                placeholder="Optional notes…"
                multiline
              />
            </View>
          </View>

          {/* ── Actions ──────────────────────────────── */}
          <View style={styles.btnRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <SecondaryButton title="Cancel" onPress={() => navigation.goBack()} disabled={form.isSaving} />
            </View>
            <View style={{ flex: 1.4 }}>
              <PrimaryButton
                title={form.isSaving ? 'Recording…' : 'Record Payment'}
                onPress={handleSave}
                isLoading={form.isSaving}
                icon={<Feather name="check-circle" size={16} color="#FFFFFF" />}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  safeTop: { backgroundColor: HEADER_NAVY[0] },


  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm, gap: spacing.xs + 2 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', fontFamily: THEME.typography.fontFamily, letterSpacing: 1 },

  sectionCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    overflow: 'hidden', ...shadows.small, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md },
  rowFields: { flexDirection: 'row' },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end' },

  payAllChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm + 2,
    backgroundColor: P.accentLight, borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 20, marginBottom: spacing.xs,
  },
  payAllChipText: { fontSize: 13, fontWeight: '700', color: P.accent, fontFamily: THEME.typography.fontFamily },

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: borderRadius.md, paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  emptyIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, marginBottom: 2 },
  emptyText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', fontFamily: THEME.typography.fontFamily },
  errorText: { fontSize: 12, color: '#EF4444', marginBottom: spacing.sm, fontFamily: THEME.typography.fontFamily },

  tableWrap: { backgroundColor: '#FFFFFF', borderRadius: borderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', ...shadows.small },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm, backgroundColor: '#F8FAFC', borderBottomWidth: 2, borderBottomColor: '#DE350B',
  },
  thText: { fontSize: 10, fontWeight: '700', color: '#DE350B', textTransform: 'uppercase', fontFamily: THEME.typography.fontFamily, letterSpacing: 0.5 },
  thRight: { textAlign: 'right' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm, backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9',
  },
  tableRowEven: { backgroundColor: '#FAFBFC' },
  tableRowChecked: { backgroundColor: '#FEF2F2' },
  tdText: { fontSize: 12, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  tdRight: { textAlign: 'right' },

  checkboxWrap: { width: 32, alignItems: 'center' },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  checkboxChecked: { backgroundColor: '#DE350B', borderColor: '#DE350B' },

  summaryCard: { borderRadius: borderRadius.md + 4, padding: spacing.md + 4, marginTop: spacing.lg, ...shadows.large },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginBottom: spacing.sm },
  summaryHeaderText: { fontSize: 13, fontWeight: '700', color: '#F59E0B', fontFamily: THEME.typography.fontFamily, letterSpacing: 0.5 },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: spacing.xs + 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs + 1 },
  summaryLabel: { fontSize: 13, color: 'rgba(241,245,249,0.6)', fontFamily: THEME.typography.fontFamily },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#F1F5F9', fontFamily: THEME.typography.fontFamily },

  btnRow: { flexDirection: 'row', marginTop: spacing.lg, marginBottom: spacing.md },
});

export default PayBillsScreen;
