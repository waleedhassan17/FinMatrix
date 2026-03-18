// ═══════════════════════════════════════════════════════
// FinMatrix — Tax Payment Screen
// Record a tax payment: select rate, amount, date,
// bank account, and reference number
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

import { spacing } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  loadTaxPaymentDeps,
  setFormField,
  resetForm,
  initForTaxRate,
  submitTaxPayment,
  selectTaxPaymentForm,
  selectTaxPaymentRates,
  selectTaxPaymentAccounts,
  selectTaxPaymentLoading,
  selectTaxPaymentSaving,
  selectTaxPaymentError,
  selectTaxPaymentSaved,
} from './taxPaymentSlice';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';
import type { TaxRate, BankAccount } from '../../../types';

type Nav   = NativeStackNavigationProp<MoreStackParamList>;
type Route = RouteProp<MoreStackParamList, 'TaxPayment'>;

// ── Palette ─────────────────────────────────────────────
const P = {
  brand:      '#1B5E92',
  brandLight: '#EBF3FA',
  brandBorder:'#C8DCF0',
  pageBg:     '#F6F8FB',
  cardBg:     '#FFFFFF',
  textPrimary:'#1A2636',
  textSec:    '#5A6D80',
  textTert:   '#8A9BB0',
  border:     '#E3E9F0',
  success:    '#1D7D59',
  successBg:  '#F2FBF8',
  danger:     '#C0392B',
  dangerBg:   '#FFF3F3',
};

// ── Reusable Field Components ────────────────────────────

const FieldLabel: React.FC<{ label: string; required?: boolean }> = ({ label, required }) => (
  <Text style={styles.fieldLabel}>
    {label}{required && <Text style={{ color: P.danger }}> *</Text>}
  </Text>
);

// ── Selector Row ─────────────────────────────────────────
// Since React Native doesn't have a native Picker in all envs,
// we use a horizontal scroll strip of selectable chips

function SelectStrip<T extends { id: string }>({
  items,
  selectedId,
  onSelect,
  label,
  sublabel,
}: {
  items: T[];
  selectedId: string;
  onSelect: (id: string) => void;
  label: (item: T) => string;
  sublabel?: (item: T) => string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripScroll}>
      {items.map(item => {
        const selected = item.id === selectedId;
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.stripChip, selected && styles.stripChipSelected]}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.stripChipText, selected && styles.stripChipTextSelected]}>
              {label(item)}
            </Text>
            {sublabel && (
              <Text style={[styles.stripChipSub, selected && { color: P.brand + 'CC' }]}>
                {sublabel(item)}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Component ────────────────────────────────────────────

const TaxPaymentScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const dispatch   = useAppDispatch();

  const form      = useAppSelector(selectTaxPaymentForm);
  const rates     = useAppSelector(selectTaxPaymentRates);
  const accounts  = useAppSelector(selectTaxPaymentAccounts);
  const isLoading = useAppSelector(selectTaxPaymentLoading);
  const isSaving  = useAppSelector(selectTaxPaymentSaving);
  const error     = useAppSelector(selectTaxPaymentError);
  const saved     = useAppSelector(selectTaxPaymentSaved);

  const preselectedRateId = (route.params as { taxRateId?: string } | undefined)?.taxRateId;

  useEffect(() => {
    dispatch(resetForm());
    dispatch(loadTaxPaymentDeps()).then(() => {
      if (preselectedRateId) {
        dispatch(initForTaxRate(preselectedRateId));
      }
    });
  }, [dispatch, preselectedRateId]);

  // Navigate back on successful save
  useEffect(() => {
    if (saved) {
      Alert.alert('Payment Recorded', 'The tax payment has been recorded successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [saved, navigation]);

  const handleSubmit = useCallback(() => {
    if (!form.taxRateId) {
      Alert.alert('Validation', 'Please select a tax rate.');
      return;
    }
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid payment amount greater than 0.');
      return;
    }
    if (!form.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Validation', 'Date must be in YYYY-MM-DD format.');
      return;
    }
    if (!form.bankAccountId) {
      Alert.alert('Validation', 'Please select a bank account.');
      return;
    }
    dispatch(submitTaxPayment());
  }, [dispatch, form]);

  const selectedRate    = rates.find(r => r.id === form.taxRateId);
  const selectedAccount = accounts.find(a => a.id === form.bankAccountId);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={P.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Record Tax Payment</Text>
        </View>
        <View style={styles.centerWrap}>
          <ActivityIndicator color={P.brand} size="large" />
          <Text style={styles.loadingText}>Loading options…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color={P.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Record Tax Payment</Text>
          <Text style={styles.headerSub}>Submit payment to tax authority</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Error Banner ── */}
          {!!error && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={14} color={P.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Form Card ── */}
          <View style={styles.formCard}>

            {/* Tax Rate */}
            <FieldLabel label="Tax Rate" required />
            <SelectStrip<TaxRate>
              items={rates}
              selectedId={form.taxRateId}
              onSelect={id => dispatch(setFormField({ taxRateId: id }))}
              label={r => r.name}
              sublabel={r => `${r.rate}% · ${r.taxType}`}
            />
            {selectedRate && (
              <View style={styles.selectedInfo}>
                <Feather name="info" size={12} color={P.brand} />
                <Text style={styles.selectedInfoText}>{selectedRate.description}</Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Amount */}
            <FieldLabel label="Amount (Rs)" required />
            <View style={styles.amountRow}>
              <View style={styles.currencyPrefix}>
                <Text style={styles.currencyText}>Rs</Text>
              </View>
              <TextInput
                style={[styles.fieldInput, styles.amountInput]}
                placeholder="0.00"
                placeholderTextColor={P.textTert}
                keyboardType="decimal-pad"
                value={form.amount}
                onChangeText={v => dispatch(setFormField({ amount: v }))}
              />
            </View>

            <View style={styles.divider} />

            {/* Date */}
            <FieldLabel label="Payment Date" required />
            <View style={styles.inputWithIcon}>
              <Feather name="calendar" size={15} color={P.textTert} style={styles.inputIcon} />
              <TextInput
                style={[styles.fieldInput, styles.inputWithIconField]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={P.textTert}
                value={form.date}
                onChangeText={v => dispatch(setFormField({ date: v }))}
                autoCorrect={false}
              />
            </View>

            <View style={styles.divider} />

            {/* Bank Account */}
            <FieldLabel label="Bank Account" required />
            <SelectStrip<BankAccount>
              items={accounts}
              selectedId={form.bankAccountId}
              onSelect={id => dispatch(setFormField({ bankAccountId: id }))}
              label={a => a.bankName}
              sublabel={a => a.accountNumber}
            />
            {selectedAccount && (
              <View style={styles.selectedInfo}>
                <Feather name="credit-card" size={12} color={P.brand} />
                <Text style={styles.selectedInfoText}>
                  Balance: Rs {selectedAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Reference */}
            <FieldLabel label="Reference / Challan No." />
            <View style={styles.inputWithIcon}>
              <Feather name="hash" size={15} color={P.textTert} style={styles.inputIcon} />
              <TextInput
                style={[styles.fieldInput, styles.inputWithIconField]}
                placeholder="e.g. FBR-Q1-2026-001"
                placeholderTextColor={P.textTert}
                value={form.reference}
                onChangeText={v => dispatch(setFormField({ reference: v }))}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <View style={styles.divider} />

            {/* Notes */}
            <FieldLabel label="Notes" />
            <TextInput
              style={[styles.fieldInput, styles.notesInput]}
              placeholder="Optional notes about this payment"
              placeholderTextColor={P.textTert}
              value={form.notes}
              onChangeText={v => dispatch(setFormField({ notes: v }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ── Summary Box ── */}
          {form.taxRateId && form.amount && parseFloat(form.amount) > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Payment Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Tax Rate</Text>
                <Text style={styles.summaryVal}>{selectedRate?.name ?? '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Amount</Text>
                <Text style={[styles.summaryVal, { color: P.brand, fontWeight: '700' }]}>
                  Rs {parseFloat(form.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Date</Text>
                <Text style={styles.summaryVal}>{form.date}</Text>
              </View>
              {form.reference ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Reference</Text>
                  <Text style={styles.summaryVal}>{form.reference}</Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Bank Account</Text>
                <Text style={styles.summaryVal}>{selectedAccount ? `${selectedAccount.bankName} (${selectedAccount.accountNumber})` : '—'}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, isSaving && { opacity: 0.7 }]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            {isSaving
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Record Payment</Text>
                </>
              )
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.pageBg },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md, paddingBottom: 20 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: P.cardBg,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: P.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F1F4F8',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  headerCenter: { flex: 1 },
  headerTitle: { ...THEME.typography.h3, fontWeight: '700', color: P.textPrimary },
  headerSub: { ...THEME.typography.caption, color: P.textSec, marginTop: 1 },

  /* Center / Loading */
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { ...THEME.typography.bodySm, color: P.textSec },

  /* Error */
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: P.dangerBg, borderRadius: 10, borderWidth: 1, borderColor: '#FCCACA',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: { flex: 1, ...THEME.typography.bodySm, color: P.danger },

  /* Form Card */
  formCard: {
    backgroundColor: P.cardBg,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: P.border,
    padding: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#1A2636', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: P.border, marginVertical: spacing.md },

  /* Field label */
  fieldLabel: {
    ...THEME.typography.bodySm, fontWeight: '600',
    color: P.textPrimary,
    marginBottom: 8,
  },

  /* SelectStrip */
  stripScroll: { marginBottom: 4 },
  stripChip: {
    backgroundColor: '#F1F4F8', borderRadius: 10,
    borderWidth: 1.5, borderColor: P.border,
    paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, alignItems: 'center',
  },
  stripChipSelected: { backgroundColor: P.brandLight, borderColor: P.brand },
  stripChipText: { ...THEME.typography.bodySm, fontWeight: '600', color: P.textSec },
  stripChipTextSelected: { color: P.brand },
  stripChipSub: { ...THEME.typography.overline, color: P.textTert, marginTop: 2 },

  /* Selected info */
  selectedInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: P.brandLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, marginTop: 8,
  },
  selectedInfoText: { flex: 1, ...THEME.typography.labelSm, color: P.brand },

  /* Inputs */
  fieldInput: {
    backgroundColor: '#F6F8FB',
    borderWidth: 1, borderColor: P.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    ...THEME.typography.bodyMd, color: P.textPrimary,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  currencyPrefix: {
    backgroundColor: P.brandLight,
    borderWidth: 1, borderColor: P.brandBorder,
    borderRightWidth: 0,
    borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  currencyText: { ...THEME.typography.labelLg, color: P.brand },
  amountInput: {
    flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
  },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F6F8FB',
    borderWidth: 1, borderColor: P.border, borderRadius: 10,
  },
  inputIcon: { paddingLeft: 12 },
  inputWithIconField: {
    flex: 1, borderWidth: 0, backgroundColor: 'transparent',
    borderRadius: 0,
  },
  notesInput: { minHeight: 78 },

  /* Summary Card */
  summaryCard: {
    backgroundColor: P.cardBg,
    borderRadius: 14, borderWidth: 1.5, borderColor: P.brandBorder,
    padding: spacing.md,
    gap: 8,
  },
  summaryTitle: {
    ...THEME.typography.labelLg, fontWeight: '700', color: P.brand,
    marginBottom: 4,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryKey: { ...THEME.typography.bodySm, color: P.textSec },
  summaryVal: { ...THEME.typography.bodySm, fontWeight: '500', color: P.textPrimary },

  /* Footer */
  footer: {
    flexDirection: 'row', gap: 10,
    backgroundColor: P.cardBg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: P.border,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
  },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: P.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { ...THEME.typography.h4, color: P.textSec },
  submitBtn: {
    flex: 2, height: 48, borderRadius: 10,
    backgroundColor: P.brand,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitBtnText: { ...THEME.typography.h4, fontWeight: '700', color: '#fff' },
});

export default TaxPaymentScreen;
