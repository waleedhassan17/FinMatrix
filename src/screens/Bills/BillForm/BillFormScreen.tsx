// ═══════════════════════════════════════════════════════
// FinMatrix — Bill Form Screen (Create / Edit)
// Premium Enterprise UI
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
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  selectBillFormState,
  setBillField,
  setBillVendor,
  setBillErrors,
  addBillLine,
  removeBillLine,
  updateBillLine,
  setBillLineAccount,
  calculateBillTotals,
  resetBillForm,
  saveBill,
  fetchBillForEdit,
  fetchBillFromPO,
  type BillFormLine,
} from './billFormSlice';
import { selectBills, fetchBills, upsertBill } from '../BillList/billListSlice';
import { fetchVendors, selectVendors } from '../../Vendors/VendorList/vendorListSlice';
import { chartOfAccountsData } from '../../../models/coaModel';
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

// ── Premium palette ───────────────────────────────
const P = {
  headerFrom: '#0A1628',
  headerTo: '#132F4C',
  accent: '#DE350B',
  accentLight: '#FFF1F0',
  cardBg: '#FFFFFF',
  sectionLabel: '#64748B',
  totalsBg: '#0F172A',
  totalsText: '#F1F5F9',
  totalsGold: '#F59E0B',
  lineAccent: '#DE350B',
};

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const BillFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<FormRoute>();
  const dispatch = useAppDispatch();

  const editingId = route.params?.billId;
  const fromPOId = route.params?.fromPOId;
  const isEditing = !!editingId;
  const isFromPO = !!fromPOId;
  const bills = useAppSelector(selectBills);
  const vendors = useAppSelector(selectVendors);
  const form = useAppSelector(selectBillFormState);
  const hydratedRef = React.useRef(false);

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

  // ── Load data on mount ──────────────────
  useEffect(() => {
    dispatch(fetchVendors());

    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (isEditing && editingId) {
      dispatch(fetchBillForEdit(editingId));
    } else if (isFromPO && fromPOId) {
      dispatch(setBillField({ key: 'billNumber', value: generateBillNumber() }));
      dispatch(setBillField({ key: 'dueDate', value: dayjs().add(30, 'day').format('YYYY-MM-DD') }));
      dispatch(fetchBillFromPO(fromPOId));
    } else {
      dispatch(setBillField({ key: 'billNumber', value: generateBillNumber() }));
      dispatch(setBillField({ key: 'dueDate', value: dayjs().add(30, 'day').format('YYYY-MM-DD') }));
    }

    return () => { dispatch(resetBillForm()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editingId, dispatch]);

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

      dispatch(calculateBillTotals());

      try {
        const result: any = await dispatch(saveBill(saveStatus));
        if (result.error) throw new Error(result.error.message);
        const saved = result.payload;
        if (saved) dispatch(upsertBill(saved));
        await dispatch(fetchBills());

        const jeNarrative = isFromPO
          ? 'JE posted: DR Inventory, CR AP. Inventory quantities updated.'
          : 'JE posted: DR Expense, CR AP.';
        Alert.alert(
          isEditing ? 'Bill Updated' : 'Bill Created',
          `${form.billNumber} has been ${isEditing ? 'updated' : 'created'} as ${saveStatus}. ${jeNarrative}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } catch {
        Alert.alert('Error', 'Failed to save bill. Please try again.');
      }
    },
    [form, isEditing, dispatch, navigation, validate],
  );

  // ═════════════════════════════════════════════════════
  // RENDER LINE ITEM
  // ═════════════════════════════════════════════════════
  const renderLineItem = useCallback(
    (line: BillFormLine, idx: number) => (
      <View key={line.id} style={styles.lineCard}>
        <View style={[styles.lineCardAccent, { backgroundColor: idx % 2 === 0 ? '#DE350B' : '#6554C0' }]} />
        <View style={styles.lineCardBody}>
          <View style={styles.lineHeader}>
            <View style={styles.lineBadge}>
              <Text style={styles.lineBadgeText}>{idx + 1}</Text>
            </View>
            <Text style={styles.lineLabel}>Line Item</Text>
            {form.lines.length > 1 && (
              <TouchableOpacity
                style={styles.lineDeleteBtn}
                onPress={() => dispatch(removeBillLine(line.id))}
              >
                <Feather name="trash-2" size={14} color="#EF4444" />
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

          <View style={styles.lineTotalRow}>
            <Feather name="arrow-right" size={12} color={colors.primary} />
            <Text style={styles.lineTotal}>
              {formatCurrency(
                (parseFloat(line.amount) || 0) * (1 + (parseFloat(line.taxRate) || 0) / 100),
                'Rs ',
              )}
            </Text>
          </View>
        </View>
      </View>
    ),
    [form.lines.length, accountOptions, dispatch, handleAccountChange],
  );

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={P.headerFrom} />
      {/* ── Premium Gradient Header ─────────────────── */}
      <LinearGradient colors={[P.headerFrom, P.headerTo]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isEditing ? `Edit ${form.billNumber}` : 'New Bill'}
          </Text>
          <Text style={styles.headerSub}>
            {isEditing ? 'Update bill details' : 'Record a vendor expense'}
          </Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: P.accentLight }]}>
          <Feather name="shopping-cart" size={16} color={P.accent} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F1F5F9' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Section: Vendor & Dates ──────────────── */}
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionDot, { backgroundColor: P.accent }]} />
            <Text style={styles.sectionTitle}>BILL DETAILS</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={[styles.cardAccent, { backgroundColor: P.accent }]} />
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
          </View>

          {/* ── Section: Line Items ──────────────────── */}
          <View style={styles.linesSectionHeader}>
            <View style={styles.sectionLabelRow}>
              <View style={[styles.sectionDot, { backgroundColor: '#6554C0' }]} />
              <Text style={styles.sectionTitle}>LINE ITEMS</Text>
            </View>
            <TouchableOpacity
              style={styles.addLineBtn}
              onPress={() => dispatch(addBillLine())}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.addLineBtnText}>Add Line</Text>
            </TouchableOpacity>
          </View>
          {form.errors.lines && (
            <Text style={styles.lineError}>{form.errors.lines}</Text>
          )}

          {form.lines.map((line, idx) => renderLineItem(line, idx))}

          {/* ── Section: Notes ───────────────────────── */}
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.sectionTitle}>NOTES</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={[styles.cardAccent, { backgroundColor: '#8B5CF6' }]} />
            <View style={styles.cardBody}>
              <CustomInput
                label="Notes"
                value={form.notes}
                onChangeText={v => dispatch(setBillField({ key: 'notes', value: v }))}
                placeholder="Additional notes for this bill…"
                multiline
              />
            </View>
          </View>

          {/* ── Premium Totals Panel ─────────────────── */}
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.totalsCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.totalsHeader}>
              <Feather name="credit-card" size={16} color={P.totalsGold} />
              <Text style={styles.totalsHeaderText}>Bill Summary</Text>
            </View>
            <View style={styles.totalsDivider} />
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(form.subtotal, 'Rs ')}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax</Text>
              <Text style={styles.totalsValue}>{formatCurrency(form.taxAmount, 'Rs ')}</Text>
            </View>
            <View style={styles.totalsDivider} />
            <View style={styles.totalsRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(form.total, 'Rs ')}</Text>
            </View>
          </LinearGradient>

          {/* ── Action Buttons ───────────────────────── */}
          <View style={styles.btnRow}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => handleSave('draft')}
                activeOpacity={0.7}
                disabled={form.isSaving}
              >
                <Feather name="save" size={16} color={P.accent} />
                <Text style={[styles.secondaryBtnText, { color: P.accent }]}>Save Draft</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1.4 }}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => handleSave('open')}
                activeOpacity={0.7}
                disabled={form.isSaving}
              >
                <LinearGradient
                  colors={['#DE350B', '#BF2600']}
                  style={styles.primaryBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Feather name="check-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>
                    {form.isSaving ? 'Saving…' : isEditing ? 'Update & Open' : 'Save & Open'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  safeTop: { backgroundColor: P.headerFrom },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  headerCenter: { flex: 1, marginLeft: spacing.sm },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', fontFamily: THEME.typography.fontFamily },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  headerBadge: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },

  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm, gap: spacing.xs + 2 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', fontFamily: THEME.typography.fontFamily, letterSpacing: 1 },

  sectionCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    overflow: 'hidden', ...shadows.small, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md },
  rowFields: { flexDirection: 'row' },

  linesSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  addLineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.sm + 6, paddingVertical: spacing.xs + 4,
    backgroundColor: '#6554C0', borderRadius: 20,
  },
  addLineBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', fontFamily: THEME.typography.fontFamily },
  lineError: { fontSize: 12, color: colors.danger, marginBottom: spacing.sm, fontFamily: THEME.typography.fontFamily },

  // ── Line Item Card ──────────────────────────────
  lineCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: borderRadius.md,
    overflow: 'hidden', marginBottom: spacing.sm, ...shadows.small,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  lineCardAccent: { width: 4 },
  lineCardBody: { flex: 1, padding: spacing.md },
  lineHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.xs },
  lineBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  lineBadgeText: { fontSize: 11, fontWeight: '800', color: '#64748B', fontFamily: THEME.typography.fontFamily },
  lineLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  lineDeleteBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center',
  },

  descInput: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm,
    fontSize: 14, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily,
    marginBottom: spacing.sm, backgroundColor: '#F8FAFC',
  },
  lineNumRow: { flexDirection: 'row', marginBottom: spacing.xs },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginBottom: spacing.xs },
  numericInput: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm,
    fontSize: 14, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily,
    backgroundColor: '#F8FAFC',
  },
  lineTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: spacing.xs },
  lineTotal: { fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: THEME.typography.fontFamily },

  // ── Totals ─────────────────────────────────────
  totalsCard: { borderRadius: borderRadius.md + 4, padding: spacing.md + 4, marginTop: spacing.lg, ...shadows.large },
  totalsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginBottom: spacing.sm },
  totalsHeaderText: { fontSize: 13, fontWeight: '700', color: '#F59E0B', fontFamily: THEME.typography.fontFamily, letterSpacing: 0.5 },
  totalsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: spacing.xs + 2 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs + 2 },
  totalsLabel: { fontSize: 14, color: 'rgba(241,245,249,0.6)', fontFamily: THEME.typography.fontFamily },
  totalsValue: { fontSize: 14, fontWeight: '600', color: '#F1F5F9', fontFamily: THEME.typography.fontFamily },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: '#F59E0B', fontFamily: THEME.typography.fontFamily },
  grandTotalValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', fontFamily: THEME.typography.fontFamily },

  btnRow: { flexDirection: 'row', marginTop: spacing.lg, marginBottom: spacing.md },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    paddingVertical: 14, borderRadius: borderRadius.md,
    borderWidth: 1.5, borderColor: '#DE350B', backgroundColor: '#FFF1F0',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', fontFamily: THEME.typography.fontFamily },
  primaryBtn: { borderRadius: borderRadius.md, overflow: 'hidden', ...shadows.card },
  primaryBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: 14,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: THEME.typography.fontFamily },
});

export default BillFormScreen;
