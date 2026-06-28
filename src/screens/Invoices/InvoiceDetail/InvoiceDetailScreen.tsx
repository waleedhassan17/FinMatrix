// ═══════════════════════════════════════════════════════
// FinMatrix — Invoice Detail Screen
// Professional invoice preview with company info, bill-to,
// metadata, line items table, totals, payment history,
// remaining balance, and status-based action bar.
// ═══════════════════════════════════════════════════════

import React, { useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchInvoiceDetail,
  resetInvoiceDetail,
  selectInvoiceDetail,
  selectInvoicePayments,
  selectInvoiceDetailLoading,
  selectInvoiceDetailSending,
  selectInvoiceDetailError,
  sendInvoice,
} from './invoiceDetailSlice';
import {
  fetchInvoices,
  selectInvoices,
  upsertInvoice,
} from '../InvoiceList/invoiceListSlice';
import {
  fetchCustomers,
  selectCustomers,
} from '../../Customers/CustomerList/customerListSlice';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import {
  shareInvoiceViaWhatsApp,
  shareInvoicePdf,
  openWhatsAppChat,
  sanitizePhoneForWhatsApp,
} from '../../../utils/invoiceShare';
import type { InvoiceStatus, Payment } from '../../../types';
import type { TransactionsStackParamList } from '../../../navigators/stacks/TransactionsStack';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type DetailRoute = RouteProp<TransactionsStackParamList, 'InvoiceDetail'>;

// ── Status → colour mapping ──────────────────────────
const STATUS_COLOR: Record<InvoiceStatus, string> = {
  draft: '#94A3B8',
  sent: colors.secondary,
  partial: '#FF991F',
  paid: colors.success,
  overdue: colors.danger,
  void: '#64748B',
  cancelled: '#475569',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
  cancelled: 'Cancelled',
};

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
};

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const InvoiceDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();

  const invoiceId = route.params.invoiceId;
  const invoice = useAppSelector(selectInvoiceDetail);
  const payments = useAppSelector(selectInvoicePayments);
  const isLoading = useAppSelector(selectInvoiceDetailLoading);
  const isSending = useAppSelector(selectInvoiceDetailSending);
  const error = useAppSelector(selectInvoiceDetailError);
  const customers = useAppSelector(selectCustomers);
  const invoicesList = useAppSelector(selectInvoices);

  const [refreshing, setRefreshing] = React.useState(false);

  // ── Load data ───────────────────────────────
  useEffect(() => {
    dispatch(fetchInvoiceDetail(invoiceId));
    // Customers are needed for the Bill-To block on the PDF
    // and for the WhatsApp phone-number lookup.
    if (customers.length === 0) dispatch(fetchCustomers());
    return () => { dispatch(resetInvoiceDetail()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, dispatch]);

  // Re-fetch whenever the screen regains focus (e.g. after returning from
  // Record Payment) so the balance, status badge and payment history reflect
  // the freshly-recorded payment. The initial mount is skipped — the effect
  // above already loads it.
  useEffect(() => {
    let isInitial = true;
    const unsubscribe = navigation.addListener('focus', () => {
      if (isInitial) { isInitial = false; return; }
      dispatch(fetchInvoiceDetail(invoiceId));
    });
    return unsubscribe;
  }, [navigation, invoiceId, dispatch]);

  // Resolve the customer record that matches this invoice.
  const customer = useMemo(
    () => customers.find(c => c.id === invoice?.customerId) || null,
    [customers, invoice?.customerId],
  );
  const customerHasWhatsApp = !!sanitizePhoneForWhatsApp(customer?.phone);
  void invoicesList;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchInvoiceDetail(invoiceId));
    setRefreshing(false);
  }, [invoiceId, dispatch]);

  // ── Derived ─────────────────────────────────────
  const balance = useMemo(
    () => (invoice ? invoice.total - invoice.amountPaid : 0),
    [invoice],
  );

  // ── Actions ─────────────────────────────────

  /** After a successful share we transition the invoice to
   *  "sent" on the backend and refresh the list behind the
   *  scenes so the status badge updates everywhere. */
  const markAsSentOnBackend = useCallback(
    async (channel: 'whatsapp' | 'email' | 'share', toPhone?: string) => {
      if (!invoice) return;
      const action = await dispatch(
        sendInvoice({ id: invoice.id, channel, toPhone }),
      );
      // Keep the list slice in sync without a full re-fetch.
      const payload: any = (action as any)?.payload;
      const updated = payload?.data?.invoice;
      if (updated) dispatch(upsertInvoice(updated));
      else dispatch(fetchInvoices());
    },
    [dispatch, invoice],
  );

  const handleSendViaWhatsApp = useCallback(async () => {
    if (!invoice) return;
    const result = await shareInvoiceViaWhatsApp({ invoice, customer });
    if (result.shared) {
      await markAsSentOnBackend(
        'whatsapp',
        sanitizePhoneForWhatsApp(customer?.phone) || undefined,
      );
    }
  }, [invoice, customer, markAsSentOnBackend]);

  const handleSharePdf = useCallback(async () => {
    if (!invoice) return;
    const result = await shareInvoicePdf({ invoice, customer });
    if (result.shared && invoice.status === 'draft') {
      await markAsSentOnBackend('share');
    }
  }, [invoice, customer, markAsSentOnBackend]);

  const handleOpenWhatsAppChat = useCallback(async () => {
    if (!invoice) return;
    const result = await openWhatsAppChat({ invoice, customer });
    if (!result.opened) {
      Alert.alert('WhatsApp', result.reason || 'Could not open WhatsApp.');
    }
  }, [invoice, customer]);

  // ── Loading / Error states ──────────────────────
  if (isLoading && !invoice) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !invoice) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Invoice not found'}</Text>
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="secondary" size="md" />
        </View>
      </SafeAreaView>
    );
  }

  const statusCol = STATUS_COLOR[invoice.status];

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.7}>
              <Feather name="arrow-left" size={24} color={colors.secondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusCol + '18' }]}>
            <Text style={[styles.badgeText, { color: statusCol }]}>
              {STATUS_LABEL[invoice.status]}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* ── Company Info ────────────────────────── */}
        <View style={styles.invoiceCard}>
          <Text style={styles.companyName}>FinMatrix Corp.</Text>
          <Text style={styles.companyMeta}>Office 23, Gulberg III, Lahore, Pakistan</Text>
          <Text style={styles.companyMeta}>info@finmatrix.pk  •  +92 42 3578 0001</Text>

          <View style={styles.divider} />

          {/* ── Invoice heading ───────────────────── */}
          <Text style={styles.invoiceLabel}>INVOICE</Text>

          {/* ── Metadata row ──────────────────────── */}
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Invoice #</Text>
              <Text style={styles.metaVal}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Issue Date</Text>
              <Text style={styles.metaVal}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaKey}>Due Date</Text>
              <Text style={styles.metaVal}>{formatDate(invoice.dueDate)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── Bill To ───────────────────────────── */}
          <Text style={styles.sectionLabel}>Bill To</Text>
          <Text style={styles.billToName}>{invoice.customerName}</Text>

          <View style={styles.divider} />

          {/* ── Line Items Table ──────────────────── */}
          <Text style={styles.sectionLabel}>Items</Text>

          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, { flex: 2.5 }]}>Description</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 0.5 }]}>Qty</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 0.9 }]}>Rate</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 0.5 }]}>Tax</Text>
            <Text style={[styles.thText, styles.thRight, { flex: 1.1 }]}>Amount</Text>
          </View>

          {/* Table rows */}
          {invoice.lines.map((line, idx) => (
            <View
              key={line.id}
              style={[styles.tableRow, idx % 2 === 0 && styles.tableRowEven]}
            >
              <View style={{ flex: 2.5 }}>
                <Text style={styles.tdText} numberOfLines={2}>{line.description || line.itemName}</Text>
              </View>
              <Text style={[styles.tdText, styles.tdRight, { flex: 0.5 }]}>{line.quantity}</Text>
              <Text style={[styles.tdText, styles.tdRight, { flex: 0.9 }]}>
                {formatCurrency(line.unitPrice, 'Rs ')}
              </Text>
              <Text style={[styles.tdText, styles.tdRight, { flex: 0.5 }]}>{line.taxRate}%</Text>
              <Text style={[styles.tdText, styles.tdRight, { flex: 1.1 }]}>
                {formatCurrency(line.amount, 'Rs ')}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          {/* ── Totals ────────────────────────────── */}
          <View style={styles.totalsBlock}>
            <TotalsRow label="Subtotal" value={formatCurrency(invoice.subtotal, 'Rs ')} />
            {invoice.discountAmount > 0 && (
              <TotalsRow
                label={
                  invoice.discountType === 'percent'
                    ? `Discount (${invoice.discountValue}%)`
                    : 'Discount (Fixed)'
                }
                value={`− ${formatCurrency(invoice.discountAmount, 'Rs ')}`}
                valueColor={colors.success}
              />
            )}
            <TotalsRow label="Tax" value={formatCurrency(invoice.taxAmount, 'Rs ')} />

            <View style={styles.grandTotalDivider} />
            <TotalsRow label="Grand Total" value={formatCurrency(invoice.total, 'Rs ')} bold />
            <TotalsRow label="Amount Paid" value={formatCurrency(invoice.amountPaid, 'Rs ')} valueColor={colors.success} />
            <View style={styles.grandTotalDivider} />
            <TotalsRow
              label="Balance Due"
              value={formatCurrency(balance, 'Rs ')}
              bold
              valueColor={balance > 0 ? colors.danger : colors.success}
            />
          </View>

          {/* ── Notes ─────────────────────────────── */}
          {!!invoice.notes && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Notes</Text>
              <Text style={styles.notesText}>{invoice.notes}</Text>
            </>
          )}
        </View>

        {/* ── Payment History ─────────────────────── */}
        <Text style={styles.outerSectionTitle}>Payment History</Text>
        {payments.length === 0 ? (
          <View style={styles.emptyPayments}>
            <Text style={styles.emptyPaymentsText}>No payments recorded yet</Text>
          </View>
        ) : (
          payments.map((pmt: Payment) => (
            <View key={pmt.id} style={styles.paymentCard}>
              <View style={styles.paymentTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentNumber}>{pmt.paymentNumber}</Text>
                  <Text style={styles.paymentDate}>{formatDate(pmt.date)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.paymentAmount}>{formatCurrency(pmt.amount, 'Rs ')}</Text>
                  <View style={styles.methodBadge}>
                    <Text style={styles.methodBadgeText}>{METHOD_LABEL[pmt.method] ?? pmt.method}</Text>
                  </View>
                </View>
              </View>
              {!!pmt.reference && (
                <Text style={styles.paymentRef}>Ref: {pmt.reference}</Text>
              )}
            </View>
          ))
        )}

        {/* Bottom spacer */}
        <View style={{ height: spacing.xl * 3 }} />
      </ScrollView>

      {/* ── Action Bar ──────────────────────────────── */}
      <View style={styles.actionBar}>
        {/* Draft: Edit + primary "Send via WhatsApp" */}
        {invoice.status === 'draft' && (
          <>
            <View style={styles.actionSecondary}>
              <CustomButton
                title="Edit"
                onPress={() => navigation.navigate('InvoiceForm', { invoiceId: invoice.id })}
                variant="secondary"
                size="sm"
                fullWidth
              />
            </View>
            <View style={styles.actionShare}>
              <CustomButton
                title="Share PDF"
                onPress={handleSharePdf}
                variant="text"
                size="sm"
                fullWidth
              />
            </View>
            <View style={styles.actionPrimary}>
              <CustomButton
                title={isSending ? 'Sending…' : 'WhatsApp'}
                onPress={handleSendViaWhatsApp}
                variant="primary"
                size="sm"
                fullWidth
                disabled={isSending}
              />
            </View>
          </>
        )}

        {/* Sent / overdue: Record Payment primary, WhatsApp resend + share secondary */}
        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
          <>
            <View style={styles.actionShare}>
              <CustomButton
                title="Share PDF"
                onPress={handleSharePdf}
                variant="text"
                size="sm"
                fullWidth
              />
            </View>
            <View style={styles.actionSecondary}>
              <CustomButton
                title={customerHasWhatsApp ? 'Remind' : 'WhatsApp'}
                onPress={customerHasWhatsApp ? handleOpenWhatsAppChat : handleSendViaWhatsApp}
                variant="secondary"
                size="sm"
                fullWidth
              />
            </View>
            <View style={styles.actionPrimary}>
              <CustomButton
                title="Record Payment"
                onPress={() =>
                  navigation.navigate('ReceivePayment', {
                    customerId: invoice.customerId,
                    invoiceId: invoice.id,
                  })
                }
                variant="primary"
                size="sm"
                fullWidth
              />
            </View>
          </>
        )}

        {/* Partial: same as sent/overdue — can still record payment */}
        {invoice.status === 'partial' && (
          <>
            <View style={styles.actionShare}>
              <CustomButton
                title="Share PDF"
                onPress={handleSharePdf}
                variant="text"
                size="sm"
                fullWidth
              />
            </View>
            <View style={styles.actionSecondary}>
              <CustomButton
                title={customerHasWhatsApp ? 'Remind' : 'WhatsApp'}
                onPress={customerHasWhatsApp ? handleOpenWhatsAppChat : handleSendViaWhatsApp}
                variant="secondary"
                size="sm"
                fullWidth
              />
            </View>
            <View style={styles.actionPrimary}>
              <CustomButton
                title="Record Payment"
                onPress={() =>
                  navigation.navigate('ReceivePayment', {
                    customerId: invoice.customerId,
                    invoiceId: invoice.id,
                  })
                }
                variant="primary"
                size="sm"
                fullWidth
              />
            </View>
          </>
        )}

        {/* Paid / void / cancelled: share PDF only */}
        {(invoice.status === 'paid' || invoice.status === 'void' || invoice.status === 'cancelled') && (
          <>
            <View style={styles.actionSecondary}>
              <CustomButton
                title="Share PDF"
                onPress={handleSharePdf}
                variant="secondary"
                size="sm"
                fullWidth
              />
            </View>
            <View style={styles.actionPrimary}>
              <CustomButton
                title="New Invoice"
                onPress={() => navigation.navigate('InvoiceForm')}
                variant="primary"
                size="sm"
                fullWidth
              />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════
// TOTALS ROW HELPER
// ═══════════════════════════════════════════════════════
const TotalsRow: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}> = ({ label, value, bold, valueColor }) => (
  <View style={styles.totalsRow}>
    <Text style={[styles.totalsLabel, bold && styles.totalsLabelBold]}>{label}</Text>
    <Text
      style={[
        styles.totalsValue,
        bold && styles.totalsValueBold,
        valueColor ? { color: valueColor } : undefined,
      ]}
    >
      {value}
    </Text>
  </View>
);

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  errorText: { fontSize: 15, color: colors.danger, fontFamily: THEME.typography.fontFamily },

  // ── Header ─────────────────────────────────────
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  backBtn: { marginRight: spacing.xs, padding: spacing.xs / 2 },
  backIcon: { fontSize: 28, color: colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: THEME.typography.fontFamily },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // ── Invoice card ───────────────────────────────
  invoiceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.small,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: 2,
  },
  companyMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm + 2,
  },
  invoiceLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  // ── Meta row ───────────────────────────────────
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaCol: { alignItems: 'center', flex: 1 },
  metaKey: { fontSize: 11, color: colors.textLight, fontFamily: THEME.typography.fontFamily, marginBottom: 2 },
  metaVal: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  // ── Bill To ────────────────────────────────────
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    fontFamily: THEME.typography.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  billToName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },

  // ── Line items table ───────────────────────────
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
    textTransform: 'uppercase',
  },
  thRight: { textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tableRowEven: { backgroundColor: colors.background },
  tdText: { fontSize: 12, color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  tdRight: { textAlign: 'right' },

  // ── Totals ─────────────────────────────────────
  totalsBlock: { marginLeft: 'auto', width: '65%' },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  totalsLabel: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily },
  totalsLabelBold: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  totalsValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  totalsValueBold: { fontSize: 16, fontWeight: '800' },
  grandTotalDivider: {
    height: 1.5,
    backgroundColor: colors.primary,
    marginVertical: spacing.xs,
  },

  notesText: { fontSize: 13, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, lineHeight: 20 },

  // ── Payment History ────────────────────────────
  outerSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyPayments: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    ...shadows.small,
  },
  emptyPaymentsText: { fontSize: 13, color: colors.textLight, fontFamily: THEME.typography.fontFamily },

  paymentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  paymentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  paymentNumber: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, fontFamily: THEME.typography.fontFamily },
  paymentDate: { fontSize: 12, color: colors.textSecondary, fontFamily: THEME.typography.fontFamily, marginTop: 2 },
  paymentAmount: { fontSize: 16, fontWeight: '800', color: colors.success, fontFamily: THEME.typography.fontFamily },
  methodBadge: {
    marginTop: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.secondary + '18',
    borderRadius: 4,
  },
  methodBadgeText: { fontSize: 11, fontWeight: '600', color: colors.secondary, fontFamily: THEME.typography.fontFamily },
  paymentRef: { fontSize: 12, color: colors.textLight, fontFamily: THEME.typography.fontFamily, marginTop: spacing.xs },

  // ── Action Bar ─────────────────────────────────
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
    ...shadows.small,
  },
  actionPrimary: { flex: 1.4 },
  actionSecondary: { flex: 1 },
  actionShare: { flex: 1 },
});

export default InvoiceDetailScreen;
