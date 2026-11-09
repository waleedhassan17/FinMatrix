// ═══════════════════════════════════════════════════════
// FinMatrix — Receive Payment Screen
// Premium Enterprise UI
// ═══════════════════════════════════════════════════════

import { useWhatsappConnect } from '../../../hooks/useWhatsappConnect';
import MessageTimeline from '../../../components/shared/messaging/MessageTimeline';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
  TextInput,
  Modal,
} from 'react-native';
import { Alert } from '../../../utils/alert';
import Toast from 'react-native-toast-message';
import { useCapability } from '../../../hooks/useCapability';
import { useRequesterName } from '../../../hooks/useRequesterName';
import { fetchApprovalById } from '../../../networks/approvals/approvalsNetwork';
import { decideApproval } from '../../Approvals/approvalsSlice';
import { APPROVAL_TYPE_EFFECTS, isPendingApproval } from '../../../models/approvalModel';
import type { ApprovalRequest } from '../../../models/approvalModel';
import RejectReasonModal from '../../Approvals/RejectReasonModal';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { THEME } from '../../../utils/theme';
const PANEL = THEME.form.summaryPanel;
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectReceivePaymentState,
  setPaymentField,
  setPaymentCustomer,
  openForCredit,
  openForSummary,
  setAllocatedAmount,
  setUseCredits,
  setCreditUse,
  toggleInvoiceCheck,
  payInFull,
  distributeAmount,
  setPaymentErrors,
  toggleSaveOverpaymentAsCredit,
  preselectInvoice,
  loadFromRequestPayload,
  applyRequestAllocations,
  resetReceivePayment,
  fetchOutstandingForPayment,
  fetchCreditsForPayment,
  savePayment,
  cashCapOf,
  creditSpreadOf,
  requestCashApplicationsOf,
} from './receivePaymentSlice';
import {
  CREDIT_SOURCE_LABELS,
  creditAvailable,
  isCreditOverUsed,
} from '../../../models/creditSpreadModel';
import { useCustomerPicker } from '../../../hooks/usePartyPicker';
import { fetchInvoices } from '../../Invoices/InvoiceList/invoiceListSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import { ActionBar, FormSectionHeader, PrimaryButton } from '../../../components/form/FormUI';
import { AllocationHeader, AllocationNote, AllocationRow } from '../../../components/transactions/AllocationRow';
import CustomButton from '../../../Custom-Components/CustomButton';
import { DateField, ReportHeader, HEADER_NAVY } from '../../../components/reports/ReportUI';
import { formatCurrency, formatDate, lakhCroreWords } from '../../../utils/formatters';
import type { PaymentMethod } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';
import { customerOptionLabel } from '../../../models/partyCodeModel';
import MoneyAccountDropdown from '../../../components/shared/MoneyAccountDropdown';

// Design-system tokens (see src/theme/theme.ts).
const { colors, radius, shadows, spacing, typography } = THEME;

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
  // "Use credit" on an invoice: credit on account switched on, that invoice first.
  const preUseCredits = !!route.params?.useCredits;
  // From the outstanding summary: every invoice ticked, credit on (see openForSummary).
  const fromSummary = !!route.params?.fromSummary;
  // Cash coming IN — the mirror of paying a bill, and gated the same way:
  // staff prepare it, the owner posts it.
  const payCap = useCapability('payment.receive');
  // Set when arriving from the approvals inbox or My Requests.
  const approvalRequestId = route.params?.fromApprovalRequestId;
  const isReviewing = !!approvalRequestId;
  const decideCap = useCapability('approvals.decide');
  const requestLoadedRef = React.useRef(false);
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const requesterName = useRequesterName(request?.requestedBy);
  const [deciding, setDeciding] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const allocationsAppliedRef = React.useRef(false);

  const form = useAppSelector(selectReceivePaymentState);
  // Its own picker list (up to 200, as on the web), plus the customer this
  // screen was opened for when they are not among those.
  const { customers } = useCustomerPicker(preCustomerId);

  // ── Success overlay state ───────────────────────
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState('Payment Recorded!');
  const [successMsg, setSuccessMsg] = useState('');
  const [successSub, setSuccessSub] = useState('');
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  /** One per attempt, held across its retries — see handleSave. */
  const idempotencyKey = useRef('');

  const customerOptions = useMemo(
    () =>
      customers
        .filter(c => c.isActive)
        .map(c => ({ label: customerOptionLabel(c), value: c.id })),
    [customers],
  );

  useEffect(() => {
    if (preUseCredits && !isReviewing) dispatch(openForCredit({ invoiceId: preInvoiceId }));
    else if (fromSummary && !isReviewing) dispatch(openForSummary());
    // No invented reference: the server numbers every receipt RCT-YYYY-NNNN.
    // The reference field is for the customer's own cheque or transfer id.
    return () => { dispatch(resetReceivePayment()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (preCustomerId && !form.customerId && customers.length > 0) {
      const cust = customers.find(c => c.id === preCustomerId);
      if (cust) dispatch(setPaymentCustomer({ id: cust.id, name: cust.name }));
    }
  }, [preCustomerId, form.customerId, customers, dispatch]);

  // The customer's open invoices and the credit they hold — both from the
  // server, the same figures the web's Receive Payment works from. A review
  // shows the credit the request asks for instead, so none is offered there.
  useEffect(() => {
    if (!form.customerId) return;
    dispatch(fetchOutstandingForPayment(form.customerId));
    if (!isReviewing) dispatch(fetchCreditsForPayment(form.customerId));
  }, [form.customerId, isReviewing, dispatch]);

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

  // A row's amount as typed, kept until the field is left, so "10." or "10.5"
  // is not rewritten to a number under the user's thumb.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const setRowAmount = useCallback((invoiceId: string, text: string) => {
    const clean = text.replace(/[^0-9.]/g, '');
    setDrafts(d => ({ ...d, [invoiceId]: clean }));
    dispatch(setAllocatedAmount({ invoiceId, amount: parseFloat(clean) || 0 }));
  }, [dispatch]);
  const endRowAmount = useCallback((invoiceId: string) => {
    setDrafts(d => {
      const { [invoiceId]: _, ...rest } = d;
      return rest;
    });
  }, []);

  // Credit on account: what the customer holds, and what this payment spends.
  const spread = useMemo(
    () => creditSpreadOf(form),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.outstandingRows, form.credits, form.useCredits, form.priorityInvoiceId],
  );
  const creditHeld = creditAvailable(form.credits);
  const creditUsed = form.useCredits ? spread.used : 0;
  const creditOverUse = form.useCredits && isCreditOverUsed(form.credits);
  // Reviewing a staff request: the credit it asks to spend, as asked.
  const requestCreditTotal = useMemo(
    () => Math.round(form.requestCredits.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0) * 100) / 100,
    [form.requestCredits],
  );
  const creditShown = isReviewing ? requestCreditTotal : creditUsed;

  const paymentAmount = parseFloat(form.amount) || 0;
  const overpayment = useMemo(
    () => Math.max(0, Math.round((paymentAmount - totalAllocated) * 100) / 100),
    [paymentAmount, totalAllocated],
  );
  const hasOutstanding = form.outstandingRows.length > 0;
  // What is still owed once credit has taken its part — what "Pay in Full" receives.
  const totalOutstanding = useMemo(
    () => Math.round(form.outstandingRows.reduce((s, r) => s + cashCapOf(r), 0) * 100) / 100,
    [form.outstandingRows],
  );

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.customerId) errs.customerId = 'Select a customer';
    if (!form.paymentDate) errs.paymentDate = 'Payment date is required';
    // Credit alone can settle an invoice; without it, money has to arrive.
    if (paymentAmount <= 0 && creditUsed <= 0) {
      errs.amount = form.credits.length > 0
        ? 'Enter the amount received, or use credit on account'
        : 'Enter a positive amount';
    }
    if (creditOverUse) errs.credits = 'A credit is set to use more than it holds';
    // Amounts typed on the invoices themselves cannot add up to more than came in.
    if (totalAllocated > paymentAmount + 0.004) {
      errs.allocations = `The invoices are allocated ${formatCurrency(totalAllocated, 'Rs ')} — more than the ${formatCurrency(paymentAmount, 'Rs ')} received.`;
    } else if (paymentAmount > 0) {
      if (totalAllocated <= 0 && !(overpayment > 0 && form.saveOverpaymentAsCredit)) {
        errs.allocations = 'Allocate the payment to at least one invoice, or enable "Keep as customer advance".';
      }
      if (overpayment > 0 && !form.saveOverpaymentAsCredit) {
        errs.allocations = 'The amount exceeds allocation. Reduce or enable "Keep as customer advance".';
      }
    }
    return errs;
  }, [form, paymentAmount, totalAllocated, overpayment, creditUsed, creditOverUse]);

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

  // Load the request so the owner sees the amount, date and method that were
  // asked for. The form's own fields are populated from it below.
  useEffect(() => {
    if (!approvalRequestId || requestLoadedRef.current) return;
    requestLoadedRef.current = true;

    let cancelled = false;
    const bail = (text2: string) => {
      if (cancelled) return;
      Toast.show({ type: 'error', text1: 'Could not open this request', text2 });
      navigation.goBack();
    };

    (async () => {
      try {
        const req = await fetchApprovalById(approvalRequestId);
        if (cancelled) return;
        if (req?.type !== 'invoice_payment') {
          bail('Only customer payment requests can be opened here.');
          return;
        }
        const payload = (req.payload ?? {}) as Record<string, any>;
        setRequest(req);
        dispatch(
          loadFromRequestPayload({
            payload,
            customerName:
              customers.find(c => c.id === payload.customerId)?.name ?? '',
          }),
        );
      } catch (e: any) {
        bail(e?.message || 'Please try again.');
      }
    })();

    return () => { cancelled = true; };
  }, [approvalRequestId, customers, dispatch, navigation]);

  // Phase two: the allocations, once the rows they attach to exist.
  //
  // Separate because the rows arrive by their own request and are built with
  // every allocation at zero — so anything applied before they land is wiped.
  // Chained off the rows appearing, exactly as the preselectInvoice effect is.
  useEffect(() => {
    if (!request || allocationsAppliedRef.current) return;
    if (form.outstandingRows.length === 0) return;
    // The new money's split — at the top level of a receipt, under `cash` in a
    // settlement. Omitted entirely for a pure prepayment or credit alone: the
    // amount is then the whole story, and there is nothing to attach.
    const applications = requestCashApplicationsOf((request.payload ?? {}) as Record<string, any>);
    allocationsAppliedRef.current = true;
    if (applications) dispatch(applyRequestAllocations(applications));
  }, [request, form.outstandingRows.length, dispatch]);

  // ── Deciding a request under review ─────────────
  const decide = useCallback(
    async (decision: 'approve' | 'reject', comment?: string) => {
      if (!request || deciding) return null;
      setDeciding(true);
      try {
        const result: any = await dispatch(
          decideApproval({ id: request.id, decision, comment }),
        );
        if (result.error) throw new Error(result.error.message);
        return result.payload as ApprovalRequest;
      } catch (e: any) {
        Toast.show({
          type: 'error',
          text1: decision === 'approve' ? 'Could not approve' : 'Could not reject',
          text2: e?.message || 'Please try again.',
        });
        return null;
      } finally {
        setDeciding(false);
      }
    },
    [request, deciding, dispatch],
  );

  const handleApprove = useCallback(async () => {
    const decided = await decide('approve');
    if (!decided) return;
    await dispatch(fetchInvoices());
    Toast.show({
      type: 'success',
      text1: 'Payment recorded',
      text2: 'The invoice balance has been updated.',
    });
    navigation.goBack();
  }, [decide, dispatch, navigation]);

  // Approving replays the amount exactly as asked for. To change it, the owner
  // records the payment themselves on the real screen — this drops them there
  // with the customer and invoice already selected.
  const handleOpenInvoice = useCallback(() => {
    const payload = (request?.payload ?? {}) as Record<string, any>;
    const invoiceId =
      requestCashApplicationsOf(payload)?.[0]?.invoiceId ?? form.requestCredits[0]?.invoiceId;
    navigation.replace('ReceivePayment', {
      customerId: payload.customerId,
      invoiceId,
      // A request that spends credit reopens with credit on, as it was asked.
      useCredits: form.requestCredits.length > 0 || undefined,
    });
  }, [request, form.requestCredits, navigation]);

  const handleReject = useCallback(
    async (comment: string) => {
      setRejectOpen(false);
      const decided = await decide('reject', comment);
      if (!decided) return;
      Toast.show({
        type: 'success',
        text1: 'Request rejected',
        text2: 'The requester sees your reason in My requests.',
      });
      navigation.goBack();
    },
    [decide, navigation],
  );

  // FinMatrix Connect: the receipt's WhatsApp status on the success sheet.
  const connect = useWhatsappConnect();
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      dispatch(setPaymentErrors(validationErrors));
      Alert.alert('Cannot Save Payment', Object.values(validationErrors)[0]);
      return;
    }

    // One key per payment ATTEMPT, held across retries of it. If the request
    // reaches the server but the reply is lost, the user taps Save again — and
    // the server replays the first outcome instead of banking it twice.
    // Cleared once it is safely recorded, so the next payment gets a fresh key.
    if (!idempotencyKey.current) idempotencyKey.current = uuidv4();

    try {
      const result: any = await dispatch(savePayment({ idempotencyKey: idempotencyKey.current }));
      if (result.error) throw new Error(result.error.message);
      idempotencyKey.current = '';

      // Staff get an approval request back, and no cash has moved. The
      // "Payment Recorded!" screen below would not merely be wrong, it reads
      // as a receipt — proof to a customer that they have paid.
      if (result.payload?.pending) {
        Toast.show({
          type: 'success',
          text1: 'Sent to the owner for approval',
          text2: 'The invoice stays unpaid until they approve the payment.',
        });
        navigation.goBack();
        return;
      }

      dispatch(fetchInvoices());
      // The receipt that FinMatrix Connect sends: `receive` answers with the
      // payment, `settle` with { payment } (null when credit covered it all).
      const saved = result.payload?.data ?? result.payload;
      setReceiptId(paymentAmount > 0 ? (saved?.payment?.id ?? saved?.id ?? null) : null);

      const amt = formatCurrency(paymentAmount, 'Rs ');
      const creditNote = creditUsed > 0 ? `${formatCurrency(creditUsed, 'Rs ')} of credit on account applied` : '';
      if (paymentAmount <= 0) {
        // Credit covered it all: nothing was banked, so there is no receipt.
        setSuccessTitle('Settled from Credit');
        setSuccessMsg(formatCurrency(creditUsed, 'Rs '));
        setSuccessSub(`${creditNote} — no new money recorded.`);
      } else if (overpayment > 0 && form.saveOverpaymentAsCredit) {
        setSuccessTitle('Payment Recorded!');
        setSuccessMsg(amt);
        setSuccessSub(
          [creditNote, `${formatCurrency(overpayment, 'Rs ')} held as customer advance`].filter(Boolean).join(' · '),
        );
      } else {
        setSuccessTitle('Payment Recorded!');
        setSuccessMsg(amt);
        setSuccessSub(
          [`Payment from ${form.customerName} recorded`, creditNote].filter(Boolean).join(' · '),
        );
      }
      animateSuccess();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record payment.');
    }
  }, [dispatch, validate, paymentAmount, overpayment, creditUsed, form.saveOverpaymentAsCredit, form.customerName, animateSuccess, navigation]);

  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <ReportHeader
        title={isReviewing ? 'Review request' : 'Receive Payment'}
        subtitle={
          isReviewing
            ? request?.requestedBy
              ? `Raised by ${requesterName}`
              : 'Raised by a staff member'
            : 'Record an incoming payment'
        }
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.neutral100 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {isReviewing && (
            <View style={styles.reviewBanner}>
              <Feather name="clock" size={16} color={colors.warning} />
              <View style={{ flex: 1, marginLeft: spacing.xs }}>
                <Text style={styles.reviewBannerTitle}>
                  {request ? 'Waiting for your decision' : 'Loading request…'}
                </Text>
                <Text style={styles.reviewBannerBody}>
                  {request?.summary || 'A staff member asked you to record this payment.'}
                </Text>
                <Text style={styles.reviewBannerBody}>
                  {APPROVAL_TYPE_EFFECTS.invoice_payment}
                </Text>
                {!!request?.reason && (
                  <Text style={styles.reviewBannerBody}>Reason given: {request.reason}</Text>
                )}
              </View>
            </View>
          )}

          {/* Nothing is editable while reviewing: approving replays the payload
              exactly as submitted, so an edit here would be a lie. "Open
              invoice" is the way to change anything. Gated at the container
              because DateField and the allocation rows have no disabled prop. */}
          <View pointerEvents={isReviewing ? 'none' : 'auto'}>

          {/* ── Payment Details ─────────────────────── */}
          <FormSectionHeader title="Payment details" />
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
            {/* Money already on account, not yet in use: the situation behind a
                receipt recorded twice. Said once, with the way to use it. */}
            {creditHeld > 0 && !form.useCredits && !isReviewing && (
              <View style={styles.advanceBanner}>
                <Feather name="info" size={14} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.advanceBannerText}>
                    {form.customerName || 'This customer'} already has {formatCurrency(creditHeld, 'Rs ')} on
                    account. If this is money they already paid, use it instead of recording new cash —
                    recording it again would count the same money twice.
                  </Text>
                  <TouchableOpacity onPress={() => dispatch(setUseCredits(true))} accessibilityRole="button">
                    <Text style={styles.advanceBannerLink}>Use in this payment</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
            {/* The bank the customer actually paid into — MCB, Allied,
                Meezan. Automatic keeps the old rule. */}
            <MoneyAccountDropdown
              label="Deposit to"
              value={form.bankAccountId}
              onChange={v => dispatch(setPaymentField({ key: 'bankAccountId', value: v }))}
              automaticLabel="Automatic — let FinMatrix choose"
              allowCreate={!isReviewing}
              hint={
                form.bankAccountId
                  ? undefined
                  : form.method === 'cash'
                    ? 'Automatic uses 1000 Cash for a cash payment.'
                    : 'Automatic uses 1010 Business Checking.'
              }
            />
            <CustomInput
              label={creditShown > 0 ? 'Amount received (Rs)' : 'Amount (Rs) *'}
              value={form.amount}
              onChangeText={handleAmountChange}
              placeholder="0"
              keyboardType="decimal-pad"
              error={form.errors.amount}
            />
            {!!lakhCroreWords(form.amount) && (
              <Text style={styles.fieldHint}>= {lakhCroreWords(form.amount)}</Text>
            )}
            {fromSummary && hasOutstanding && !isReviewing && (
              <Text style={styles.fieldHint}>
                Every invoice in the summary is ticked: the amount is applied oldest first, and each invoice&apos;s
                amount can be changed below.
              </Text>
            )}
            {creditUsed > 0 && !isReviewing && (
              <Text style={styles.fieldHint}>
                Leave empty if credit on account covers what is being settled.
              </Text>
            )}
            {hasOutstanding && totalOutstanding > 0 && !isReviewing && (
              // The same small secondary button as Pay Bills' "Pay all in
              // full" — the two did one job in two different chips.
              <View style={styles.payFullRow}>
                <CustomButton
                  title={`${creditUsed > 0 ? 'Pay the rest' : 'Pay in full'} (${formatCurrency(totalOutstanding, 'Rs ')})`}
                  onPress={() => dispatch(payInFull())}
                  variant="secondary"
                  size="sm"
                />
              </View>
            )}
          </View>

          {/* ── Credit on account ────────────────────── */}
          {/* Advances and open credit memos, spent first — oldest due date
              first, or the invoice "Use credit" came from — before any new
              money. One switch; each credit's amount stays editable. */}
          {!isReviewing && form.credits.length > 0 && (
            <>
              <FormSectionHeader title="Credits on account" />
              <View style={styles.sectionCard}>
                <View style={styles.creditHeadRow}>
                  <Text style={[styles.creditHeadText, { flex: 1 }]}>
                    {form.customerName || 'This customer'} has {formatCurrency(creditHeld, 'Rs ')} to use —
                    spent first, oldest due date first, before any new money.
                  </Text>
                  <TouchableOpacity
                    onPress={() => dispatch(setUseCredits(!form.useCredits))}
                    activeOpacity={0.8}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: form.useCredits }}
                    accessibilityLabel="Use in this payment"
                    style={[styles.toggleSwitch, styles.toggleSwitchLight, form.useCredits && styles.toggleSwitchOn]}
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
                            <Text style={styles.creditRef} numberOfLines={1}>
                              {c.reference || CREDIT_SOURCE_LABELS[c.kind]}
                            </Text>
                            <Text style={styles.creditMeta}>
                              {CREDIT_SOURCE_LABELS[c.kind]} · {formatCurrency(c.available, 'Rs ')} available
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
                            accessibilityLabel={`Amount of ${c.reference || CREDIT_SOURCE_LABELS[c.kind]} to use`}
                            editable={!form.isSaving}
                          />
                        </View>
                      );
                    })}
                    <Text style={styles.creditTotal}>Credits used {formatCurrency(creditUsed, 'Rs ')}</Text>
                    {!!form.errors.credits && <Text style={styles.allocError}>{form.errors.credits}</Text>}
                  </>
                )}
              </View>
            </>
          )}

          {/* Reviewing a staff settlement: the credit it asks to spend. */}
          {isReviewing && form.requestCredits.length > 0 && (
            <>
              <FormSectionHeader title="Credit on account used" />
              <View style={styles.sectionCard}>
                {form.requestCredits.map((c, i) => (
                  <View key={`${c.id}-${c.invoiceId}-${i}`} style={styles.creditLine}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.creditRef}>
                        {c.kind === 'credit_memo' ? 'Credit memo' : 'Advance'}
                      </Text>
                      <Text style={styles.creditMeta}>
                        On{' '}
                        {form.outstandingRows.find(r => r.invoiceId === c.invoiceId)?.invoiceNumber ??
                          'an invoice since settled'}
                      </Text>
                    </View>
                    <Text style={styles.creditRequestAmount}>
                      {formatCurrency(parseFloat(c.amount) || 0, 'Rs ')}
                    </Text>
                  </View>
                ))}
                <Text style={styles.creditTotal}>
                  {formatCurrency(requestCreditTotal, 'Rs ')} of credit, then{' '}
                  {paymentAmount > 0 ? `${formatCurrency(paymentAmount, 'Rs ')} of new money` : 'no new money'}.
                </Text>
              </View>
            </>
          )}

          {/* ── Outstanding Invoices ─────────────────── */}
          <FormSectionHeader
            title="Outstanding invoices"
            right={
              hasOutstanding ? (
                <Text style={styles.sectionHint}>
                  {form.outstandingRows.filter(r => r.checked).length} of {form.outstandingRows.length} selected
                </Text>
              ) : undefined
            }
          />

          {!form.customerId ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBg}>
                <Feather name="user" size={20} color={colors.textSecondary} />
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
              <AllocationHeader label="Invoice" />
              {form.outstandingRows.map(row => {
                const covered = row.credit > 0 && cashCapOf(row) <= 0;
                const editing = row.checked && !covered && !isReviewing;
                return (
                  <AllocationRow
                    key={row.invoiceId}
                    kind="Invoice"
                    number={row.invoiceNumber}
                    balance={formatCurrency(row.balance, 'Rs ')}
                    detail={`Due ${formatDate(row.dueDate)}`}
                    checked={row.checked}
                    locked={covered}
                    onToggle={() => dispatch(toggleInvoiceCheck(row.invoiceId))}
                    // Each ticked invoice's amount can be typed — two in full, the third in part.
                    amount={
                      editing
                        ? {
                            label: 'Applied (Rs)',
                            value: drafts[row.invoiceId] ?? (row.allocated > 0 ? String(row.allocated) : ''),
                            onChangeText: t => setRowAmount(row.invoiceId, t),
                            onBlur: () => endRowAmount(row.invoiceId),
                            accessibilityLabel: `Amount applied to ${row.invoiceNumber}`,
                          }
                        : undefined
                    }
                  >
                    {row.credit > 0 && (
                      <AllocationNote tone="success">{formatCurrency(row.credit, 'Rs ')} from credit</AllocationNote>
                    )}
                    {/* What this payment leaves on the invoice. */}
                    {(row.checked || covered) && (row.allocated > 0 || row.credit > 0) && (
                      <AllocationNote>
                        {cashCapOf(row) - row.allocated <= 0.004
                          ? 'Paid in full'
                          : `${formatCurrency(Math.round((cashCapOf(row) - row.allocated) * 100) / 100, 'Rs ')} left`}
                      </AllocationNote>
                    )}
                    {/* When it is not typed here, the row still says where it stands. */}
                    {!editing && (covered || row.allocated > 0) && (
                      <AllocationNote tone="success">
                        {covered ? 'Settled by credit' : `Applied ${formatCurrency(row.allocated, 'Rs ')}`}
                      </AllocationNote>
                    )}
                  </AllocationRow>
                );
              })}
            </View>
          )}

          {/* ── Summary Panel ────────────────────────── */}
          {(paymentAmount > 0 || creditShown > 0) && (
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
              {creditShown > 0 && (
                <SummaryRow label="Credit on Account Used" value={formatCurrency(creditShown, 'Rs ')} valueColor={PANEL.positive} />
              )}
              <SummaryRow label={creditShown > 0 ? 'Money Received' : 'Payment Amount'} value={formatCurrency(paymentAmount, 'Rs ')} />
              <SummaryRow label={creditShown > 0 ? 'Money Applied to Invoices' : 'Applied to Invoices'} value={formatCurrency(totalAllocated, 'Rs ')} valueColor={totalAllocated > 0 ? PANEL.positive : undefined} />
              {hasOutstanding && !isReviewing && (
                <SummaryRow
                  label="Still due after this payment"
                  value={formatCurrency(Math.max(0, Math.round((totalOutstanding - totalAllocated) * 100) / 100), 'Rs ')}
                />
              )}
              {creditShown > 0 && (
                <SummaryRow label="Credit + Money Received" value={formatCurrency(Math.round((creditShown + paymentAmount) * 100) / 100, 'Rs ')} />
              )}
              {overpayment > 0 && (
                <>
                  <SummaryRow label="Unapplied Amount" value={formatCurrency(overpayment, 'Rs ')} valueColor={form.saveOverpaymentAsCredit ? PANEL.caution : PANEL.negative} />
                  <View style={styles.creditToggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.creditToggleLabel}>Keep as Customer Advance</Text>
                      <Text style={styles.creditToggleHint}>
                        Hold {formatCurrency(overpayment, 'Rs ')} as an advance and apply it to an invoice later.
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
          <FormSectionHeader title="Notes" />
          <View style={styles.sectionCard}>
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

        {/* ── Sticky Action Bar ─────────────────────── */}
        {isReviewing ? (
          decideCap.allowed && request && isPendingApproval(request) ? (
            // Approving replays the figures as asked. To change them, record it
            // yourself on the real screen — same destination, prefilled — which
            // is the quieter choice, behind More. Reject stays beside Approve:
            // it is the other half of the decision, not a rare one.
            <ActionBar
              more={[{ label: 'Open invoice', icon: 'file-text', onPress: handleOpenInvoice }]}
              moreDisabled={deciding}
              secondary={{ title: 'Reject', onPress: () => setRejectOpen(true), disabled: deciding }}
              primary={{
                title: deciding ? 'Approving…' : 'Approve',
                onPress: handleApprove,
                isLoading: deciding,
                icon: 'check',
              }}
            />
          ) : (
            <ActionBar
              note={
                request && !isPendingApproval(request)
                  ? 'This request has already been decided.'
                  : 'Only the owner can approve or reject a request.'
              }
            />
          )
        ) : (
          <ActionBar
            secondary={{ title: 'Cancel', onPress: () => navigation.goBack(), disabled: form.isSaving }}
            primary={{
              title: form.isSaving
                ? 'Recording…'
                : payCap.submitLabel(creditUsed > 0 && paymentAmount <= 0 ? 'Apply Credit' : 'Record Payment'),
              onPress: handleSave,
              isLoading: form.isSaving,
              icon: 'check-circle',
            }}
          />
        )}
      </KeyboardAvoidingView>

      <RejectReasonModal
        visible={rejectOpen}
        summary={request?.summary}
        onCancel={() => setRejectOpen(false)}
        onSubmit={handleReject}
      />

      {/* ── Success Overlay Modal ──────────────────── */}
      <Modal visible={showSuccess} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[sStyles.overlay, { opacity: successOpacity }]}>
          <Animated.View style={[sStyles.card, { transform: [{ scale: successScale }] }]}>
            <Animated.View style={[sStyles.checkCircle, { transform: [{ scale: checkScale }] }]}>
              <Feather name="check" size={40} color={colors.neutral0} />
            </Animated.View>
            <Text style={sStyles.title}>{successTitle}</Text>
            <Text style={sStyles.amount}>{successMsg}</Text>
            <Text style={sStyles.sub}>{successSub}</Text>
            {connect.enabled && !!receiptId && (
              <MessageTimeline docType="payment" docId={receiptId} variant="latest" latestLabel="Receipt" />
            )}
            <View style={sStyles.divider} />
            <View style={sStyles.btn}>
              <PrimaryButton
                title="Back to Invoice"
                onPress={handleSuccessDismiss}
                icon={<Feather name="arrow-left" size={16} color={THEME.colors.neutral0} />}
              />
            </View>
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
  advanceBanner: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    marginBottom: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.warningLight,
  },
  advanceBannerText: { ...typography.caption, color: colors.textPrimary },
  advanceBannerLink: { ...typography.labelSm, color: colors.primary, marginTop: spacing.xxs },
  fieldHint: { ...typography.caption, color: colors.textSecondary, marginTop: -spacing.xxs, marginBottom: spacing.xs },
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
    width: 120, height: THEME.form.controlHeight, borderRadius: THEME.form.controlRadius, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.xs, textAlign: 'right', ...typography.bodySm, color: colors.textPrimary,
    backgroundColor: colors.neutral0,
  },
  creditInputOver: { borderColor: colors.danger },
  creditTotal: { ...typography.labelSm, color: colors.textPrimary, textAlign: 'right', marginTop: spacing.xs },
  creditRequestAmount: { ...typography.labelMd, color: colors.textPrimary },
  toggleSwitchLight: { backgroundColor: colors.neutral300 },
  container: { flex: 1, backgroundColor: colors.neutral100 },
  safeTop: { backgroundColor: HEADER_NAVY[0] },

  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },

  sectionHint: { ...typography.labelSm, color: colors.textTertiary },

  // A plain card: no coloured stripe down its edge, as on every form now.
  sectionCard: {
    backgroundColor: colors.neutral0, borderRadius: radius.lg, padding: spacing.md,
    ...shadows.xs, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  rowFields: { flexDirection: 'row' },

  payFullRow: { alignSelf: 'flex-start', marginTop: spacing.xxs },

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

  tableWrap: { backgroundColor: colors.neutral0, borderRadius: radius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadows.xs },


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

  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '12',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  reviewBannerTitle: { ...typography.labelMd, color: colors.textPrimary },
  reviewBannerBody: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
});

// ── Success Overlay Styles ────────────────────────
const sStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.75)',
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    // A share of the overlay rather than of the window's width at load time,
    // which a resized or rotated window would leave behind.
    width: '82%', maxWidth: 420, backgroundColor: colors.neutral0,
    borderRadius: 24, paddingVertical: 36, paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: colors.neutral900, shadowOffset: { width: 0, height: 12 },
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
  btn: { width: '100%' },
});

export default ReceivePaymentScreen;
