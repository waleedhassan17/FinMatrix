// ═══════════════════════════════════════════════════════
// FinMatrix — Vendor Credit Form Screen
// Credit from vendor against open bills. Vendor dropdown,
// credit number, date, line items (Account, Description,
// Amount, Tax), Subtotal/Tax/Total, Notes, Save / Issue.
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

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectVCForm,
  setVCField,
  setVCVendor,
  setVCErrors,
  addVCLine,
  removeVCLine,
  updateVCLine,
  setVCLineAccount,
  calculateVCTotals,
  resetVendorCreditForm,
  saveVendorCredit,
  fetchVendorCreditForEdit,
  type VCFormLine,
} from './vendorCreditFormSlice';
import { fetchVendors, selectVendors } from '../../Vendors/VendorList/vendorListSlice';
import { chartOfAccountsData } from '../../../dummy-data/chartOfAccounts';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency } from '../../../utils/formatters';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type FormRoute = RouteProp<TransactionsStackParamList, 'VendorCreditForm'>;

const TAX_OPTIONS = [
  { label: '0 %', value: '0' },
  { label: '5 %', value: '5' },
  { label: '10 %', value: '10' },
  { label: '13 %', value: '13' },
  { label: '16 %', value: '16' },
  { label: '17 %', value: '17' },
  { label: '18 %', value: '18' },
];

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const VendorCreditFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.creditId;
  const isEditing = !!editingId;
  const vendors = useAppSelector(selectVendors);
  const form = useAppSelector(selectVCForm);

  // ── Vendor dropdown ─────────────────────────────
  const vendorOptions = useMemo(
    () =>
      vendors
        .filter(v => v.isActive)
        .map(v => ({ label: v.name, value: v.id })),
    [vendors],
  );

  // ── Expense account dropdown ────────────────────
  const accountOptions = useMemo(
    () =>
      chartOfAccountsData
        .filter(a => a.isActive && (a.type === 'expense' || a.type === 'asset'))
        .map(a => ({ label: `${a.code} — ${a.name}`, value: a.id })),
    [],
  );

  // ── Generate credit number ──────────────────────
  const generateCreditNumber = useCallback(() => {
    return `VC-${String(Date.now()).slice(-6)}`;
  }, []);

  // ── Load on mount ───────────────────────────────
  useEffect(() => {
    dispatch(fetchVendors());

    if (isEditing && editingId) {
      dispatch(fetchVendorCreditForEdit(editingId));
    } else {
      dispatch(setVCField({ field: 'creditNumber', value: generateCreditNumber() }));
    }

    return () => { dispatch(resetVendorCreditForm()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isEditing, editingId]);

  // ── Vendor change ───────────────────────────────
  const handleVendorChange = useCallback(
    (vendorId: string) => {
      const vendor = vendors.find(v => v.id === vendorId);
      if (!vendor) return;
      dispatch(setVCVendor({ id: vendor.id, name: vendor.name }));
    },
    [vendors, dispatch],
  );

  // ── Validation ──────────────────────────────────
  const validate = useCallback((): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.vendorId) errs.vendorId = 'Select a vendor';
    if (!form.creditNumber.trim()) errs.creditNumber = 'Credit number is required';
    if (!form.date) errs.date = 'Date is required';
    if (form.lines.length === 0) errs.lines = 'At least one line item is required';
    const hasEmpty = form.lines.some(
      l => !l.accountId || !(parseFloat(l.amount) > 0),
    );
    if (hasEmpty) errs.lines = 'All lines must have an account and a positive amount';
    return errs;
  }, [form]);

  // ── Save ────────────────────────────────────────
  const handleSave = useCallback(
    async (saveStatus: 'draft' | 'issued' = 'draft') => {
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        dispatch(setVCErrors(validationErrors));
        Alert.alert('Validation Error', Object.values(validationErrors)[0]);
        return;
      }
      dispatch(calculateVCTotals());

      try {
        await dispatch(saveVendorCredit(saveStatus)).unwrap();
        navigation.goBack();
        Alert.alert(
          'Success',
          isEditing
            ? `${form.creditNumber} updated.`
            : `${form.creditNumber} created as ${saveStatus}.`,
        );
      } catch {
        Alert.alert('Error', 'Failed to save vendor credit.');
      }
    },
    [form.creditNumber, isEditing, validate, dispatch, navigation],
  );

  // ── Line amount helper ──────────────────────────
  const lineTotal = useCallback((l: VCFormLine) => {
    const amt = parseFloat(l.amount) || 0;
    const tax = parseFloat(l.taxRate) || 0;
    return amt + amt * (tax / 100);
  }, []);

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.backBtn}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Edit Vendor Credit' : 'New Vendor Credit'}
            </Text>
            <View style={{ width: 60 }} />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Vendor */}
          <Text style={styles.sectionTitle}>Vendor</Text>
          <View style={styles.sectionCard}>
            <CustomDropdown
              label="Vendor *"
              options={vendorOptions}
              value={form.vendorId}
              onChange={handleVendorChange}
              placeholder="Select vendor…"
              searchable
              error={form.errors.vendorId}
            />
          </View>

          {/* Credit Details */}
          <Text style={styles.sectionTitle}>Credit Details</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Credit Number"
              value={form.creditNumber}
              onChangeText={v =>
                dispatch(setVCField({ field: 'creditNumber', value: v }))
              }
              error={form.errors.creditNumber}
            />
            <CustomInput
              label="Date *"
              value={form.date}
              onChangeText={v =>
                dispatch(setVCField({ field: 'date', value: v }))
              }
              placeholder="YYYY-MM-DD"
              error={form.errors.date}
            />
          </View>

          {/* Line Items */}
          <View style={styles.linesSectionHeader}>
            <Text style={styles.sectionTitle}>Line Items</Text>
            <TouchableOpacity
              style={styles.addLineBtn}
              onPress={() => dispatch(addVCLine())}
              activeOpacity={0.7}
            >
              <Text style={styles.addLineBtnText}>+ Add Line</Text>
            </TouchableOpacity>
          </View>
          {form.errors.lines && (
            <Text style={styles.lineError}>{form.errors.lines}</Text>
          )}

          {form.lines.map((line, idx) => (
            <View key={line.id} style={styles.lineCard}>
              <View style={styles.lineHeader}>
                <Text style={styles.lineIndex}>#{idx + 1}</Text>
                {form.lines.length > 1 && (
                  <TouchableOpacity
                    onPress={() => dispatch(removeVCLine(line.id))}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.lineDeleteBtn}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <CustomDropdown
                label="Account *"
                options={accountOptions}
                value={line.accountId}
                onChange={v => {
                  const acct = chartOfAccountsData.find(a => a.id === v);
                  if (acct) {
                    dispatch(
                      setVCLineAccount({
                        lineId: line.id,
                        accountId: acct.id,
                        accountName: acct.name,
                      }),
                    );
                  }
                }}
                placeholder="Select expense account…"
                searchable
              />

              <TextInput
                style={styles.descInput}
                placeholder="Description"
                placeholderTextColor={colors.textLight}
                value={line.description}
                onChangeText={v =>
                  dispatch(updateVCLine({ id: line.id, field: 'description', value: v }))
                }
              />

              <View style={styles.lineRow}>
                <View style={styles.lineCol}>
                  <Text style={styles.fieldLabel}>Amount</Text>
                  <TextInput
                    style={styles.numInput}
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                    keyboardType="decimal-pad"
                    value={line.amount}
                    onChangeText={v =>
                      dispatch(
                        updateVCLine({
                          id: line.id,
                          field: 'amount',
                          value: v.replace(/[^0-9.]/g, ''),
                        }),
                      )
                    }
                  />
                </View>
                <View style={styles.lineCol}>
                  <CustomDropdown
                    label="Tax %"
                    options={TAX_OPTIONS}
                    value={line.taxRate}
                    onChange={v =>
                      dispatch(updateVCLine({ id: line.id, field: 'taxRate', value: v }))
                    }
                  />
                </View>
              </View>

              <View style={styles.lineTotalRow}>
                <Text style={styles.lineTotalLabel}>Line Total</Text>
                <Text style={styles.lineTotalValue}>
                  {formatCurrency(lineTotal(line), 'Rs ')}
                </Text>
              </View>
            </View>
          ))}

          {/* Notes */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.sectionCard}>
            <CustomInput
              label="Notes"
              value={form.notes}
              onChangeText={v =>
                dispatch(setVCField({ field: 'notes', value: v }))
              }
              placeholder="Reason for vendor credit…"
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

          {/* Actions — equal-width buttons via gap (not asymmetric margin) */}
          <View style={styles.actions}>
            <View style={styles.actionBtn}>
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
            <View style={styles.actionBtn}>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
    fontFamily: THEME.typography.fontFamily,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    ...shadows.card,
  },

  linesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  addLineBtn: {
    backgroundColor: colors.secondary + '18',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
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
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },

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
    marginBottom: spacing.xs,
  },
  lineIndex: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
  },
  lineDeleteBtn: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.danger,
    paddingHorizontal: spacing.xs,
  },
  descInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.sm,
  },
  // Equal-width line columns via gap (consistent with rest of codebase)
  lineRow: { flexDirection: 'row', gap: spacing.sm },
  lineCol: { flex: 1 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.xs / 2,
  },
  numInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    textAlign: 'right',
  },
  lineTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  lineTotalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  lineTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },

  totalsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  totalsLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  totalsLabelBold: { fontWeight: '700', color: colors.textPrimary, fontSize: 14 },
  totalsValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  totalsValueBold: { fontWeight: '800', fontSize: 16 },
  grandDivider: {
    height: 1.5,
    backgroundColor: colors.primary,
    marginVertical: spacing.xs,
  },

  // Equal-width action buttons — flex:1 + gap (no asymmetric margins)
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionBtn: { flex: 1 },
});

export default VendorCreditFormScreen;
