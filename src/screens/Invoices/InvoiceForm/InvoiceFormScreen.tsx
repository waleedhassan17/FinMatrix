// ═══════════════════════════════════════════════════════
// FinMatrix — Invoice Form Screen (Create / Edit)
// Customer dropdown, auto invoice #, date / due date,
// line items with tax, discount, grand total.
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
import dayjs from 'dayjs';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectInvoiceFormState,
  setField,
  setCustomer,
  setErrors,
  setIsSaving,
  addLine,
  removeLine,
  updateLine,
  calculateTotals,
  loadInvoiceForEdit,
  resetInvoiceForm,
  type FormLineItem,
} from './invoiceFormSlice';
import {
  selectInvoices,
  fetchInvoices,
} from '../InvoiceList/invoiceListSlice';
import { fetchCustomers, selectCustomers } from '../../Customers/CustomerList/customerListSlice';
import { createInvoiceAPI, updateInvoiceAPI } from '../../../network/invoiceNetwork';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import LineItemRow from '../../../components/LineItemRow';
import { formatCurrency } from '../../../utils/formatters';
import type { DiscountType, InvoiceStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type FormRoute = RouteProp<TransactionsStackParamList, 'InvoiceForm'>;

const DISCOUNT_OPTIONS = [
  { label: 'Fixed (Rs)', value: 'fixed' },
  { label: 'Percentage (%)', value: 'percentage' },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const InvoiceFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.invoiceId;
  const isEditing = !!editingId;
  const invoices = useAppSelector(selectInvoices);
  const customers = useAppSelector(selectCustomers);
  const form = useAppSelector(selectInvoiceFormState);

  // ── Customer options for dropdown ───────────────
  const customerOptions = useMemo(
    () =>
      customers
        .filter(c => c.isActive)
        .map(c => ({ label: `${c.name} — ${c.company}`, value: c.id })),
    [customers],
  );

  // ── Auto-generate invoice number ────────────────
  const generateInvoiceNumber = useCallback(() => {
    const maxNum = invoices.reduce((max, inv) => {
      const match = inv.invoiceNumber.match(/INV-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `INV-${String(maxNum + 1).padStart(4, '0')}`;
  }, [invoices]);

  // ── Load data on mount ──────────────────────────
  useEffect(() => {
    dispatch(fetchCustomers());

    if (isEditing) {
      const inv = invoices.find(i => i.id === editingId);
      if (inv) {
        dispatch(
          loadInvoiceForEdit({
            invoiceNumber: inv.invoiceNumber,
            customerId: inv.customerId,
            customerName: inv.customerName,
            issueDate: inv.issueDate.slice(0, 10),
            dueDate: inv.dueDate.slice(0, 10),
            status: inv.status,
            notes: inv.notes,
            lines: inv.lines.map(l => ({
              id: l.id,
              description: l.description,
              quantity: String(l.quantity),
              unitPrice: String(l.unitPrice),
              taxRate: String(l.taxRate),
            })),
            discountType: inv.discountType,
            discountValue: String(inv.discountValue),
          }),
        );
      }
    } else {
      dispatch(setField({ key: 'invoiceNumber', value: generateInvoiceNumber() }));
      dispatch(setField({ key: 'dueDate', value: dayjs().add(30, 'day').format('YYYY-MM-DD') }));
    }

    return () => { dispatch(resetInvoiceForm()); };
  }, [isEditing, editingId, invoices, dispatch, generateInvoiceNumber]);

  // ── Customer change handler (also sets due date from terms) ──
  const handleCustomerChange = useCallback(
    (custId: string) => {
      const cust = customers.find(c => c.id === custId);
      if (!cust) return;
      dispatch(setCustomer({ id: cust.id, name: cust.name }));

      // Auto-set due date based on payment terms
      const termDays: Record<string, number> = {
        net_15: 15, net_30: 30, net_45: 45, net_60: 60, due_on_receipt: 0,
      };
      const days = termDays[cust.paymentTerms] ?? 30;
      dispatch(setField({ key: 'dueDate', value: dayjs(form.issueDate).add(days, 'day').format('YYYY-MM-DD') }));
    },
    [customers, dispatch, form.issueDate],
  );

  // ── Line helpers ────────────────────────────────
  const lineAmount = useCallback((l: FormLineItem) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return qty * price;
  }, []);

  // ── Validation ──────────────────────────────────
  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.customerId) errs.customerId = 'Select a customer';
    if (!form.invoiceNumber.trim()) errs.invoiceNumber = 'Invoice number is required';
    if (!form.issueDate) errs.issueDate = 'Issue date is required';
    if (!form.dueDate) errs.dueDate = 'Due date is required';
    if (form.lines.length === 0) errs.lines = 'At least one line item is required';

    const hasEmptyLine = form.lines.some(
      l => !l.description.trim() || !(parseFloat(l.quantity) > 0) || !(parseFloat(l.unitPrice) > 0),
    );
    if (hasEmptyLine) errs.lines = 'All line items must have description, quantity, and rate';

    return errs;
  }, [form]);

  // ── Save ────────────────────────────────────────
  const handleSave = useCallback(
    async (saveStatus: InvoiceStatus = 'draft') => {
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        dispatch(setErrors(validationErrors));
        Alert.alert('Validation Error', Object.values(validationErrors)[0]);
        return;
      }

      dispatch(setIsSaving(true));
      dispatch(calculateTotals());

      try {
        const payload = {
          companyId: 'comp_001',
          invoiceNumber: form.invoiceNumber,
          customerId: form.customerId,
          customerName: form.customerName,
          issueDate: new Date(form.issueDate).toISOString(),
          dueDate: new Date(form.dueDate).toISOString(),
          status: saveStatus,
          lines: form.lines.map(l => ({
            id: l.id,
            itemId: '',
            itemName: l.description,
            description: l.description,
            quantity: parseFloat(l.quantity) || 0,
            unitPrice: parseFloat(l.unitPrice) || 0,
            taxRate: parseFloat(l.taxRate) || 0,
            amount: (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0),
          })),
          subtotal: form.subtotal,
          taxAmount: form.taxAmount,
          discountType: form.discountType,
          discountValue: parseFloat(form.discountValue) || 0,
          discountAmount: form.discountAmount,
          total: form.total,
          amountPaid: 0,
          notes: form.notes,
          createdBy: 'admin_001',
        };

        if (isEditing) {
          await updateInvoiceAPI(editingId!, payload);
        } else {
          await createInvoiceAPI(payload);
        }

        await dispatch(fetchInvoices());

        Alert.alert(
          isEditing ? 'Invoice Updated' : 'Invoice Created',
          `${form.invoiceNumber} has been ${isEditing ? 'updated' : 'created'} as ${saveStatus}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } catch {
        Alert.alert('Error', 'Failed to save invoice. Please try again.');
      } finally {
        dispatch(setIsSaving(false));
      }
    },
    [form, isEditing, editingId, dispatch, navigation, validate],
  );

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
        <Text style={styles.headerTitle}>
          {isEditing ? `Edit ${form.invoiceNumber}` : 'New Invoice'}
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Section: Customer & Dates ────────────── */}
          <Text style={styles.sectionTitle}>Invoice Details</Text>
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
            <CustomInput
              label="Invoice #"
              value={form.invoiceNumber}
              onChangeText={v => dispatch(setField({ key: 'invoiceNumber', value: v }))}
              placeholder="INV-0000"
              error={form.errors.invoiceNumber}
              disabled={isEditing}
            />
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomInput
                  label="Issue Date *"
                  value={form.issueDate}
                  onChangeText={v => dispatch(setField({ key: 'issueDate', value: v }))}
                  placeholder="YYYY-MM-DD"
                  error={form.errors.issueDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Due Date *"
                  value={form.dueDate}
                  onChangeText={v => dispatch(setField({ key: 'dueDate', value: v }))}
                  placeholder="YYYY-MM-DD"
                  error={form.errors.dueDate}
                />
              </View>
            </View>
          </View>

          {/* ── Section: Line Items ──────────────────── */}
          <View style={styles.linesSectionHeader}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            <TouchableOpacity
              style={styles.addLineBtn}
              onPress={() => dispatch(addLine())}
              activeOpacity={0.7}
            >
              <Text style={styles.addLineBtnText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>
          {form.errors.lines && (
            <Text style={styles.lineError}>{form.errors.lines}</Text>
          )}

          {form.lines.map((line, idx) => (
            <LineItemRow
              key={line.id}
              index={idx}
              description={line.description}
              quantity={line.quantity}
              unitPrice={line.unitPrice}
              taxRate={line.taxRate}
              lineAmount={lineAmount(line)}
              onDescriptionChange={v => dispatch(updateLine({ id: line.id, field: 'description', value: v }))}
              onQuantityChange={v => dispatch(updateLine({ id: line.id, field: 'quantity', value: v }))}
              onUnitPriceChange={v => dispatch(updateLine({ id: line.id, field: 'unitPrice', value: v }))}
              onTaxRateChange={v => dispatch(updateLine({ id: line.id, field: 'taxRate', value: v }))}
              onDelete={() => dispatch(removeLine(line.id))}
              canDelete={form.lines.length > 1}
            />
          ))}

          {/* ── Section: Discount ────────────────────── */}
          <Text style={styles.sectionTitle}>Discount</Text>
          <View style={styles.sectionCard}>
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomDropdown
                  label="Discount Type"
                  options={DISCOUNT_OPTIONS}
                  value={form.discountType}
                  onChange={v => {
                    dispatch(setField({ key: 'discountType', value: v as DiscountType }));
                    dispatch(calculateTotals());
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label={form.discountType === 'percentage' ? 'Discount (%)' : 'Discount (Rs)'}
                  value={form.discountValue}
                  onChangeText={v => {
                    dispatch(setField({ key: 'discountValue', value: v.replace(/[^0-9.]/g, '') }));
                    dispatch(calculateTotals());
                  }}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* ── Section: Notes ───────────────────────── */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Notes"
              value={form.notes}
              onChangeText={v => dispatch(setField({ key: 'notes', value: v }))}
              placeholder="Additional notes for this invoice…"
              multiline
            />
          </View>

          {/* ── Totals Panel ─────────────────────────── */}
          <View style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(form.subtotal, 'Rs ')}</Text>
            </View>
            {form.discountAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Discount{' '}
                  {form.discountType === 'percentage'
                    ? `(${form.discountValue}%)`
                    : '(Fixed)'}
                </Text>
                <Text style={[styles.totalsValue, { color: colors.success }]}>
                  − {formatCurrency(form.discountAmount, 'Rs ')}
                </Text>
              </View>
            )}
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax</Text>
              <Text style={styles.totalsValue}>{formatCurrency(form.taxAmount, 'Rs ')}</Text>
            </View>
            <View style={[styles.totalsRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(form.total, 'Rs ')}</Text>
            </View>
          </View>

          {/* ── Action Buttons ───────────────────────── */}
          <View style={styles.btnRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <CustomButton
                title="Save Draft"
                onPress={() => handleSave('draft')}
                variant="secondary"
                size="lg"
                fullWidth
                isLoading={form.isSaving}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CustomButton
                title="Send"
                onPress={() => handleSave('sent')}
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
// STYLES
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
  backBtn: { fontSize: 14, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.xs },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
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

  // ── Line items header ──────────────────────────
  linesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  addLineBtn: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.secondary + '18',
    borderRadius: 20,
  },
  addLineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    fontFamily: THEME.typography.fontFamily,
  },
  lineError: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Totals ─────────────────────────────────────
  totalsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.card,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  totalsLabel: { fontSize: 14, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  totalsValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  grandTotalRow: {
    borderTopWidth: 1.5,
    borderTopColor: colors.primary,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily },

  // ── Buttons ────────────────────────────────────
  btnRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});

export default InvoiceFormScreen;
