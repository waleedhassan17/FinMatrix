// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo Form Screen (Create / Edit / Apply / Refund)
// Implements the full activity diagram:
//   1. Select Customer
//   2. Reference original invoice (optional)
//   3. Add line items being credited
//   4. Enter reason for credit
//   5. Save — JE: DR Revenue, CR AR
//   6. Apply credit  ──  Apply to other outstanding invoices
//      Refund        ──  Refund to customer
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectCMForm,
  setCMField,
  setCMCustomer,
  setCMErrors,
  addCMLine,
  removeCMLine,
  updateCMLine,
  loadCreditMemoForEdit,
  resetCreditMemoForm,
  saveCreditMemo,
  applyCreditMemo,
  refundCreditMemo,
  fetchCreditMemoForEdit,
  voidCreditMemo,
  type CMFormLineItem,
} from './creditMemoFormSlice';
import {
  selectCreditMemos,
  fetchCreditMemos,
  upsertCreditMemo,
} from '../CreditMemoList/creditMemoListSlice';
import { fetchCustomers, selectCustomers } from '../../Customers/CustomerList/customerListSlice';
import { fetchInvoices, selectInvoices } from '../../Invoices/InvoiceList/invoiceListSlice';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import LineItemRow from '../../../components/LineItemRow';
import { formatCurrency } from '../../../utils/formatters';
import type { CreditMemoStatus, PaymentMethod } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type FormRoute = RouteProp<TransactionsStackParamList, 'CreditMemoForm'>;

const STATUS_COLOR: Record<CreditMemoStatus, string> = {
  draft: '#94A3B8',
  issued: colors.secondary,
  applied: colors.success,
  voided: colors.danger,
};
const STATUS_LABEL: Record<CreditMemoStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  applied: 'Applied',
  voided: 'Voided',
};

// ═══════════════════════════════════════════════════════
const CreditMemoFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.creditMemoId;
  const isEditing = !!editingId;

  const creditMemos = useAppSelector(selectCreditMemos);
  const customers = useAppSelector(selectCustomers);
  const invoices = useAppSelector(selectInvoices);
  const form = useAppSelector(selectCMForm);

  // ── Lookups ───────────────────────────────────────
  const customerOptions = useMemo(
    () =>
      customers
        .filter(c => c.isActive)
        .map(c => ({ label: c.company ? `${c.name} — ${c.company}` : c.name, value: c.id })),
    [customers],
  );

  // Outstanding invoices for the selected customer (used by both
  // the optional "reference original invoice" picker AND by the
  // "Apply credit" post-save action).
  const outstandingInvoices = useMemo(
    () =>
      invoices
        .filter(
          i =>
            i.customerId === form.customerId &&
            (i.status === 'sent' || i.status === 'overdue') &&
            i.total - i.amountPaid > 0,
        )
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [invoices, form.customerId],
  );

  const invoiceOptions = useMemo(
    () => [
      { label: 'No reference', value: '' },
      ...outstandingInvoices.map(i => ({
        label: `${i.invoiceNumber} — ${formatCurrency(i.total - i.amountPaid, 'Rs ')} due`,
        value: i.id,
      })),
    ],
    [outstandingInvoices],
  );

  const generateCMNumber = useCallback(() => {
    const maxNum = creditMemos.reduce((max, c) => {
      const match = c.creditMemoNumber.match(/CM-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `CM-${String(maxNum + 1).padStart(4, '0')}`;
  }, [creditMemos]);

  // ── Initial load ──────────────────────────────────
  useEffect(() => {
    dispatch(fetchCustomers());
    dispatch(fetchInvoices());

    if (isEditing && editingId) {
      const existing = creditMemos.find(c => c.id === editingId);
      if (existing) {
        dispatch(loadCreditMemoForEdit(existing));
      } else {
        dispatch(fetchCreditMemoForEdit(editingId));
      }
    } else {
      dispatch(setCMField({ field: 'creditMemoNumber', value: generateCMNumber() }));
    }

    return () => { dispatch(resetCreditMemoForm()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editingId, dispatch]);

  // ── Customer change ───────────────────────────────
  const handleCustomerChange = useCallback(
    (custId: string) => {
      const cust = customers.find(c => c.id === custId);
      if (!cust) return;
      dispatch(setCMCustomer({ id: cust.id, name: cust.name }));
      // Clear any previously-selected invoice from a different customer.
      dispatch(setCMField({ field: 'invoiceId', value: '' }));
      dispatch(setCMField({ field: 'invoiceNumber', value: '' }));
    },
    [customers, dispatch],
  );

  // ── Invoice picker change ─────────────────────────
  const handleInvoiceChange = useCallback(
    (invId: string) => {
      if (!invId) {
        dispatch(setCMField({ field: 'invoiceId', value: '' }));
        dispatch(setCMField({ field: 'invoiceNumber', value: '' }));
        return;
      }
      const inv = invoices.find(i => i.id === invId);
      if (!inv) return;
      dispatch(setCMField({ field: 'invoiceId', value: inv.id }));
      dispatch(setCMField({ field: 'invoiceNumber', value: inv.invoiceNumber }));
    },
    [invoices, dispatch],
  );

  // ── Per-line amount helper ────────────────────────
  const lineAmount = useCallback((l: CMFormLineItem) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return qty * price;
  }, []);

  // ── Validation ────────────────────────────────────
  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.customerId) errs.customerId = 'Select a customer';
    if (!form.creditMemoNumber.trim()) errs.creditMemoNumber = 'Credit memo number is required';
    if (!form.issueDate) errs.issueDate = 'Issue date is required';
    if (form.lines.length === 0) {
      errs.lines = 'Add at least one credited line item';
    } else {
      const hasEmptyLine = form.lines.some(
        l => !l.description.trim() || !(parseFloat(l.quantity) > 0) || !(parseFloat(l.unitPrice) > 0),
      );
      if (hasEmptyLine) errs.lines = 'All line items need description, quantity, and rate';
    }
    if (!form.reason.trim()) errs.reason = 'Reason for credit is required';
    return errs;
  }, [form]);

  // ── Save (draft / issued) ─────────────────────────
  const handleSave = useCallback(
    async (saveStatus: CreditMemoStatus) => {
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        dispatch(setCMErrors(validationErrors));
        Alert.alert('Cannot Save', Object.values(validationErrors)[0]);
        return;
      }
      try {
        const result: any = await dispatch(saveCreditMemo(saveStatus));
        if (result.error) throw new Error(result.error.message);
        const created = result.payload;
        if (created) dispatch(upsertCreditMemo(created));
        await dispatch(fetchCreditMemos());

        Alert.alert(
          'Saved',
          saveStatus === 'issued'
            ? `${form.creditMemoNumber} has been issued. Journal entry posted: DR Revenue, CR AR.`
            : `${form.creditMemoNumber} saved as draft.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to save credit memo.');
      }
    },
    [dispatch, navigation, validate, form.creditMemoNumber],
  );

  // ── Activity diagram step: "Apply to other outstanding invoices" ──
  const handleApply = useCallback(() => {
    if (!form.editId) return;
    if (outstandingInvoices.length === 0) {
      Alert.alert(
        'No Outstanding Invoices',
        `${form.customerName || 'This customer'} has no outstanding invoices to apply this credit against.`,
      );
      return;
    }
    // Apply to the oldest outstanding invoice (FIFO — same logic as
    // the Receive Payment auto-distribute).
    const target = outstandingInvoices[0];
    const dueAmount = target.total - target.amountPaid;
    const applyAmount = Math.min(form.total, dueAmount);

    Alert.alert(
      'Apply Credit',
      `Apply ${formatCurrency(applyAmount, 'Rs ')} from ${form.creditMemoNumber} to ${target.invoiceNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            const result: any = await dispatch(
              applyCreditMemo({
                id: form.editId,
                invoiceId: target.id,
                invoiceNumber: target.invoiceNumber,
                amount: applyAmount,
              }),
            );
            if (!result.error && result.payload) {
              dispatch(upsertCreditMemo(result.payload));
              await dispatch(fetchInvoices());
              Alert.alert('Applied', `Credit applied to ${target.invoiceNumber}.`);
            } else {
              Alert.alert('Error', 'Failed to apply credit.');
            }
          },
        },
      ],
    );
  }, [dispatch, form.editId, form.total, form.customerName, form.creditMemoNumber, outstandingInvoices]);

  // ── Activity diagram step: "Refund to customer" ────
  const handleRefund = useCallback(() => {
    if (!form.editId) return;
    Alert.alert(
      'Refund Customer',
      `Refund ${formatCurrency(form.total, 'Rs ')} to ${form.customerName} for ${form.creditMemoNumber}?\n\nThe refund will be issued by bank transfer using the credit memo number as reference.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          onPress: async () => {
            const result: any = await dispatch(
              refundCreditMemo({
                id: form.editId,
                method: 'bank_transfer' as PaymentMethod,
                reference: form.creditMemoNumber,
                amount: form.total,
                date: new Date().toISOString(),
              }),
            );
            if (!result.error && result.payload) {
              dispatch(upsertCreditMemo(result.payload));
              Alert.alert('Refunded', `${formatCurrency(form.total, 'Rs ')} refunded to ${form.customerName}.`);
            } else {
              Alert.alert('Error', 'Failed to process refund.');
            }
          },
        },
      ],
    );
  }, [dispatch, form.editId, form.total, form.customerName, form.creditMemoNumber]);

  // ── Void ──────────────────────────────────────────
  const handleVoid = useCallback(() => {
    if (!form.editId) return;
    Alert.alert(
      'Void Credit Memo',
      `Voiding ${form.creditMemoNumber} will reverse the journal entry. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void',
          style: 'destructive',
          onPress: async () => {
            const result: any = await dispatch(voidCreditMemo(form.editId));
            if (!result.error) {
              await dispatch(fetchCreditMemos());
              navigation.goBack();
            }
          },
        },
      ],
    );
  }, [dispatch, navigation, form.editId, form.creditMemoNumber]);

  // ═════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════
  const isReadOnly = isEditing && (form.status === 'applied' || form.status === 'voided');
  const canPostSaveActions = isEditing && form.status === 'issued';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isEditing ? form.creditMemoNumber || 'Credit Memo' : 'New Credit Memo'}
            </Text>
          </View>
          {isEditing && (
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[form.status] + '18' }]}>
              <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[form.status] }]}>
                {STATUS_LABEL[form.status]}
              </Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Customer */}
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.sectionCard}>
            <CustomDropdown
              label="Customer *"
              options={customerOptions}
              value={form.customerId}
              onChange={handleCustomerChange}
              placeholder="Select a customer…"
              searchable
              error={form.errors.customerId}
            />
          </View>

          {/* Details */}
          <Text style={styles.sectionTitle}>Credit Memo Details</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Credit Memo # *"
              value={form.creditMemoNumber}
              onChangeText={v => dispatch(setCMField({ field: 'creditMemoNumber', value: v }))}
              error={form.errors.creditMemoNumber}
              editable={!isReadOnly}
            />
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomInput
                  label="Issue Date *"
                  value={form.issueDate.slice(0, 10)}
                  onChangeText={v => dispatch(setCMField({ field: 'issueDate', value: v }))}
                  placeholder="YYYY-MM-DD"
                  error={form.errors.issueDate}
                  editable={!isReadOnly}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomDropdown
                  label="Original Invoice"
                  options={invoiceOptions}
                  value={form.invoiceId}
                  onChange={handleInvoiceChange}
                  placeholder={form.customerId ? 'Optional' : 'Select a customer first'}
                />
              </View>
            </View>
          </View>

          {/* Line Items */}
          <View style={styles.linesSectionHeader}>
            <Text style={styles.sectionTitle}>Items Being Credited *</Text>
            {!isReadOnly && (
              <TouchableOpacity
                style={styles.addLineBtn}
                onPress={() => dispatch(addCMLine())}
                activeOpacity={0.7}
              >
                <Text style={styles.addLineBtnText}>+ Add Item</Text>
              </TouchableOpacity>
            )}
          </View>
          {form.errors.lines && <Text style={styles.lineError}>{form.errors.lines}</Text>}

          {form.lines.map((line, idx) => (
            <LineItemRow
              key={line.id}
              index={idx}
              description={line.description}
              quantity={line.quantity}
              unitPrice={line.unitPrice}
              taxRate={line.taxRate}
              lineAmount={lineAmount(line)}
              onDescriptionChange={v => dispatch(updateCMLine({ id: line.id, field: 'description', value: v }))}
              onQuantityChange={v => dispatch(updateCMLine({ id: line.id, field: 'quantity', value: v }))}
              onUnitPriceChange={v => dispatch(updateCMLine({ id: line.id, field: 'unitPrice', value: v }))}
              onTaxRateChange={v => dispatch(updateCMLine({ id: line.id, field: 'taxRate', value: v }))}
              onDelete={() => dispatch(removeCMLine(line.id))}
              canDelete={!isReadOnly && form.lines.length > 1}
            />
          ))}

          {/* Reason for Credit (activity diagram step 6) */}
          <Text style={styles.sectionTitle}>Reason for Credit *</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Why is this credit being issued?"
              value={form.reason}
              onChangeText={v => dispatch(setCMField({ field: 'reason', value: v }))}
              placeholder="e.g. Defective goods returned, overcharge adjustment, warranty credit…"
              multiline
              error={form.errors.reason}
              editable={!isReadOnly}
            />
          </View>

          {/* Totals */}
          <Text style={styles.sectionTitle}>Totals</Text>
          <View style={styles.totalsCard}>
            <TotalsRow label="Subtotal" value={formatCurrency(form.subtotal, 'Rs ')} />
            <TotalsRow label="Tax" value={formatCurrency(form.taxAmount, 'Rs ')} />
            <View style={styles.grandDivider} />
            <TotalsRow label="Credit Total" value={formatCurrency(form.total, 'Rs ')} bold />
          </View>

          <View style={{ height: spacing.xl * 2 }} />
        </ScrollView>

        {/* ── Sticky Action Bar ───────────────────── */}
        <View style={styles.actionBar}>
          {canPostSaveActions ? (
            // Activity diagram: "Apply credit or refund?" decision
            <>
              <View style={styles.actionTertiary}>
                <CustomButton
                  title="Void"
                  onPress={handleVoid}
                  variant="secondary"
                  size="sm"
                  fullWidth
                />
              </View>
              <View style={styles.actionSecondary}>
                <CustomButton
                  title={form.isRefunding ? 'Refunding…' : 'Refund'}
                  onPress={handleRefund}
                  variant="secondary"
                  size="sm"
                  fullWidth
                  disabled={form.isRefunding || form.isApplying}
                />
              </View>
              <View style={styles.actionPrimary}>
                <CustomButton
                  title={form.isApplying ? 'Applying…' : 'Apply Credit'}
                  onPress={handleApply}
                  variant="primary"
                  size="sm"
                  fullWidth
                  disabled={form.isRefunding || form.isApplying}
                />
              </View>
            </>
          ) : isReadOnly ? (
            <View style={styles.actionPrimary}>
              <CustomButton
                title="Done"
                onPress={() => navigation.goBack()}
                variant="primary"
                size="sm"
                fullWidth
              />
            </View>
          ) : (
            // Draft mode — Save Draft / Issue
            <>
              <View style={styles.actionSecondary}>
                <CustomButton
                  title="Save Draft"
                  onPress={() => handleSave('draft')}
                  variant="secondary"
                  size="sm"
                  fullWidth
                  isLoading={form.isSaving}
                  disabled={form.isSaving}
                />
              </View>
              <View style={styles.actionPrimary}>
                <CustomButton
                  title="Issue Credit Memo"
                  onPress={() => handleSave('issued')}
                  variant="primary"
                  size="sm"
                  fullWidth
                  isLoading={form.isSaving}
                  disabled={form.isSaving}
                />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Helper ───────────────────────────────────────────
const TotalsRow: React.FC<{ label: string; value: string; bold?: boolean }> = ({
  label,
  value,
  bold,
}) => (
  <View style={styles.totalsRow}>
    <Text style={[styles.totalsLabel, bold && styles.totalsLabelBold]}>{label}</Text>
    <Text style={[styles.totalsValue, bold && styles.totalsValueBold]}>{value}</Text>
  </View>
);

// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  statusBadgeText: { ...THEME.typography.labelSm, fontWeight: '700' },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  sectionTitle: {
    ...THEME.typography.bodyMd,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
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

  linesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  addLineBtn: {
    backgroundColor: colors.secondary + '15',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  addLineBtnText: {
    ...THEME.typography.bodySm,
    fontWeight: '700',
    color: colors.secondary,
  },
  lineError: {
    ...THEME.typography.caption,
    color: colors.danger,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.danger + '0C',
    borderRadius: borderRadius.sm,
  },

  totalsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  totalsLabel: { ...THEME.typography.bodySm, color: colors.textSecondary },
  totalsLabelBold: { ...THEME.typography.labelLg, fontWeight: '700', color: colors.textPrimary },
  totalsValue: { ...THEME.typography.bodySm, fontWeight: '600', color: colors.textPrimary },
  totalsValueBold: { ...THEME.typography.h4, fontWeight: '800' },
  grandDivider: { height: 1.5, backgroundColor: colors.primary, marginVertical: spacing.xs },

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
    ...shadows.small,
  },
  actionPrimary: { flex: 1.4 },
  actionSecondary: { flex: 1 },
  actionTertiary: { flex: 0.7 },
});

export default CreditMemoFormScreen;
