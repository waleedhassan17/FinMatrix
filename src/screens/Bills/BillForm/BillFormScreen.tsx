// ═══════════════════════════════════════════════════════
// FinMatrix — Bill Form Screen (Create / Edit)
// Vendor dropdown, Bill Number, Dates, Line items
// (Account from COA, Description, Amount, Tax).
// Subtotal / Tax / Total.
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
  TextInput,
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
  selectBillFormState,
  setBillField,
  setBillVendor,
  setBillErrors,
  setBillIsSaving,
  addBillLine,
  removeBillLine,
  updateBillLine,
  setBillLineAccount,
  calculateBillTotals,
  loadBillForEdit,
  resetBillForm,
  type BillFormLine,
} from './billFormSlice';
import { selectBills, fetchBills } from '../BillList/billListSlice';
import { fetchVendors, selectVendors } from '../../Vendors/VendorList/vendorListSlice';
import { createBillAPI, updateBillAPI } from '../../../network/billNetwork';
import { chartOfAccountsData } from '../../../dummy-data/chartOfAccounts';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency } from '../../../utils/formatters';
import type { BillStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type FormRoute = RouteProp<TransactionsStackParamList, 'BillForm'>;

const TAX_OPTIONS = [
  { label: '0 %', value: '0' },
  { label: '5 %', value: '5' },
  { label: '10 %', value: '10' },
  { label: '17 %', value: '17' },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const BillFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.billId;
  const isEditing = !!editingId;
  const bills = useAppSelector(selectBills);
  const vendors = useAppSelector(selectVendors);
  const form = useAppSelector(selectBillFormState);

  // ── Vendor dropdown options ─────────────────────
  const vendorOptions = useMemo(
    () =>
      vendors
        .filter(v => v.isActive)
        .map(v => ({ label: v.name, value: v.id })),
    [vendors],
  );

  // ── COA expense account options ─────────────────
  const accountOptions = useMemo(
    () =>
      chartOfAccountsData
        .filter(a => a.isActive && (a.type === 'expense' || a.subType === 'cost_of_goods'))
        .map(a => ({ label: `${a.code} — ${a.name}`, value: a.id })),
    [],
  );

  // ── Auto-generate bill number ───────────────────
  const generateBillNumber = useCallback(() => {
    const maxNum = bills.reduce((max, b) => {
      const match = b.billNumber.match(/BILL-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `BILL-${String(maxNum + 1).padStart(4, '0')}`;
  }, [bills]);

  // ── Load data on mount ──────────────────────────
  useEffect(() => {
    dispatch(fetchVendors());

    if (isEditing) {
      const bill = bills.find(b => b.id === editingId);
      if (bill) {
        dispatch(
          loadBillForEdit({
            billNumber: bill.billNumber,
            vendorId: bill.vendorId,
            vendorName: bill.vendorName,
            issueDate: bill.issueDate.slice(0, 10),
            dueDate: bill.dueDate.slice(0, 10),
            status: bill.status,
            notes: bill.notes,
            lines: bill.lines.map(l => ({
              id: l.id,
              accountId: l.accountId,
              accountName: l.accountName,
              description: l.description,
              amount: String(l.amount),
              taxRate: String(l.taxRate),
            })),
          }),
        );
      }
    } else {
      dispatch(setBillField({ key: 'billNumber', value: generateBillNumber() }));
      dispatch(setBillField({ key: 'dueDate', value: dayjs().add(30, 'day').format('YYYY-MM-DD') }));
    }

    return () => { dispatch(resetBillForm()); };
  }, [isEditing, editingId, bills, dispatch, generateBillNumber]);

  // ── Vendor change handler ───────────────────────
  const handleVendorChange = useCallback(
    (vendorId: string) => {
      const vendor = vendors.find(v => v.id === vendorId);
      if (!vendor) return;
      dispatch(setBillVendor({ id: vendor.id, name: vendor.name }));

      const termDays: Record<string, number> = {
        net_15: 15, net_30: 30, net_45: 45, net_60: 60, due_on_receipt: 0,
      };
      const days = termDays[vendor.paymentTerms] ?? 30;
      dispatch(setBillField({ key: 'dueDate', value: dayjs(form.issueDate).add(days, 'day').format('YYYY-MM-DD') }));
    },
    [vendors, dispatch, form.issueDate],
  );

  // ── Account change for a line ───────────────────
  const handleAccountChange = useCallback(
    (lineId: string, accountId: string) => {
      const acct = chartOfAccountsData.find(a => a.id === accountId);
      if (acct) {
        dispatch(setBillLineAccount({ lineId, accountId: acct.id, accountName: acct.name }));
      }
    },
    [dispatch],
  );

  // ── Validation ──────────────────────────────────
  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.vendorId) errs.vendorId = 'Select a vendor';
    if (!form.billNumber.trim()) errs.billNumber = 'Bill number is required';
    if (!form.issueDate) errs.issueDate = 'Issue date is required';
    if (!form.dueDate) errs.dueDate = 'Due date is required';
    if (form.lines.length === 0) errs.lines = 'At least one line item is required';

    const hasEmptyLine = form.lines.some(
      l => !l.accountId || !(parseFloat(l.amount) > 0),
    );
    if (hasEmptyLine) errs.lines = 'All line items must have an account and amount';

    return errs;
  }, [form]);

  // ── Save ────────────────────────────────────────
  const handleSave = useCallback(
    async (saveStatus: BillStatus = 'draft') => {
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        dispatch(setBillErrors(validationErrors));
        Alert.alert('Validation Error', Object.values(validationErrors)[0]);
        return;
      }

      dispatch(setBillIsSaving(true));
      dispatch(calculateBillTotals());

      try {
        const payload = {
          companyId: 'comp_001',
          billNumber: form.billNumber,
          vendorId: form.vendorId,
          vendorName: form.vendorName,
          issueDate: new Date(form.issueDate).toISOString(),
          dueDate: new Date(form.dueDate).toISOString(),
          status: saveStatus,
          lines: form.lines.map(l => ({
            id: l.id,
            accountId: l.accountId,
            accountName: l.accountName,
            description: l.description,
            quantity: 1,
            unitPrice: parseFloat(l.amount) || 0,
            taxRate: parseFloat(l.taxRate) || 0,
            amount: parseFloat(l.amount) || 0,
          })),
          subtotal: form.subtotal,
          taxAmount: form.taxAmount,
          total: form.total,
          amountPaid: 0,
          notes: form.notes,
          createdBy: 'admin_001',
        };

        if (isEditing) {
          await updateBillAPI(editingId!, payload);
        } else {
          await createBillAPI(payload);
        }

        await dispatch(fetchBills());

        Alert.alert(
          isEditing ? 'Bill Updated' : 'Bill Created',
          `${form.billNumber} has been ${isEditing ? 'updated' : 'created'} as ${saveStatus}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } catch {
        Alert.alert('Error', 'Failed to save bill. Please try again.');
      } finally {
        dispatch(setBillIsSaving(false));
      }
    },
    [form, isEditing, editingId, dispatch, navigation, validate],
  );

  // ═════════════════════════════════════════════════════
  // RENDER LINE ITEM
  // ═════════════════════════════════════════════════════
  const renderLineItem = useCallback(
    (line: BillFormLine, idx: number) => (
      <View key={line.id} style={styles.lineCard}>
        <View style={styles.lineHeader}>
          <Text style={styles.lineLabel}>Line {idx + 1}</Text>
          {form.lines.length > 1 && (
            <TouchableOpacity
              style={styles.lineDeleteBtn}
              onPress={() => dispatch(removeBillLine(line.id))}
            >
              <Text style={styles.lineDeleteText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <CustomDropdown
          label="Account *"
          options={accountOptions}
          value={line.accountId}
          onChange={v => handleAccountChange(line.id, v)}
          placeholder="Select expense account…"
          searchable
        />

        <TextInput
          style={styles.descInput}
          value={line.description}
          onChangeText={v => dispatch(updateBillLine({ id: line.id, field: 'description', value: v }))}
          placeholder="Description"
          placeholderTextColor={colors.textLight}
        />

        <View style={styles.lineNumRow}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={styles.fieldLabel}>Amount (Rs)</Text>
            <TextInput
              style={styles.numericInput}
              value={line.amount}
              onChangeText={v =>
                dispatch(updateBillLine({ id: line.id, field: 'amount', value: v.replace(/[^0-9.]/g, '') }))
              }
              placeholder="0"
              placeholderTextColor={colors.textLight}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <CustomDropdown
              label="Tax"
              options={TAX_OPTIONS}
              value={line.taxRate}
              onChange={v => dispatch(updateBillLine({ id: line.id, field: 'taxRate', value: v }))}
            />
          </View>
        </View>

        <Text style={styles.lineTotal}>
          Line Total: {formatCurrency(
            (parseFloat(line.amount) || 0) * (1 + (parseFloat(line.taxRate) || 0) / 100),
            'Rs ',
          )}
        </Text>
      </View>
    ),
    [form.lines.length, accountOptions, dispatch, handleAccountChange],
  );

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? `Edit ${form.billNumber}` : 'New Bill'}
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Section: Vendor & Dates ──────────────── */}
          <Text style={styles.sectionTitle}>Bill Details</Text>
          <View style={styles.sectionCard}>
            <CustomDropdown
              label="Vendor *"
              options={vendorOptions}
              value={form.vendorId}
              onChange={handleVendorChange}
              placeholder="Select vendor…"
              error={form.errors.vendorId}
              searchable
            />
            <CustomInput
              label="Bill #"
              value={form.billNumber}
              onChangeText={v => dispatch(setBillField({ key: 'billNumber', value: v }))}
              placeholder="BILL-0000"
              error={form.errors.billNumber}
              disabled={isEditing}
            />
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <CustomInput
                  label="Issue Date *"
                  value={form.issueDate}
                  onChangeText={v => dispatch(setBillField({ key: 'issueDate', value: v }))}
                  placeholder="YYYY-MM-DD"
                  error={form.errors.issueDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomInput
                  label="Due Date *"
                  value={form.dueDate}
                  onChangeText={v => dispatch(setBillField({ key: 'dueDate', value: v }))}
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
              onPress={() => dispatch(addBillLine())}
              activeOpacity={0.7}
            >
              <Text style={styles.addLineBtnText}>+ Add Line</Text>
            </TouchableOpacity>
          </View>
          {form.errors.lines && (
            <Text style={styles.lineError}>{form.errors.lines}</Text>
          )}

          {form.lines.map((line, idx) => renderLineItem(line, idx))}

          {/* ── Section: Notes ───────────────────────── */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Notes"
              value={form.notes}
              onChangeText={v => dispatch(setBillField({ key: 'notes', value: v }))}
              placeholder="Additional notes for this bill…"
              multiline
            />
          </View>

          {/* ── Totals Panel ─────────────────────────── */}
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
                title="Open"
                onPress={() => handleSave('open')}
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

  // ── Line Item Card ──────────────────────────────
  lineCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lineLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  lineDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.danger + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lineDeleteText: { fontSize: 13, fontWeight: '800', color: colors.danger },

  descInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.sm,
  },
  lineNumRow: { flexDirection: 'row', marginBottom: spacing.xs },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.xs,
  },
  numericInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  lineTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
    textAlign: 'right',
    marginTop: spacing.xs,
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

  btnRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});

export default BillFormScreen;
