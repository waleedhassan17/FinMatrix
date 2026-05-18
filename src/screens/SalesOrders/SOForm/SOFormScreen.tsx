// ═══════════════════════════════════════════════════════
// FinMatrix — Sales Order Form Screen (Create / Edit)
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
  selectSOFormState,
  setSOField,
  setSOCustomer,
  setSOErrors,
  setSOIsSaving,
  addSOLine,
  removeSOLine,
  updateSOLine,
  calculateSOTotals,
  loadSOForEdit,
  resetSOForm,
  type SOFormLineItem,
} from './soFormSlice';
import {
  selectSalesOrders,
  fetchSalesOrders,
} from '../SOList/soListSlice';
import { selectEstimates } from '../../Estimates/EstimateList/estimateListSlice';
import { fetchCustomers, selectCustomers } from '../../Customers/CustomerList/customerListSlice';
import { createSalesOrderAPI, updateSalesOrderAPI } from '../../../network/salesOrderNetwork';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import LineItemRow from '../../../components/LineItemRow';
import { formatCurrency } from '../../../utils/formatters';
import type { SalesOrderStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type FormRoute = RouteProp<TransactionsStackParamList, 'SOForm'>;

// ═══════════════════════════════════════════════════════
const SOFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.soId;
  const fromEstimateId = route.params?.fromEstimateId;
  const isEditing = !!editingId;
  const salesOrders = useAppSelector(selectSalesOrders);
  const estimates = useAppSelector(selectEstimates);
  const customers = useAppSelector(selectCustomers);
  const form = useAppSelector(selectSOFormState);

  const customerOptions = useMemo(
    () => customers.filter(c => c.isActive).map(c => ({ label: `${c.name} — ${c.company}`, value: c.id })),
    [customers],
  );

  const generateSONumber = useCallback(() => {
    const maxNum = salesOrders.reduce((max, s) => {
      const match = s.soNumber.match(/SO-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `SO-${String(maxNum + 1).padStart(4, '0')}`;
  }, [salesOrders]);

  useEffect(() => {
    dispatch(fetchCustomers());

    if (isEditing) {
      const so = salesOrders.find(s => s.id === editingId);
      if (so) {
        dispatch(
          loadSOForEdit({
            soNumber: so.soNumber,
            customerId: so.customerId,
            customerName: so.customerName,
            orderDate: so.orderDate.slice(0, 10),
            expectedDate: so.expectedDate.slice(0, 10),
            status: so.status,
            notes: so.notes,
            lines: so.lines.map(l => ({
              id: l.id,
              description: l.description || l.itemName,
              quantity: String(l.quantity),
              unitPrice: String(l.unitPrice),
              taxRate: String(l.taxRate),
              fulfilledQuantity: l.fulfilledQuantity,
            })),
          }),
        );
      }
    } else if (fromEstimateId) {
      const est = estimates.find(e => e.id === fromEstimateId);
      if (est) {
        dispatch(setSOField({ key: 'soNumber', value: generateSONumber() }));
        dispatch(setSOCustomer({ id: est.customerId, name: est.customerName }));
        dispatch(setSOField({ key: 'orderDate', value: dayjs().format('YYYY-MM-DD') }));
        dispatch(setSOField({ key: 'expectedDate', value: dayjs().add(14, 'day').format('YYYY-MM-DD') }));
        dispatch(setSOField({ key: 'notes', value: est.notes }));
        est.lines.forEach(() => dispatch(addSOLine()));
        est.lines.forEach((l, idx) => {
          dispatch(updateSOLine({ id: form.lines[idx]?.id ?? l.id, field: 'description', value: l.description || l.itemName }));
          dispatch(updateSOLine({ id: form.lines[idx]?.id ?? l.id, field: 'quantity', value: String(l.quantity) }));
          dispatch(updateSOLine({ id: form.lines[idx]?.id ?? l.id, field: 'unitPrice', value: String(l.unitPrice) }));
          dispatch(updateSOLine({ id: form.lines[idx]?.id ?? l.id, field: 'taxRate', value: String(l.taxRate) }));
          dispatch(updateSOLine({ id: form.lines[idx]?.id ?? l.id, field: 'fulfilledQuantity', value: '0' }));
        });
        dispatch(calculateSOTotals());
      }
    } else {
      dispatch(setSOField({ key: 'soNumber', value: generateSONumber() }));
      dispatch(setSOField({ key: 'expectedDate', value: dayjs().add(14, 'day').format('YYYY-MM-DD') }));
    }

    return () => { dispatch(resetSOForm()); };
  }, [isEditing, editingId, fromEstimateId, salesOrders, estimates, dispatch, generateSONumber, form.lines]);

  const handleCustomerChange = useCallback(
    (custId: string) => {
      const cust = customers.find(c => c.id === custId);
      if (!cust) return;
      dispatch(setSOCustomer({ id: cust.id, name: cust.name }));
    },
    [customers, dispatch],
  );

  const lineAmount = useCallback((l: SOFormLineItem) => {
    return (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0);
  }, []);

  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.customerId) errs.customerId = 'Select a customer';
    if (!form.soNumber.trim()) errs.soNumber = 'SO number is required';
    if (!form.orderDate) errs.orderDate = 'Order date is required';
    if (!form.expectedDate) errs.expectedDate = 'Expected date is required';
    if (form.lines.length === 0) errs.lines = 'At least one line item is required';
    const hasEmptyLine = form.lines.some(
      l => !l.description.trim() || !(parseFloat(l.quantity) > 0) || !(parseFloat(l.unitPrice) > 0),
    );
    if (hasEmptyLine) errs.lines = 'All line items must have description, quantity, and rate';
    return errs;
  }, [form]);

  const handleSave = useCallback(
    async (saveStatus: SalesOrderStatus = 'open') => {
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        dispatch(setSOErrors(validationErrors));
        Alert.alert('Validation Error', Object.values(validationErrors)[0]);
        return;
      }
      dispatch(setSOIsSaving(true));
      dispatch(calculateSOTotals());

      try {
        const payload = {
          customerId: form.customerId,
          orderDate: form.orderDate,
          expectedDate: form.expectedDate || undefined,
          lines: form.lines.map(l => ({
            description: l.description,
            orderedQty: l.quantity || '0',
            unitPrice: l.unitPrice || '0',
            taxRate: l.taxRate || '0',
          })),
          notes: form.notes,
        };

        if (isEditing) {
          await updateSalesOrderAPI(editingId!, payload as any);
        } else {
          await createSalesOrderAPI(payload as any);
        }

        await dispatch(fetchSalesOrders());
        Alert.alert(
          isEditing ? 'Sales Order Updated' : 'Sales Order Created',
          `${form.soNumber} has been ${isEditing ? 'updated' : 'created'}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } catch {
        Alert.alert('Error', 'Failed to save sales order.');
      } finally {
        dispatch(setSOIsSaving(false));
      }
    },
    [form, isEditing, editingId, dispatch, navigation, validate],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? `Edit ${form.soNumber}` : 'New Sales Order'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Order Details</Text>
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
              label="SO #"
              value={form.soNumber}
              onChangeText={v => dispatch(setSOField({ key: 'soNumber', value: v }))}
              placeholder="SO-0000"
              error={form.errors.soNumber}
              disabled={isEditing}
            />
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomInput
                  label="Order Date *"
                  value={form.orderDate}
                  onChangeText={v => dispatch(setSOField({ key: 'orderDate', value: v }))}
                  placeholder="YYYY-MM-DD"
                  error={form.errors.orderDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Expected Date *"
                  value={form.expectedDate}
                  onChangeText={v => dispatch(setSOField({ key: 'expectedDate', value: v }))}
                  placeholder="YYYY-MM-DD"
                  error={form.errors.expectedDate}
                />
              </View>
            </View>
          </View>

          {/* Line Items */}
          <View style={styles.linesSectionHeader}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            <TouchableOpacity style={styles.addLineBtn} onPress={() => dispatch(addSOLine())} activeOpacity={0.7}>
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
              onDescriptionChange={v => dispatch(updateSOLine({ id: line.id, field: 'description', value: v }))}
              onQuantityChange={v => dispatch(updateSOLine({ id: line.id, field: 'quantity', value: v }))}
              onUnitPriceChange={v => dispatch(updateSOLine({ id: line.id, field: 'unitPrice', value: v }))}
              onTaxRateChange={v => dispatch(updateSOLine({ id: line.id, field: 'taxRate', value: v }))}
              onDelete={() => dispatch(removeSOLine(line.id))}
              canDelete={form.lines.length > 1}
            />
          ))}

          {/* Notes */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Notes"
              value={form.notes}
              onChangeText={v => dispatch(setSOField({ key: 'notes', value: v }))}
              placeholder="Additional notes…"
              multiline
            />
          </View>

          {/* Totals */}
          <View style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(form.subtotal, 'Rs ')}</Text>
            </View>
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
            <View style={{ flex: 1 }}>
              <CustomButton
                title={isEditing ? 'Update Order' : 'Create Order'}
                onPress={() => handleSave('open')}
                variant="primary"
                size="sm"
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    ...shadows.small,
  },
  rowFields: { flexDirection: 'row' },
  linesSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  addLineBtn: { paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2, backgroundColor: colors.secondary + '18', borderRadius: 20 },
  addLineBtnText: { fontSize: 13, fontWeight: '700', color: colors.secondary, fontFamily: THEME.typography.fontFamily },
  lineError: { fontSize: 12, color: colors.danger, marginBottom: spacing.sm, fontFamily: THEME.typography.fontFamily },
  totalsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.small,
  },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs + 2 },
  totalsLabel: { fontSize: 14, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  totalsValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  grandTotalRow: { borderTopWidth: 1.5, borderTopColor: colors.primary, marginTop: spacing.sm, paddingTop: spacing.sm },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: THEME.typography.fontFamily },
  btnRow: { flexDirection: 'row', marginTop: spacing.lg, marginBottom: spacing.md },
});

export default SOFormScreen;
