// ═══════════════════════════════════════════════════════
// FinMatrix — Estimate Form Screen (Create / Edit)
// Like InvoiceForm but with expiration date instead of due date.
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
  selectEstimateFormState,
  setEstField,
  setEstCustomer,
  setEstErrors,
  setEstIsSaving,
  addEstLine,
  removeEstLine,
  updateEstLine,
  calculateEstTotals,
  loadEstimateForEdit,
  resetEstimateForm,
  type FormLineItem,
} from './estimateFormSlice';
import {
  selectEstimates,
  fetchEstimates,
} from '../EstimateList/estimateListSlice';
import { fetchCustomers, selectCustomers } from '../../Customers/CustomerList/customerListSlice';
import { createEstimateAPI, updateEstimateAPI } from '../../../network/estimateNetwork';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import LineItemRow from '../../../components/LineItemRow';
import { formatCurrency } from '../../../utils/formatters';
import type { DiscountType, EstimateStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type FormRoute = RouteProp<TransactionsStackParamList, 'EstimateForm'>;

const DISCOUNT_OPTIONS = [
  { label: 'Fixed (Rs)', value: 'fixed' },
  { label: 'Percentage (%)', value: 'percentage' },
];

// ═══════════════════════════════════════════════════════
const EstimateFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.estimateId;
  const isEditing = !!editingId;
  const estimates = useAppSelector(selectEstimates);
  const customers = useAppSelector(selectCustomers);
  const form = useAppSelector(selectEstimateFormState);

  const customerOptions = useMemo(
    () =>
      customers
        .filter(c => c.isActive)
        .map(c => ({ label: `${c.name} — ${c.company}`, value: c.id })),
    [customers],
  );

  const generateEstimateNumber = useCallback(() => {
    const maxNum = estimates.reduce((max, e) => {
      const match = e.estimateNumber.match(/EST-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `EST-${String(maxNum + 1).padStart(4, '0')}`;
  }, [estimates]);

  useEffect(() => {
    dispatch(fetchCustomers());

    if (isEditing) {
      const est = estimates.find(e => e.id === editingId);
      if (est) {
        dispatch(
          loadEstimateForEdit({
            estimateNumber: est.estimateNumber,
            customerId: est.customerId,
            customerName: est.customerName,
            issueDate: est.issueDate.slice(0, 10),
            expirationDate: est.expirationDate.slice(0, 10),
            status: est.status,
            notes: est.notes,
            lines: est.lines.map(l => ({
              id: l.id,
              description: l.description,
              quantity: String(l.quantity),
              unitPrice: String(l.unitPrice),
              taxRate: String(l.taxRate),
            })),
            discountType: est.discountType,
            discountValue: String(est.discountValue),
          }),
        );
      }
    } else {
      dispatch(setEstField({ key: 'estimateNumber', value: generateEstimateNumber() }));
      dispatch(setEstField({ key: 'expirationDate', value: dayjs().add(30, 'day').format('YYYY-MM-DD') }));
    }

    return () => { dispatch(resetEstimateForm()); };
  }, [isEditing, editingId, estimates, dispatch, generateEstimateNumber]);

  const handleCustomerChange = useCallback(
    (custId: string) => {
      const cust = customers.find(c => c.id === custId);
      if (!cust) return;
      dispatch(setEstCustomer({ id: cust.id, name: cust.name }));
    },
    [customers, dispatch],
  );

  const lineAmount = useCallback((l: FormLineItem) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return qty * price;
  }, []);

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.customerId) errs.customerId = 'Select a customer';
    if (!form.estimateNumber.trim()) errs.estimateNumber = 'Estimate number is required';
    if (!form.issueDate) errs.issueDate = 'Issue date is required';
    if (!form.expirationDate) errs.expirationDate = 'Expiration date is required';
    if (form.lines.length === 0) errs.lines = 'At least one line item is required';
    const hasEmptyLine = form.lines.some(
      l => !l.description.trim() || !(parseFloat(l.quantity) > 0) || !(parseFloat(l.unitPrice) > 0),
    );
    if (hasEmptyLine) errs.lines = 'All line items must have description, quantity, and rate';
    return errs;
  }, [form]);

  const handleSave = useCallback(
    async (saveStatus: EstimateStatus = 'draft') => {
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        dispatch(setEstErrors(validationErrors));
        Alert.alert('Validation Error', Object.values(validationErrors)[0]);
        return;
      }
      dispatch(setEstIsSaving(true));
      dispatch(calculateEstTotals());

      try {
        const payload = {
          companyId: 'comp_001',
          estimateNumber: form.estimateNumber,
          customerId: form.customerId,
          customerName: form.customerName,
          issueDate: new Date(form.issueDate).toISOString(),
          expirationDate: new Date(form.expirationDate).toISOString(),
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
          notes: form.notes,
          createdBy: 'admin_001',
        };

        if (isEditing) {
          await updateEstimateAPI(editingId!, payload);
        } else {
          await createEstimateAPI(payload);
        }

        await dispatch(fetchEstimates());

        Alert.alert(
          isEditing ? 'Estimate Updated' : 'Estimate Created',
          `${form.estimateNumber} has been ${isEditing ? 'updated' : 'created'} as ${saveStatus}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } catch {
        Alert.alert('Error', 'Failed to save estimate. Please try again.');
      } finally {
        dispatch(setEstIsSaving(false));
      }
    },
    [form, isEditing, editingId, dispatch, navigation, validate],
  );

  // ═══════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? `Edit ${form.estimateNumber}` : 'New Estimate'}
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Estimate Details */}
          <Text style={styles.sectionTitle}>Estimate Details</Text>
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
              label="Estimate #"
              value={form.estimateNumber}
              onChangeText={v => dispatch(setEstField({ key: 'estimateNumber', value: v }))}
              placeholder="EST-0000"
              error={form.errors.estimateNumber}
              disabled={isEditing}
            />
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomInput
                  label="Issue Date *"
                  value={form.issueDate}
                  onChangeText={v => dispatch(setEstField({ key: 'issueDate', value: v }))}
                  placeholder="YYYY-MM-DD"
                  error={form.errors.issueDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Expiration Date *"
                  value={form.expirationDate}
                  onChangeText={v => dispatch(setEstField({ key: 'expirationDate', value: v }))}
                  placeholder="YYYY-MM-DD"
                  error={form.errors.expirationDate}
                />
              </View>
            </View>
          </View>

          {/* Line Items */}
          <View style={styles.linesSectionHeader}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            <TouchableOpacity style={styles.addLineBtn} onPress={() => dispatch(addEstLine())} activeOpacity={0.7}>
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
              onDescriptionChange={v => dispatch(updateEstLine({ id: line.id, field: 'description', value: v }))}
              onQuantityChange={v => dispatch(updateEstLine({ id: line.id, field: 'quantity', value: v }))}
              onUnitPriceChange={v => dispatch(updateEstLine({ id: line.id, field: 'unitPrice', value: v }))}
              onTaxRateChange={v => dispatch(updateEstLine({ id: line.id, field: 'taxRate', value: v }))}
              onDelete={() => dispatch(removeEstLine(line.id))}
              canDelete={form.lines.length > 1}
            />
          ))}

          {/* Discount */}
          <Text style={styles.sectionTitle}>Discount</Text>
          <View style={styles.sectionCard}>
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomDropdown
                  label="Discount Type"
                  options={DISCOUNT_OPTIONS}
                  value={form.discountType}
                  onChange={v => {
                    dispatch(setEstField({ key: 'discountType', value: v as DiscountType }));
                    dispatch(calculateEstTotals());
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label={form.discountType === 'percentage' ? 'Discount (%)' : 'Discount (Rs)'}
                  value={form.discountValue}
                  onChangeText={v => {
                    dispatch(setEstField({ key: 'discountValue', value: v.replace(/[^0-9.]/g, '') }));
                    dispatch(calculateEstTotals());
                  }}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Notes */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Notes"
              value={form.notes}
              onChangeText={v => dispatch(setEstField({ key: 'notes', value: v }))}
              placeholder="Additional notes for this estimate…"
              multiline
            />
          </View>

          {/* Totals */}
          <View style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(form.subtotal, 'Rs ')}</Text>
            </View>
            {form.discountAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Discount {form.discountType === 'percentage' ? `(${form.discountValue}%)` : '(Fixed)'}
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

          {/* Actions */}
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
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { ...THEME.typography.labelLg, color: colors.secondary, marginBottom: spacing.xs },
  headerTitle: { ...THEME.typography.h2, color: colors.textPrimary },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: { ...THEME.typography.h4, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.md },
  sectionCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.xs },
  rowFields: { flexDirection: 'row' },
  linesSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  addLineBtn: { paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2, backgroundColor: colors.secondary + '18', borderRadius: 20 },
  addLineBtnText: { ...THEME.typography.bodySm, fontWeight: '700', color: colors.secondary },
  lineError: { fontSize: 12, color: colors.danger, marginBottom: spacing.sm },
  totalsCard: { backgroundColor: colors.white, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.md, ...shadows.card },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs + 2 },
  totalsLabel: { ...THEME.typography.bodyMd, color: colors.textSecondary },
  totalsValue: { ...THEME.typography.labelLg, color: colors.textPrimary },
  grandTotalRow: { borderTopWidth: 1.5, borderTopColor: colors.primary, marginTop: spacing.sm, paddingTop: spacing.sm },
  grandTotalLabel: { ...THEME.typography.h4, color: colors.textPrimary },
  grandTotalValue: { ...THEME.typography.h3, color: colors.primary },
  btnRow: { flexDirection: 'row', marginTop: spacing.lg, marginBottom: spacing.xl },
});

export default EstimateFormScreen;
