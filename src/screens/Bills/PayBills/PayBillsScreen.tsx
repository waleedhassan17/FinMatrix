// ═══════════════════════════════════════════════════════
// FinMatrix — Pay Bills Screen
// Premium Enterprise UI
// ═══════════════════════════════════════════════════════

import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { THEME } from '../../../utils/theme';
const PANEL = THEME.form.summaryPanel;
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectPayBillsState,
  setPayBillField,
  setPayBillVendor,
  toggleBillCheck,
  setPayAmount,
  openForSummary,
  maxCashOf,
  payAllBills,
  setBillAllocation,
  toggleAllBills,
  setUseCredits,
  setCreditUse,
  fetchVendorCreditsForPayment,
  preselectBill,
  setPayBillErrors,
  resetPayBills,
  fetchBillsForPayment,
  savePayment,
  billCreditSpreadOf,
  cashOf,
  clearPaymentProof,
  uploadPaymentProof,
  selectPayBillProof,
} from './payBillsSlice';
import { useVendorPicker } from '../../../hooks/usePartyPicker';
import { fetchBills } from '../BillList/billListSlice';
import { fetchAccounts, selectAccounts } from '../../ChartOfAccounts/COAList/coaListSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomButton from '../../../Custom-Components/CustomButton';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import { PrimaryButton, SecondaryButton } from '../../../components/form/FormUI';
import { DateField, ReportHeader, HEADER_NAVY, LoadingBlock } from '../../../components/reports/ReportUI';
import { formatCurrency, formatDate, lakhCroreWords } from '../../../utils/formatters';
import type { PaymentMethod } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';
import { creditAvailable, isCreditOverUsed } from '../../../models/creditSpreadModel';
import Toast from 'react-native-toast-message';
import { useCapability } from '../../../hooks/useCapability';
import { vendorOptionLabel } from '../../../models/partyCodeModel';

// Design-system tokens (see src/theme/theme.ts).
const { colors, radius, shadows, spacing, typography } = THEME;

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type PayRoute = RouteProp<TransactionsStackParamList, 'PayBills'>;

const METHOD_OPTIONS = [
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cash', value: 'cash' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Online (EasyPaisa / JazzCash)', value: 'online' },
];

// ═══════════════════════════════════════════════════════
const PayBillsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PayRoute>();
  const dispatch = useAppDispatch();

  const preVendorId = route.params?.vendorId;
  const preBillId = route.params?.billId;
  // From the payables summary: every bill ticked (see openForSummary).
  const fromSummary = !!route.params?.fromSummary;

  const form = useAppSelector(selectPayBillsState);
  const proof = useAppSelector(selectPayBillProof);
  // Its own picker list (up to 200, as on the web), plus the vendor this
  // screen was opened for when they are not among those.
  const { vendors } = useVendorPicker(preVendorId);
  const accounts = useAppSelector(selectAccounts);

  const vendorOptions = useMemo(
    () => vendors.filter(v => v.isActive).map(v => ({ label: vendorOptionLabel(v), value: v.id })),
    [vendors],
  );

  // Cash/Bank asset accounts from the backend chart of accounts —
  // the payment source QuickBooks lets you pick when paying bills.
  const payableAccounts = useMemo(
    () => accounts.filter(a => a.isActive && a.type === 'asset' && ['Cash', 'Bank'].includes(String(a.subType))),
    [accounts],
  );

  // Show what each account actually holds. Paying from an account without the
  // funds is legitimate for a bank (an overdraft), but for Cash it means the
  // books claim you handed over notes you did not have — and it is invisible
  // until the balance is already negative.
  const bankAccountOptions = useMemo(
    () =>
      payableAccounts.map(a => ({
        label: `${a.name} (${a.code}) · ${formatCurrency(a.balance, 'Rs ')}`,
        value: a.id,
      })),
    [payableAccounts],
  );

  const generatePaymentNumber = useCallback(() => `BPAY-${String(Date.now()).slice(-6)}`, []);

  /** Idempotency key for the payment being recorded. See handleSave. */
  const idempotencyKey = useRef('');

  useEffect(() => {
    dispatch(fetchAccounts());
    dispatch(setPayBillField({ key: 'reference', value: generatePaymentNumber() }));
    // Today, read now rather than whenever the bundle started. This one is the
    // sharpest of the set: paymentDate becomes the accounting date of a posted
    // cash payment, so a stale value writes money out of the bank on the wrong day.
    dispatch(setPayBillField({ key: 'paymentDate', value: dayjs().format('YYYY-MM-DD') }));
    return () => { dispatch(resetPayBills()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (preVendorId && !form.vendorId && vendors.length > 0) {
      const vendor = vendors.find(v => v.id === preVendorId);
      if (vendor) dispatch(setPayBillVendor({ id: vendor.id, name: vendor.name }));
    }
  }, [preVendorId, form.vendorId, vendors, dispatch]);

  // The vendor's unpaid bills and their credit — both from the server, the
  // figures the web's Pay Bills works from.
  useEffect(() => {
    if (!form.vendorId) return;
    dispatch(fetchBillsForPayment(form.vendorId));
    dispatch(fetchVendorCreditsForPayment(form.vendorId));
  }, [form.vendorId, dispatch]);

  useEffect(() => {
    if (preBillId && form.outstandingRows.length > 0) dispatch(preselectBill(preBillId));
  }, [preBillId, form.outstandingRows.length, dispatch]);

  useEffect(() => {
    if (fromSummary) dispatch(openForSummary());
    // Once, on arrival from the summary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVendorChange = useCallback(
    (vendorId: string) => {
      const vendor = vendors.find(v => v.id === vendorId);
      if (!vendor) return;
      dispatch(setPayBillVendor({ id: vendor.id, name: vendor.name }));
    },
    [vendors, dispatch],
  );

  // Each ticked bill's figure is what it is settled by. Vendor credit covers
  // the first of it, oldest bill first; the rest is cash — the web's split.
  const totalSettled = useMemo(
    () => Math.round(form.outstandingRows.reduce((s, r) => s + (r.checked ? r.allocated : 0), 0) * 100) / 100,
    [form.outstandingRows],
  );
  const spread = useMemo(
    () => billCreditSpreadOf(form),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.outstandingRows, form.credits, form.useCredits],
  );
  const creditHeld = creditAvailable(form.credits);
  const creditUsed = form.useCredits ? spread.used : 0;
  const creditOverUse = form.useCredits && isCreditOverUsed(form.credits);
  /** What leaves the bank. */
  const totalAllocated = useMemo(
    () => Math.round(form.outstandingRows.reduce((s, r) => s + cashOf(r), 0) * 100) / 100,
    [form.outstandingRows],
  );
  const checkedCount = form.outstandingRows.filter(r => r.checked && r.allocated > 0).length;
  const allChecked = form.outstandingRows.length > 0 && checkedCount === form.outstandingRows.length;
  const payFromAccount = useMemo(
    () => payableAccounts.find(a => a.id === form.bankAccountId),
    [payableAccounts, form.bankAccountId],
  );

  // Cash is leaving the account, so evidence and an account are required. A
  // credit-only settlement moves none and posts nothing.
  const needsProof = totalAllocated > 0.004;

  const overdraw = useMemo(() => {
    const acct = payableAccounts.find(a => a.id === form.bankAccountId);
    if (!acct || totalAllocated <= 0 || totalAllocated <= acct.balance) return null;
    return {
      name: acct.name,
      balance: acct.balance,
      shortfall: Math.round((totalAllocated - acct.balance) * 100) / 100,
    };
  }, [payableAccounts, form.bankAccountId, totalAllocated]);

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.vendorId) errs.vendorId = 'Select a vendor';
    // Money only needs an account when some of it leaves the bank.
    if (needsProof && !form.bankAccountId) errs.bankAccountId = 'Select the account you are paying from';
    if (!form.paymentDate) errs.paymentDate = 'Payment date is required';
    if (creditOverUse) errs.credits = 'A credit is set to use more than it holds';
    // A vendor has no advance account: a typed payment cannot be more than the
    // ticked bills owe after credit.
    if (form.payAmount.trim() && (parseFloat(form.payAmount) || 0) > maxCashOf(form) + 0.004) {
      errs.payAmount = `More than the ticked bills owe after credit (${formatCurrency(maxCashOf(form), 'Rs ')}).`;
    }
    // The total IS the sum of the rows, so there is no separate amount to
    // validate and no way to overpay.
    if (totalSettled <= 0) errs.allocations = 'Choose at least one bill to pay';
    return errs;
  }, [form, needsProof, creditOverUse, totalSettled]);

  // ── Payment proof ───────────────────────────────
  // Uploaded the moment it is picked, so by the time Record Payment is
  // pressable the file is already durable on the server. The button below
  // stays disabled until `proof.id` exists — not merely until a file is
  // chosen — so a payment can never be recorded against a failed upload.
  const startUpload = useCallback(
    (file: { uri: string; name: string; mimeType: string }) => {
      dispatch(uploadPaymentProof(file));
    },
    [dispatch],
  );

  const pickImage = useCallback(
    async (fromCamera: boolean) => {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          fromCamera ? 'Camera access needed' : 'Photo access needed',
          'Allow access so the receipt can be attached to this payment.',
        );
        return;
      }
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      startUpload({
        uri: a.uri,
        name: a.fileName ?? `receipt-${Date.now()}.jpg`,
        mimeType: a.mimeType ?? 'image/jpeg',
      });
    },
    [startUpload],
  );

  const pickDocument = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    startUpload({
      uri: a.uri,
      name: a.name ?? `proof-${Date.now()}`,
      mimeType: a.mimeType ?? 'application/pdf',
    });
  }, [startUpload]);

  const chooseProof = useCallback(() => {
    Alert.alert('Attach payment proof', 'Where is the receipt?', [
      { text: 'Take a photo', onPress: () => pickImage(true) },
      { text: 'Choose a photo', onPress: () => pickImage(false) },
      { text: 'Choose a PDF', onPress: pickDocument },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pickImage, pickDocument]);

  // Cash leaving the bank: staff send it to the owner, who approves before
  // any money moves.
  const payCap = useCapability('bill.pay');

  const handleSave = useCallback(async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      dispatch(setPayBillErrors(validationErrors));
      Alert.alert('Validation Error', Object.values(validationErrors)[0]);
      return;
    }

    // What each ticked bill is settled by — credit and cash together.
    const settledRows = form.outstandingRows.filter(r => r.checked && r.allocated > 0);

    // One key per payment ATTEMPT, held across retries of it. If the request
    // reaches the server but the reply is lost, the user taps Save again — and
    // the server, keying on (company, Idempotency-Key), replays the first
    // outcome instead of paying the vendor a second time. Cleared only once the
    // payment is safely recorded, so the next payment gets a fresh key.
    if (!idempotencyKey.current) idempotencyKey.current = uuidv4();

    try {
      const reference = form.reference || generatePaymentNumber();
      const saved: any = await dispatch(
        savePayment({
          paymentNumber: reference,
          idempotencyKey: idempotencyKey.current,
        }),
      ).unwrap();
      idempotencyKey.current = '';
      await dispatch(fetchBills());

      // Paying a bill is the cash-out moment, so staff file a request instead.
      // No money has moved, so the payment RECEIPT below would be a lie — and
      // worse, it reads as proof the supplier was paid.
      if (saved?.data?.pending ?? saved?.pending) {
        Toast.show({
          type: 'success',
          text1: 'Sent to the owner for approval',
          text2: 'The bill stays unpaid until they approve the payment.',
        });
        navigation.goBack();
        return;
      }

      // `replace`, not `navigate`: the receipt takes this screen's place so
      // Back cannot return to a filled-in form and post the payment twice.
      navigation.replace('PaymentSuccess', {
        amount: totalAllocated,
        creditApplied: creditUsed,
        vendorName: form.vendorName,
        // Credit alone takes nothing out of an account.
        accountName: needsProof ? (payFromAccount?.name ?? '') : '',
        paymentDate: form.paymentDate,
        reference,
        method: form.method,
        billId: preBillId,
        fromSummary,
        lines: settledRows.map(r => ({
          billNumber: r.billNumber,
          applied: r.allocated,
          remaining: Math.round((r.balance - r.allocated) * 100) / 100,
        })),
      });
    } catch (e: any) {
      // The API says exactly what is wrong (e.g. PAYMENT_EXCEEDS_BALANCE with
      // the amounts) — showing "try again" instead just hides it.
      Alert.alert('Error', e?.message || 'Failed to record payment. Please try again.');
    }
  }, [form, totalAllocated, creditUsed, needsProof, payFromAccount, preBillId, dispatch, navigation, validate, generatePaymentNumber]);

  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <ReportHeader
        title={'Pay Bills'}
        subtitle={'Record a vendor payment'}
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
            <View style={[styles.sectionDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.sectionTitle}>PAYMENT DETAILS</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={[styles.cardAccent, { backgroundColor: colors.danger }]} />
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
                label={needsProof || creditUsed <= 0 ? 'Pay from account *' : 'Pay from account'}
                options={bankAccountOptions}
                value={form.bankAccountId}
                onChange={v => dispatch(setPayBillField({ key: 'bankAccountId', value: v }))}
                placeholder="Select the account…"
                error={form.errors.bankAccountId}
              />
              <Text style={styles.fieldHint}>
                {!needsProof && creditUsed > 0
                  ? 'Not needed: vendor credit covers what is being settled.'
                  : 'The account the money leaves — choose Cash for a cash payment. The method above is just how you paid.'}
              </Text>
              {/* A warning, not a block: a bank overdraft is a real thing. */}
              {!!overdraw && (
                <Text style={styles.overdrawNote}>
                  This pays {formatCurrency(totalAllocated, 'Rs ')} from {overdraw.name}, which holds{' '}
                  {formatCurrency(overdraw.balance, 'Rs ')}. It will go {formatCurrency(overdraw.shortfall, 'Rs ')} overdrawn.
                </Text>
              )}
              <View style={styles.rowFields}>
                <View style={{ flex: 1, marginRight: spacing.xs }}>
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
              {form.outstandingRows.length > 0 && (
                <>
                  <CustomInput
                    label="Amount to pay (Rs)"
                    value={form.payAmount}
                    onChangeText={v => dispatch(setPayAmount(v))}
                    placeholder="Each ticked bill in full"
                    keyboardType="decimal-pad"
                    error={form.errors.payAmount}
                  />
                  <Text style={styles.fieldHint}>
                    {lakhCroreWords(form.payAmount)
                      ? `= ${lakhCroreWords(form.payAmount)}`
                      : 'Optional: type a sum and it is spread over the ticked bills, oldest first.'}
                  </Text>
                </>
              )}
              <View style={styles.amountRow}>
                <View style={{ flex: 1, marginRight: spacing.xs }}>
                  <View style={styles.totalReadout}>
                    <Text style={styles.totalReadoutLabel}>{creditUsed > 0 ? 'Cash to pay' : 'Total payment'}</Text>
                    <Text style={styles.totalReadoutValue}>{formatCurrency(totalAllocated, 'Rs ')}</Text>
                    <Text style={styles.totalReadoutHint}>
                      {creditUsed > 0
                        ? 'The bills below, less the vendor credit used on them.'
                        : 'Sum of the amounts you enter against each bill below.'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.payAllChip, form.outstandingRows.length === 0 && styles.payAllChipDisabled]}
                  onPress={() => dispatch(payAllBills())}
                  activeOpacity={0.7}
                  disabled={form.outstandingRows.length === 0}
                >
                  <Feather name="zap" size={14} color={colors.danger} />
                  <Text style={styles.payAllChipText}>Pay All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Outstanding Bills ─────────────────────── */}
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.secondary }]} />
            <Text style={styles.sectionTitle}>OUTSTANDING BILLS</Text>
          </View>

          {form.isLoadingBills ? (
            <LoadingBlock label="Loading outstanding bills…" />
          ) : form.outstandingRows.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBg}>
                <Feather name="file-text" size={20} color={colors.secondary} />
              </View>
              <Text style={styles.emptyTitle}>
                {form.vendorId ? 'No outstanding bills' : 'Select a vendor'}
              </Text>
              <Text style={styles.emptyText}>
                {form.vendorId
                  ? 'Everything from this vendor is settled. Nothing to pay.'
                  : 'Pick a vendor above to see their outstanding bills.'}
              </Text>
              {!!form.vendorId && (
                <View style={styles.emptyCta}>
                  <CustomButton
                    title="Create a bill"
                    onPress={() => navigation.push('BillForm', { vendorId: form.vendorId })}
                    variant="secondary"
                    size="sm"
                  />
                </View>
              )}
            </View>
          ) : (
            <>
              {form.errors.allocations && (
                <Text style={styles.errorText}>{form.errors.allocations}</Text>
              )}
              <View style={styles.tableWrap}>
                <View style={styles.tableHeader}>
                  <TouchableOpacity
                    style={styles.checkboxWrap}
                    onPress={() => dispatch(toggleAllBills())}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <View style={[styles.checkbox, allChecked && styles.checkboxChecked]}>
                      {allChecked && <Feather name="check" size={13} color={colors.neutral0} />}
                    </View>
                  </TouchableOpacity>
                  <Text style={[styles.thText, { flex: 1.3 }]}>Bill</Text>
                  <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Bill Amt</Text>
                  <Text style={[styles.thText, styles.thRight, { flex: 1 }]}>Balance</Text>
                  <Text style={[styles.thText, styles.thRight, { width: 96 }]}>Settle</Text>
                </View>
                {form.outstandingRows.map((row, idx) => (
                  <View
                    key={row.billId}
                    style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven, row.checked && styles.tableRowChecked]}
                  >
                    <TouchableOpacity
                      style={styles.checkboxWrap}
                      onPress={() => dispatch(toggleBillCheck(row.billId))}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      <View style={[styles.checkbox, row.checked && styles.checkboxChecked]}>
                        {row.checked && <Feather name="check" size={13} color={colors.neutral0} />}
                      </View>
                    </TouchableOpacity>
                    <View style={{ flex: 1.3 }}>
                      <Text style={[styles.tdText, styles.tdStrong]} numberOfLines={1}>{row.billNumber}</Text>
                      <Text style={styles.tdSub}>Due {formatDate(row.dueDate)}</Text>
                      {/* What the vendor's credit covers of it — the rest is cash. */}
                      {row.creditApplied > 0 && (
                        <Text style={[styles.creditChip, styles.creditChipOn]}>
                          {formatCurrency(row.creditApplied, 'Rs ')} from credit
                        </Text>
                      )}
                    </View>
                    {/* minWidth 0 lets a crore-sized figure wrap inside its
                        column instead of spilling over the one beside it. */}
                    <Text style={[styles.tdText, styles.tdRight, styles.amountCell]}>{formatCurrency(row.total, 'Rs ')}</Text>
                    <View style={styles.amountCell}>
                      <Text style={[styles.tdText, styles.tdRight]}>{formatCurrency(row.balance, 'Rs ')}</Text>
                    </View>
                    {/* Editable per bill: what this bill is settled by, credit
                        and cash together — this is what lets you settle a newer
                        bill in full while paying an older one in part. Clamped
                        to the balance in the reducer. */}
                    <TextInput
                      style={[styles.allocInput, row.allocated > 0 && styles.allocInputActive]}
                      value={row.allocated > 0 ? String(row.allocated) : ''}
                      onChangeText={(v: string) =>
                        dispatch(setBillAllocation({ billId: row.billId, value: v.replace(/[^0-9.]/g, '') }))
                      }
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="decimal-pad"
                      editable={!form.isSaving}
                    />
                  </View>
                ))}
                <View style={styles.tableTotalRow}>
                  <Text style={styles.tableTotalLabel}>
                    {checkedCount} of {form.outstandingRows.length} bill{form.outstandingRows.length === 1 ? '' : 's'}
                  </Text>
                  <Text style={styles.tableTotalValue}>{formatCurrency(totalSettled, 'Rs ')}</Text>
                </View>
              </View>
            </>
          )}

          {/* ── Vendor credit ─────────────────────────── */}
          {/* Open credits and ones already partly used. On by default, as on
              the web: spent first on the ticked bills, oldest first, before any
              cash; each credit's amount stays editable. */}
          {form.credits.length > 0 && (
            <>
              <View style={styles.sectionLabelRow}>
                <View style={[styles.sectionDot, { backgroundColor: colors.success }]} />
                <Text style={styles.sectionTitle}>VENDOR CREDIT</Text>
              </View>
              <View style={styles.sectionCard}>
                <View style={[styles.cardAccent, { backgroundColor: colors.success }]} />
                <View style={styles.cardBody}>
                  <View style={styles.creditHeadRow}>
                    <Text style={[styles.creditHeadText, { flex: 1 }]}>
                      {form.vendorName || 'This vendor'} has {formatCurrency(creditHeld, 'Rs ')} of credit —
                      spent first, oldest bill first, before any cash.
                    </Text>
                    <TouchableOpacity
                      onPress={() => dispatch(setUseCredits(!form.useCredits))}
                      activeOpacity={0.8}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: form.useCredits }}
                      accessibilityLabel="Use in this payment"
                      style={[styles.toggleSwitch, form.useCredits && styles.toggleSwitchOn]}
                    >
                      <View style={[styles.toggleKnob, form.useCredits && styles.toggleKnobOn]} />
                    </TouchableOpacity>
                  </View>
                  {form.useCredits && (
                    <>
                      {form.credits.map(c => {
                        const over = (parseFloat(c.use) || 0) > c.available + 0.004;
                        return (
                          <View key={c.id} style={styles.creditLine}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.creditRef} numberOfLines={1}>{c.reference || 'Vendor credit'}</Text>
                              <Text style={styles.creditMeta}>
                                {formatCurrency(c.available, 'Rs ')} available
                              </Text>
                              <Text style={styles.creditApplies}>
                                Applies {formatCurrency(spread.perCredit[c.id] ?? 0, 'Rs ')}
                              </Text>
                            </View>
                            <TextInput
                              style={[styles.creditInput, over && styles.creditInputOver]}
                              value={c.use}
                              onChangeText={v => dispatch(setCreditUse({ id: c.id, value: v }))}
                              keyboardType="decimal-pad"
                              accessibilityLabel={`Amount of ${c.reference || 'vendor credit'} to use`}
                              editable={!form.isSaving}
                            />
                          </View>
                        );
                      })}
                      <Text style={styles.creditTotalText}>Credits used {formatCurrency(creditUsed, 'Rs ')}</Text>
                      {!!form.errors.credits && <Text style={styles.errorText}>{form.errors.credits}</Text>}
                    </>
                  )}
                </View>
              </View>
            </>
          )}

          {/* ── Summary ─────────────────────────────── */}
          {totalSettled > 0 && (
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
              <SummaryRow label={`Bills selected (${checkedCount})`} value={formatCurrency(totalSettled, 'Rs ')} />
              {creditUsed > 0 && (
                <SummaryRow label="Vendor credit used" value={`− ${formatCurrency(creditUsed, 'Rs ')}`} valueColor={PANEL.positive} />
              )}
              <SummaryRow label={creditUsed > 0 ? 'Cash to pay' : 'Total payment'} value={formatCurrency(totalAllocated, 'Rs ')} />
              {!!payFromAccount && needsProof && (
                <SummaryRow
                  label={`${payFromAccount.name} after payment`}
                  value={formatCurrency(payFromAccount.balance - totalAllocated, 'Rs ')}
                  valueColor={payFromAccount.balance - totalAllocated < 0 ? PANEL.caution : undefined}
                />
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
                onChangeText={v => dispatch(setPayBillField({ key: 'notes', value: v }))}
                placeholder="Optional notes…"
                multiline
              />
            </View>
          </View>

          {/* ── Payment proof ────────────────────────── */}
          {/* Only when cash leaves the bank, as on the web: credit alone posts
              nothing and there is nothing to evidence. */}
          {needsProof && (
          <>
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.info }]} />
            <Text style={styles.sectionTitle}>PAYMENT PROOF</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={[styles.cardAccent, { backgroundColor: colors.info }]} />
            <View style={styles.cardBody}>
              <Text style={styles.proofHelp}>
                Attach a receipt, bank confirmation, or a photo of the cash voucher.
              </Text>

              {!proof.localUri ? (
                <TouchableOpacity style={styles.proofPick} onPress={chooseProof} activeOpacity={0.75}>
                  <Feather name="paperclip" size={16} color={colors.actionGreen} />
                  <Text style={styles.proofPickText}>Attach proof</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.proofRow}>
                  {proof.mimeType.startsWith('image/') ? (
                    <Image source={{ uri: proof.localUri }} style={styles.proofThumb} />
                  ) : (
                    <View style={[styles.proofThumb, styles.proofThumbDoc]}>
                      <Feather name="file-text" size={20} color={colors.textSecondary} />
                    </View>
                  )}

                  <View style={styles.proofMeta}>
                    <Text style={styles.proofName} numberOfLines={1}>{proof.name}</Text>
                    {proof.isUploading ? (
                      <View style={styles.proofStatusRow}>
                        <ActivityIndicator size="small" color={colors.actionGreen} />
                        <Text style={styles.proofStatus}>Uploading…</Text>
                      </View>
                    ) : proof.error ? (
                      <TouchableOpacity
                        onPress={() =>
                          startUpload({
                            uri: proof.localUri,
                            name: proof.name,
                            mimeType: proof.mimeType,
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={styles.proofRetry}>{proof.error} Tap to retry.</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.proofStatusRow}>
                        <Feather name="check-circle" size={12} color={colors.success} />
                        <Text style={[styles.proofStatus, { color: colors.success }]}>Attached</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => dispatch(clearPaymentProof())}
                    disabled={proof.isUploading}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Feather name="x" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          </>
          )}

          {/* ── Actions ──────────────────────────────── */}
          <View style={styles.btnRow}>
            <View style={{ flex: 1, marginRight: spacing.xs }}>
              <SecondaryButton title="Cancel" onPress={() => navigation.goBack()} disabled={form.isSaving} />
            </View>
            <View style={{ flex: 1.4 }}>
              {/* Gated on proof.id, not on a file being chosen: the upload must
                  have come back before money can move.

                  Only when cash actually moves, though. A settlement funded
                  entirely from vendor credit posts no payment — savePayment
                  sends it with no cash leg — so there is nothing to evidence
                  and demanding a receipt would just block it. */}
              <PrimaryButton
                title={
                  form.isSaving
                    ? 'Recording…'
                    : payCap.submitLabel(needsProof || creditUsed <= 0 ? 'Record Payment' : 'Apply Vendor Credit')
                }
                onPress={handleSave}
                isLoading={form.isSaving}
                disabled={form.isSaving || (needsProof && !proof.id)}
                icon={<Feather name="check-circle" size={16} color={colors.neutral0} />}
              />
            </View>
          </View>
          {needsProof && !proof.id && (
            <Text style={styles.proofGate}>
              Attach a payment proof to record this payment.
            </Text>
          )}
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
  // ── Payment proof ─────────────────────────────────
  proofHelp: {
    ...typography.caption, color: colors.textSecondary,
    lineHeight: 17, marginBottom: spacing.xs,
  },
  proofPick: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xxs,
    paddingVertical: spacing.xs + 4, borderRadius: radius.sm,
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.actionGreen + '55',
    backgroundColor: colors.actionGreen + '08',
  },
  proofPickText: {
    ...typography.labelMd, color: colors.actionGreen,
  },
  proofRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  proofThumb: {
    width: 44, height: 44, borderRadius: radius.sm,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  proofThumbDoc: { alignItems: 'center', justifyContent: 'center' },
  proofMeta: { flex: 1 },
  proofName: {
    ...typography.labelMd, color: colors.textPrimary,
  },
  proofStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  proofStatus: {
    ...typography.caption, color: colors.textSecondary,
  },
  proofRetry: {
    ...typography.caption, color: colors.danger, marginTop: 2,
  },
  proofGate: {
    ...typography.caption, color: colors.textTertiary, textAlign: 'center',
    marginTop: spacing.xxs,
  },

  container: { flex: 1, backgroundColor: colors.neutral100 },
  safeTop: { backgroundColor: HEADER_NAVY[0] },

  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xxl },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xs, gap: spacing.xxs + 2 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { ...THEME.form.sectionTitle },

  sectionCard: {
    flexDirection: 'row', backgroundColor: colors.neutral0, borderRadius: radius.lg,
    overflow: 'hidden', ...shadows.xs, borderWidth: 1, borderColor: colors.neutral200,
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md },
  rowFields: { flexDirection: 'row' },
  overdrawNote: {
    ...THEME.typography.caption,
    color: colors.warning,
    marginTop: -spacing.xxs,
    marginBottom: spacing.xs,
  },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end' },

  payAllChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.xs + 4, paddingVertical: spacing.xs + 2,
    backgroundColor: colors.dangerLighter, borderWidth: 1, borderColor: colors.dangerLight,
    borderRadius: 20, marginBottom: spacing.xxs,
  },
  payAllChipText: { ...typography.labelMd, color: colors.danger },

  emptyCard: {
    backgroundColor: colors.neutral0, borderRadius: radius.lg, paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral200, borderStyle: 'dashed',
  },
  emptyIconBg: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxs },
  emptyTitle: { ...typography.h5, color: colors.textPrimary, marginBottom: 2 },
  emptyText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  errorText: { ...typography.caption, color: colors.danger, marginBottom: spacing.xs },

  tableWrap: { backgroundColor: colors.neutral0, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.neutral200, ...shadows.xs },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xxs + 2,
    paddingHorizontal: spacing.xs, backgroundColor: colors.neutral50, borderBottomWidth: 2, borderBottomColor: colors.danger,
  },
  thText: { ...typography.overline, color: colors.danger },
  thRight: { textAlign: 'right' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs, backgroundColor: colors.neutral0,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.neutral100,
  },
  tableRowEven: { backgroundColor: colors.backgroundAlt },
  tableRowChecked: { backgroundColor: colors.dangerLighter },
  tdText: { ...typography.caption, color: colors.textPrimary },
  // labelSm carries emphasis at the same 12px, so an emphasised cell
  // never reflows the column.
  tdStrong: { ...typography.labelSm },
  tdRight: { textAlign: 'right' },
  amountCell: { flex: 1, minWidth: 0, marginLeft: spacing.xxs },

  checkboxWrap: { width: 32, alignItems: 'center' },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.neutral300,
    justifyContent: 'center', alignItems: 'center', backgroundColor: colors.neutral0,
  },
  checkboxChecked: { backgroundColor: colors.danger, borderColor: colors.danger },

  summaryCard: { borderRadius: radius.lg + 4, padding: spacing.md + 4, marginTop: spacing.xl, ...shadows.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs + 2, marginBottom: spacing.xs },
  summaryHeaderText: { ...typography.labelMd, color: PANEL.accent, letterSpacing: 0.5 },
  summaryDivider: { height: 1, backgroundColor: PANEL.divider, marginVertical: spacing.xxs + 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xxs + 1 },
  summaryLabel: { ...typography.bodySm, color: PANEL.label },
  summaryValue: { ...typography.h5, color: PANEL.text, fontVariant: ['tabular-nums'] },

  creditHeadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  creditHeadText: { ...typography.caption, color: colors.textSecondary },
  creditLine: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.neutral200,
    marginTop: spacing.xs,
  },
  creditRef: { ...typography.labelMd, color: colors.textPrimary },
  creditMeta: { ...typography.caption, color: colors.textSecondary },
  creditApplies: { ...typography.caption, color: colors.success, marginTop: 2 },
  creditInput: {
    width: 104, height: 40, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.neutral300,
    paddingHorizontal: spacing.xs, textAlign: 'right', ...typography.bodySm, color: colors.textPrimary,
    backgroundColor: colors.neutral0,
  },
  creditInputOver: { borderColor: colors.danger },
  creditTotalText: { ...typography.labelSm, color: colors.textPrimary, textAlign: 'right', marginTop: spacing.xs },
  toggleSwitch: {
    width: 44, height: 26, borderRadius: 13, backgroundColor: colors.neutral300,
    justifyContent: 'center', paddingHorizontal: 2, marginLeft: spacing.xs,
  },
  toggleSwitchOn: { backgroundColor: colors.actionGreen },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.neutral0, ...shadows.xs },
  toggleKnobOn: { transform: [{ translateX: 18 }] },
  creditChip: { ...typography.labelSm, color: colors.success, marginTop: 2 },
  creditChipOn: { color: colors.actionGreenDark },
  emptyCta: { marginTop: 12 },
  fieldHint: { ...THEME.typography.caption, color: colors.textSecondary, marginTop: -spacing.xxs, marginBottom: spacing.xs },
  totalReadout: { paddingVertical: 4 },
  totalReadoutLabel: { ...THEME.typography.caption, color: colors.textSecondary },
  totalReadoutValue: { ...typography.h3, color: colors.textPrimary, marginTop: 2, fontVariant: ['tabular-nums'] },
  totalReadoutHint: { ...THEME.typography.caption, color: colors.textTertiary, marginTop: 2 },
  payAllChipDisabled: { opacity: 0.4 },
  tdSub: { ...THEME.typography.caption, color: colors.textTertiary, marginTop: 1 },
  allocInput: {
    width: 96,
    height: 38,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    textAlign: 'right',
    ...THEME.typography.bodySm,
    color: colors.textPrimary,
    backgroundColor: colors.neutral0,
  },
  allocInputActive: { borderColor: colors.success, backgroundColor: colors.actionGreenLighter },
  tableTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.neutral50,
  },
  tableTotalLabel: { ...THEME.typography.caption, color: colors.textSecondary },
  tableTotalValue: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  btnRow: { flexDirection: 'row', marginTop: spacing.xl, marginBottom: spacing.md },
});

export default PayBillsScreen;
