// ═══════════════════════════════════════════════════════
// FinMatrix — Credit Memo Form Screen (Create / Edit)
// Credits instead of charges — no discount section.
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
  setCMIsSaving,
  addCMLine,
  removeCMLine,
  updateCMLine,
  calculateCMTotals,
  loadCreditMemoForEdit,
  resetCreditMemoForm,
  type CMFormLineItem,
} from './creditMemoFormSlice';
import {
  selectCreditMemos,
  fetchCreditMemos,
} from '../CreditMemoList/creditMemoListSlice';
import { fetchCustomers, selectCustomers } from '../../Customers/CustomerList/customerListSlice';
import { createCreditMemoAPI, updateCreditMemoAPI, getCreditMemoByIdAPI } from '../../../network/creditMemoNetwork';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import LineItemRow from '../../../components/LineItemRow';
import { formatCurrency } from '../../../utils/formatters';
import type { CreditMemoStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type FormRoute = RouteProp<TransactionsStackParamList, 'CreditMemoForm'>;

// ═══════════════════════════════════════════════════════
const CreditMemoFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.creditMemoId;
  const isEditing = !!editingId;
  const creditMemos = useAppSelector(selectCreditMemos);
  const customers = useAppSelector(selectCustomers);
  const form = useAppSelector(selectCMForm);

  const customerOptions = useMemo(
    () =>
      customers
        .filter(c => c.isActive)
        .map(c => ({ label: `${c.name} — ${c.company}`, value: c.id })),
    [customers],
  );

  const generateCMNumber = useCallback(() => {
    const maxNum = creditMemos.reduce((max, c) => {
      const match = c.creditMemoNumber.match(/CM-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `CM-${String(maxNum + 1).padStart(4, '0')}`;
  }, [creditMemos]);

  useEffect(() => {
    dispatch(fetchCustomers());

    if (isEditing) {
      // Load from list or fetch
      const existing = creditMemos.find(c => c.id === editingId);
      if (existing) {
        dispatch(loadCreditMemoForEdit(existing));
      } else {
        getCreditMemoByIdAPI(editingId!).then(cm => dispatch(loadCreditMemoForEdit(cm)));
      }
    } else {
      dispatch(setCMField({ field: 'creditMemoNumber', value: generateCMNumber() }));
    }

    return () => { dispatch(resetCreditMemoForm()); };
  }, [isEditing, editingId, creditMemos, dispatch, generateCMNumber]);

  const handleCustomerChange = useCallback(
    (custId: string) => {
      const cust = customers.find(c => c.id === custId);
      if (!cust) return;
      dispatch(setCMCustomer({ id: cust.id, name: cust.name }));
    },
    [customers, dispatch],
  );

  const lineAmount = useCallback((l: CMFormLineItem) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return qty * price;
  }, []);

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.customerId) errs.customerId = 'Select a customer';
    if (!form.creditMemoNumber.trim()) errs.creditMemoNumber = 'Credit memo number is required';
    if (!form.issueDate) errs.issueDate = 'Issue date is required';
    if (form.lines.length === 0) errs.lines = 'At least one line item is required';
    const hasEmptyLine = form.lines.some(
      l => !l.description.trim() || !(parseFloat(l.quantity) > 0) || !(parseFloat(l.unitPrice) > 0),
    );
    if (hasEmptyLine) errs.lines = 'All line items must have description, quantity, and rate';
    return errs;
  }, [form]);

  const handleSave = useCallback(
    async (saveStatus: CreditMemoStatus = 'draft') => {
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        dispatch(setCMErrors(validationErrors));
        Alert.alert('Validation Error', Object.values(validationErrors)[0]);
        return;
      }
      dispatch(setCMIsSaving(true));
      dispatch(calculateCMTotals());

      try {
        const payload = {
          companyId: 'comp_001',
          creditMemoNumber: form.creditMemoNumber,
          customerId: form.customerId,
          customerName: form.customerName,
          issueDate: new Date(form.issueDate).toISOString(),
          status: saveStatus,
          invoiceId: form.invoiceId || null,
          invoiceNumber: form.invoiceNumber || null,
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
          total: form.total,
          notes: form.notes,
          createdBy: 'admin_001',
        };

        if (isEditing && form.editId) {
          await updateCreditMemoAPI(form.editId, payload);
        } else {
          await createCreditMemoAPI(payload);
        }

        await dispatch(fetchCreditMemos());
        navigation.goBack();
        Alert.alert(
          'Success',
          isEditing
            ? `${form.creditMemoNumber} updated.`
            : `${form.creditMemoNumber} created as ${saveStatus}.`,
        );
      } catch {
        Alert.alert('Error', 'Failed to save credit memo.');
      } finally {
        dispatch(setCMIsSaving(false));
      }
    },
    [form, isEditing, validate, dispatch, navigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.backBtn}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEditing ? 'Edit Credit Memo' : 'New Credit Memo'}</Text>
            <View style={{ width: 60 }} />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Customer */}
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.sectionCard}>
            <CustomDropdown
              label="Customer *"
              options={customerOptions}
              value={form.customerId}
              onChange={handleCustomerChange}
              placeholder="Select a customer"
              searchable
              error={form.errors.customerId}
            />
          </View>

          {/* Details */}
          <Text style={styles.sectionTitle}>Credit Memo Details</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Credit Memo #"
              value={form.creditMemoNumber}
              onChangeText={v => dispatch(setCMField({ field: 'creditMemoNumber', value: v }))}
              error={form.errors.creditMemoNumber}
            />
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomInput
                  label="Issue Date"
                  value={form.issueDate.slice(0, 10)}
                  onChangeText={v => dispatch(setCMField({ field: 'issueDate', value: v }))}
                  placeholder="YYYY-MM-DD"
                  error={form.errors.issueDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Invoice Ref (optional)"
                  value={form.invoiceNumber}
                  onChangeText={v => dispatch(setCMField({ field: 'invoiceNumber', value: v }))}
                  placeholder="e.g. INV-0002"
                />
              </View>
            </View>
          </View>

          {/* Line Items */}
          <View style={styles.linesSectionHeader}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            <TouchableOpacity style={styles.addLineBtn} onPress={() => dispatch(addCMLine())} activeOpacity={0.7}>
              <Text style={styles.addLineBtnText}>+ Add Item</Text>
            </TouchableOpacity>
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
              canDelete={form.lines.length > 1}
            />
          ))}

          {/* Notes */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Notes"
              value={form.notes}
              onChangeText={v => dispatch(setCMField({ field: 'notes', value: v }))}
              placeholder="Reason for credit, reference info…"
              multiline
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

          {/* Actions */}
          <View style={styles.actions}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <CustomButton
                title="Save Draft"
                onPress={() => handleSave('draft')}
                variant="secondary"
                size="lg"
                fullWidth
                isLoading={form.isSaving}
                disabled={form.isSaving}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CustomButton
                title="Issue"
                onPress={() => handleSave('issued')}
                variant="primary"
                size="lg"
                fullWidth
                isLoading={form.isSaving}
                disabled={form.isSaving}
              />
            </View>
          </View>

          <View style={{ height: spacing.xl * 2 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Helper ────────────────────────────────────────────
const TotalsRow: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <View style={styles.totalsRow}>
    <Text style={[styles.totalsLabel, bold && styles.totalsLabelBold]}>{label}</Text>
    <Text style={[styles.totalsValue, bold && styles.totalsValueBold]}>{value}</Text>
  </View>
);

// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { fontSize: 14, fontWeight: '600', color: colors.danger, fontFamily: THEME.typography.fontFamily },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.xs, marginTop: spacing.md },
  sectionCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.xs, ...shadows.card },
  rowFields: { flexDirection: 'row' },
  linesSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xs },
  addLineBtn: { backgroundColor: colors.secondary + '18', paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  addLineBtnText: { fontSize: 13, fontWeight: '700', color: colors.secondary, fontFamily: THEME.typography.fontFamily },
  lineError: { fontSize: 12, color: colors.danger, marginBottom: spacing.xs, fontFamily: THEME.typography.fontFamily },
  totalsCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, ...shadows.card },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  totalsLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  totalsLabelBold: { fontWeight: '700', color: colors.textPrimary, fontSize: 14 },
  totalsValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  totalsValueBold: { fontWeight: '800', fontSize: 16 },
  grandDivider: { height: 1.5, backgroundColor: colors.primary, marginVertical: spacing.xs },
  actions: { flexDirection: 'row', marginTop: spacing.md },
});

export default CreditMemoFormScreen;
