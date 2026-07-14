// ═══════════════════════════════════════════════════════
// FinMatrix — Invoice Form Screen (Create / Edit)
// Customer dropdown, auto invoice #, date / due date,
// line items with tax, discount, grand total.
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
  selectInvoiceFormState,
  setField,
  setCustomer,
  setErrors,
  setIsSaving,
  addLine,
  removeLine,
  updateLine,
  setLineItem,
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
import { selectInventoryItems, fetchInventoryItems } from '../../Inventory/InventoryList/inventoryListSlice';
import { selectFeatures } from '../../Auth/authSlice';
import { createInvoiceAPI, updateInvoiceAPI } from '../../../networks/sales/invoiceNetwork';
import CustomInput from '../../../Custom-Components/CustomInput';
import { DateField } from '../../../components/reports/ReportUI';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import CustomButton from '../../../Custom-Components/CustomButton';
import LineItemRow from '../../../components/shared/LineItemRow';
import { formatCurrency } from '../../../utils/formatters';
import type { DiscountType, InvoiceStatus } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type FormRoute = RouteProp<TransactionsStackParamList, 'InvoiceForm'>;

const DISCOUNT_OPTIONS = [
  { label: 'None', value: 'none' },
  { label: 'Fixed (Rs)', value: 'amount' },
  { label: 'Percentage (%)', value: 'percent' },
];

// ── Premium palette ───────────────────────────────
const P = {
  headerFrom: '#0A1628',
  headerTo: '#132F4C',
  accent: '#059669',
  accentLight: '#ECFDF5',
  cardBg: '#FFFFFF',
  sectionLabel: '#64748B',
  totalsBg: '#0F172A',
  totalsText: '#F1F5F9',
  totalsGold: '#F59E0B',
  lineBorder: '#E2E8F0',
  lineAccent: '#059669',
  dangerAccent: '#EF4444',
};

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
  const inventory = useAppSelector(selectInventoryItems);
  const features = useAppSelector(selectFeatures);
  const form = useAppSelector(selectInvoiceFormState);
  const hydratedRef = React.useRef(false);

  // ── Inventory item options (optional per line; drives COGS) ──
  const itemOptions = useMemo(
    () => [
      { label: 'No item (free-text)', value: '' },
      ...inventory.map(it => ({
        label: `${it.sku} — ${it.name}`,
        value: it.id,
      })),
    ],
    [inventory],
  );

  const handleSelectItem = useCallback(
    (lineId: string, itemId: string) => {
      const it = inventory.find(i => i.id === itemId);
      dispatch(
        setLineItem({
          id: lineId,
          itemId,
          description: it?.name,
          unitPrice: it ? String(it.sellingPrice) : undefined,
        }),
      );
    },
    [inventory, dispatch],
  );

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
    // Inventory is tier-gated (FinMatrix.md) — skip the fetch entirely for
    // companies without the feature instead of firing a guaranteed 403.
    if (features?.inventory !== false) {
      dispatch(fetchInventoryItems());
    }

    if (hydratedRef.current) return;
    hydratedRef.current = true;

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
              itemId: l.itemId ?? '',
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
      // Preselect the customer when launched from a customer's detail screen.
      if (route.params?.customerId) {
        dispatch(setField({ key: 'customerId', value: route.params.customerId }));
      }
    }

    return () => { dispatch(resetInvoiceForm()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editingId, dispatch]);

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
          customerId: form.customerId,
          invoiceDate: form.issueDate,
          dueDate: form.dueDate,
          status: saveStatus,
          discountType: form.discountType,
          discountValue: form.discountValue || '0',
          lines: form.lines.map(l => ({
            description: l.description,
            quantity: l.quantity || '0',
            unitPrice: l.unitPrice || '0',
            taxRate: l.taxRate || '0',
            // Only send itemId when an inventory item is linked; an empty
            // string would fail the backend's @IsUUID validation.
            ...(l.itemId ? { itemId: l.itemId } : {}),
          })),
          notes: form.notes,
        };

        if (isEditing) {
          await updateInvoiceAPI(editingId!, payload as any);
        } else {
          await createInvoiceAPI(payload as any);
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
    <SafeAreaView style={[styles.container, styles.safeTop]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={P.headerFrom} />
      {/* ── Premium Gradient Header ─────────────────── */}
      <LinearGradient colors={[P.headerFrom, P.headerTo]} style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isEditing ? `Edit ${form.invoiceNumber}` : 'New Invoice'}
          </Text>
          <Text style={styles.headerSub}>
            {isEditing ? 'Update invoice details' : 'Create a professional invoice'}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Feather name="file-text" size={16} color={P.accent} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F1F5F9' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Section: Customer & Dates ────────────── */}
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionDot, { backgroundColor: P.accent }]} />
            <Text style={styles.sectionTitle}>INVOICE DETAILS</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={[styles.cardAccent, { backgroundColor: P.accent }]} />
            <View style={styles.cardBody}>
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
                  <DateField
                    label="Issue Date *"
                    value={form.issueDate}
                    onChangeText={v => dispatch(setField({ key: 'issueDate', value: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  {/* Due date is a future date → allow dates after today; never
                      before the issue date. */}
                  <DateField
                    label="Due Date *"
                    value={form.dueDate}
                    onChangeText={v => dispatch(setField({ key: 'dueDate', value: v }))}
                    minimumDate={form.issueDate ? new Date(form.issueDate) : undefined}
                    maximumDate={new Date(2100, 11, 31)}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── Section: Line Items ──────────────────── */}
          <View style={styles.linesSectionHeader}>
            <View style={styles.sectionLabelRow}>
              <View style={[styles.sectionDot, { backgroundColor: '#6366F1' }]} />
              <Text style={styles.sectionTitle}>LINE ITEMS</Text>
            </View>
            <TouchableOpacity
              style={styles.addLineBtn}
              onPress={() => dispatch(addLine())}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.addLineBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
          {form.errors.lines && (
            <Text style={styles.lineError}>{form.errors.lines}</Text>
          )}

          {form.lines.map((line, idx) => (
            <View key={line.id} style={styles.lineItemPicker}>
              <CustomDropdown
                label="Inventory Item (optional)"
                options={itemOptions}
                value={line.itemId}
                onChange={v => handleSelectItem(line.id, v)}
                placeholder="Link an inventory item…"
                searchable
              />
              <LineItemRow
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
            </View>
          ))}

          {/* ── Section: Discount ────────────────────── */}
          <View style={styles.sectionLabelRow}>
            <View style={[styles.sectionDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.sectionTitle}>DISCOUNT</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={[styles.cardAccent, { backgroundColor: '#F59E0B' }]} />
            <View style={styles.cardBody}>
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
                    label={form.discountType === 'percent' ? 'Discount (%)' : 'Discount (Rs)'}
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
          </View>

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
                onChangeText={v => dispatch(setField({ key: 'notes', value: v }))}
                placeholder="Additional notes for this invoice…"
                multiline
              />
            </View>
          </View>

          {/* ── Premium Totals Panel ──────────────────── */}
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.totalsCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.totalsHeader}>
              <Feather name="credit-card" size={16} color={P.totalsGold} />
              <Text style={styles.totalsHeaderText}>Invoice Summary</Text>
            </View>
            <View style={styles.totalsDivider} />
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(form.subtotal, 'Rs ')}</Text>
            </View>
            {form.discountAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Discount{' '}
                  {form.discountType === 'percent'
                    ? `(${form.discountValue}%)`
                    : '(Fixed)'}
                </Text>
                <Text style={[styles.totalsValue, { color: '#34D399' }]}>
                  − {formatCurrency(form.discountAmount, 'Rs ')}
                </Text>
              </View>
            )}
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
                <Text style={styles.secondaryBtnText}>Save Draft</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1.4 }}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => handleSave('sent')}
                activeOpacity={0.7}
                disabled={form.isSaving}
              >
                <LinearGradient
                  colors={['#059669', '#047857']}
                  style={styles.primaryBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Feather name="send" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>
                    {form.isSaving ? 'Saving…' : 'Save & Send'}
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

  // ── Header ──────────────────────────────────────
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: THEME.typography.fontFamily,
    marginTop: 2,
  },
  headerBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: P.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  // ── Section labels ──────────────────────────────
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.xs + 2,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: P.sectionLabel,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: 1,
  },

  // ── Section card with accent stripe ─────────────
  sectionCard: {
    flexDirection: 'row',
    backgroundColor: P.cardBg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.small,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardAccent: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: spacing.md,
  },
  rowFields: { flexDirection: 'row' },

  // ── Line items header ──────────────────────────
  linesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 6,
    paddingVertical: spacing.xs + 4,
    backgroundColor: P.accent,
    borderRadius: 20,
  },
  addLineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
  },
  lineError: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  lineItemPicker: {
    marginBottom: spacing.sm,
  },

  // ── Premium Totals Panel ────────────────────────
  totalsCard: {
    borderRadius: borderRadius.md + 4,
    padding: spacing.md + 4,
    marginTop: spacing.lg,
    ...shadows.large,
  },
  totalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  totalsHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: P.totalsGold,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: 0.5,
  },
  totalsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: spacing.xs + 2,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  totalsLabel: {
    fontSize: 14,
    color: 'rgba(241,245,249,0.6)',
    fontFamily: THEME.typography.fontFamily,
  },
  totalsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: P.totalsText,
    fontFamily: THEME.typography.fontFamily,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: P.totalsGold,
    fontFamily: THEME.typography.fontFamily,
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Buttons ────────────────────────────────────
  btnRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: P.accent,
    backgroundColor: P.accentLight,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: P.accent,
    fontFamily: THEME.typography.fontFamily,
  },
  primaryBtn: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 14,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontFamily,
  },
});

export default InvoiceFormScreen;
