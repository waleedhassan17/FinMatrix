// ═══════════════════════════════════════════════════════
// FinMatrix — Customer Detail Screen
// ═══════════════════════════════════════════════════════

import ContactWhatsappRow from '../../../components/shared/messaging/ContactWhatsappRow';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Alert } from '../../../utils/alert';
import { Feather } from '@expo/vector-icons';
import {
  Badge,
  Card,
  HeaderAction,
  ReportContainer,
  ReportHeader,
  Segmented
} from '../../../components/reports/ReportUI';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { toggleCustomerActive, upsertCustomer } from '../CustomerList/customerListSlice';
import {
  selectCustomerDetailTab,
  selectCustomerDetail,
  selectCustomerDetailStatus,
  selectCustomerDetailError,
  selectCustomerDetailInvoices,
  selectCustomerDetailPayments,
  setActiveTab,
  resetCustomerDetail,
  upsertDetailCustomer,
  fetchCustomerDetail,
  fetchCustomerInvoices,
  fetchCustomerPayments,
  type CustomerDetailTab
} from './customerDetailSlice';
import CustomButton from '../../../Custom-Components/CustomButton';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { PAYMENT_TERMS_LABELS } from '../../../models/customerModel';
import { getCustomerLedgerStatementAPI } from '../../../networks/sales/customerNetwork';
import { SUMMARY_COPY } from '../../../models/partySummaryModel';
import { statementSerializer, shareStatementPdf } from '../../../utils/statementPdf';
import { useCompanyInfo } from '../../../utils/companyInfo';
import { mapCustomer } from '../../../serializers/customerSerializer';
import type { PaymentTerms, Customer } from '../../../types';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

// Design-system tokens (see src/theme/theme.ts).
const { colors, radius, spacing, typography } = THEME;

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type DetailRoute = RouteProp<MoreStackParamList, 'CustomerDetail'>;

const TABS: { key: CustomerDetailTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'payments', label: 'Payments' },
];

const INVOICE_STATUS_COLORS: Record<string, string> = {
  paid: colors.success,
  sent: colors.secondary,
  partial: colors.warning,
  overdue: colors.danger,
  draft: colors.textTertiary,
  void: colors.textTertiary
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  sent: 'Sent',
  partial: 'Partial',
  overdue: 'Overdue',
  draft: 'Draft',
  void: 'Void'
};

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const CustomerDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DetailRoute>();
  const dispatch = useAppDispatch();
  const companyInfo = useCompanyInfo();
  const customerId = route.params.customerId;

  const customer = useAppSelector(selectCustomerDetail);
  const status = useAppSelector(selectCustomerDetailStatus);
  const error = useAppSelector(selectCustomerDetailError);
  const activeTab = useAppSelector(selectCustomerDetailTab);
  const invoicesTab = useAppSelector(selectCustomerDetailInvoices);
  const paymentsTab = useAppSelector(selectCustomerDetailPayments);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSharingStatement, setIsSharingStatement] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    return () => { dispatch(resetCustomerDetail()); };
  }, [dispatch]);

  // Refetch whenever the screen gains focus so the balance and histories
  // stay fresh after recording a payment / creating an invoice elsewhere.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCustomerDetail(customerId));
      dispatch(fetchCustomerInvoices({ customerId }));
      dispatch(fetchCustomerPayments({ customerId }));
    }, [dispatch, customerId]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchCustomerDetail(customerId)),
        dispatch(fetchCustomerInvoices({ customerId })),
        dispatch(fetchCustomerPayments({ customerId })),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, customerId]);

  // ── Loading / error states for the record itself ──
  if (!customer && status === 'loading') {
    return (
      <ReportContainer>
        <ReportHeader title="Customer" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.actionGreen} />
          <Text style={styles.emptyText}>Loading customer…</Text>
        </View>
      </ReportContainer>
    );
  }

  if (!customer) {
    return (
      <ReportContainer>
        <ReportHeader title="Customer" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Feather name="user-x" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{error || 'Customer not found'}</Text>
          <CustomButton
            title="Retry"
            onPress={() => dispatch(fetchCustomerDetail(customerId))}
            variant="primary"
            size="md"
          />
          <CustomButton title="Go Back" onPress={() => navigation.goBack()} variant="secondary" size="md" />
        </View>
      </ReportContainer>
    );
  }

  // ── Credit usage ────────────────────────────────
  // Exposure, not the ledger balance: unpaid invoices plus goods shipped on
  // credit, less advances — the figure a sale is actually checked against.
  const exposure = customer.credit?.exposure ?? customer.balance;
  const advancesHeld = customer.credit?.advances ?? 0;
  const creditUsagePercent = customer.creditLimit > 0
    ? Math.max(0, Math.min((exposure / customer.creditLimit) * 100, 100))
    : 0;
  const creditBarColor = creditUsagePercent >= 80
    ? colors.danger
    : creditUsagePercent >= 50
      ? colors.warning
      : colors.success;

  // ── Action handlers ─────────────────────────────
  // The invoice and payment screens are shared record screens, registered on
  // this tab too (navigations-maps/sharedRecords), so each action is a push
  // and back — or saving — returns to this customer. They used to hop into
  // the Transactions tab, where back landed on its hub (QA #10).
  const handleCreateInvoice = () => {
    navigation.navigate('InvoiceForm', { customerId: customer.id });
  };
  const handleRecordPayment = () => {
    navigation.navigate('ReceivePayment', { customerId: customer.id });
  };
  const handleOpenInvoice = (invoiceId: string) => {
    navigation.navigate('InvoiceDetail', { invoiceId });
  };
  // Credit on account, spent in Receive Payment with the switch already on —
  // the web's flow: advances and credit memos alike, oldest invoice first, and
  // any new money alongside, in one settlement.
  const handleUseCredit = () => {
    navigation.navigate('ReceivePayment', { customerId: customer.id, useCredits: true });
  };
  // Every unpaid invoice, as of today, ready to share or save.
  const handleOutstandingSummary = () => {
    navigation.navigate('PartySummary', {
      partyType: 'customer',
      partyId: customer.id,
      partyName: customer.name,
    });
  };
  // The customer's ledger is the General Ledger read by customer: one ledger,
  // this customer selected, pushed onto the tab we are in.
  const handleLedger = () => {
    navigation.navigate('GeneralLedger', { partyType: 'customer', partyId: customer.id, partyName: customer.name });
  };
  const handleHistory = () => {
    navigation.navigate('PartyHistory', { partyType: 'customer', partyId: customer.id, partyName: customer.name });
  };
  const handleSendStatement = async () => {
    if (isSharingStatement) return;
    setIsSharingStatement(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const toIso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      // Read from the books — the same postings as the customer's ledger.
      const payload = await getCustomerLedgerStatementAPI(customer.id, {
        startDate: toIso(start),
        endDate: toIso(now),
      });
      const data = statementSerializer(payload);
      if (!data) throw new Error('Could not load the statement.');
      const result = await shareStatementPdf(data, companyInfo);
      if (!result.shared && result.reason) {
        Alert.alert('Statement', result.reason);
      }
    } catch (e: any) {
      Alert.alert('Statement failed', e?.message || 'Could not generate the statement. Please try again.');
    } finally {
      setIsSharingStatement(false);
    }
  };
  const handleToggleActive = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const action: any = await dispatch(toggleCustomerActive(customer.id));
      if (toggleCustomerActive.rejected.match(action)) {
        throw new Error(action.error?.message);
      }
      const updatedRaw = action.payload?.data;
      if (updatedRaw?.id) {
        const updated: Customer = mapCustomer(updatedRaw);
        dispatch(upsertDetailCustomer(updated));
        dispatch(upsertCustomer(updated));
      }
    } catch (e: any) {
      Alert.alert('Update failed', e?.message || 'Could not update the customer. Please try again.');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <ReportContainer>
      {/* The navy header every other screen has. This was the one white header
          in the flow, so opening a customer looked like leaving the app. */}
      <ReportHeader
        title={customer.name}
        subtitle={customer.code || undefined}
        onBack={() => navigation.goBack()}
        right={
          <HeaderAction
            label="Edit"
            icon="edit-2"
            onPress={() => navigation.navigate('CustomerForm', { customerId: customer.id })}
          />
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.actionGreen} />
        }
      >
        {/* ── Balance + credit ────────────────────── */}
        <Card>
          <View style={styles.balanceHead}>
            <Text style={styles.topCardLabel}>Outstanding balance</Text>
            {/* Only the exception is marked: "Active" on every customer said nothing. */}
            {!customer.isActive && (
              <View>
                <Badge label="Inactive" color={colors.neutral500} dot={false} />
              </View>
            )}
          </View>
          <Text style={styles.topCardBalance}>{formatCurrency(customer.balance, 'Rs ')}</Text>

          <View style={styles.summaryRows}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total purchases</Text>
              <Text style={styles.summaryValue}>{formatCurrency(customer.totalPurchases, 'Rs ')}</Text>
            </View>
            {customer.creditLimit <= 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Credit limit</Text>
                <Text style={styles.summaryValue}>No limit</Text>
              </View>
            )}

            {/* Credit Usage Bar */}
            {customer.creditLimit > 0 && (
              <View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Credit used</Text>
                  <Text style={styles.summaryValue}>{creditUsagePercent.toFixed(0)}%</Text>
                </View>
                <View style={styles.creditBarTrack}>
                  <View
                    style={[styles.creditBarFill, { width: `${creditUsagePercent}%`, backgroundColor: creditBarColor }]}
                  />
                </View>
                <Text style={styles.creditFooterText}>
                  {formatCurrency(exposure, 'Rs ')} of {formatCurrency(customer.creditLimit, 'Rs ')}
                  {customer.credit?.available != null ? ` · ${formatCurrency(Math.max(0, customer.credit.available), 'Rs ')} available` : ''}
                </Text>
              </View>
            )}

            {/* Advances: money already paid, waiting to be set against an
                invoice. Applying it settles invoices without recording new
                cash — recording the cash again is how a payment gets doubled. */}
            {advancesHeld > 0 && (
              <View style={styles.advances}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Advances held</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(advancesHeld, 'Rs ')}</Text>
                </View>
                <CustomButton title="Apply to invoices" variant="secondary" size="sm" onPress={handleUseCredit} />
              </View>
            )}
          </View>
        </Card>

        {/* ── Actions ────────────────────────────────
            The two things done most, as buttons; the four things looked up,
            as one quiet row. They were six equal tiles with uppercase labels,
            which gave a ledger the same weight as taking a payment and left
            "SEND STATEMENT" pressed against its box. */}
        <View style={styles.primaryActions}>
          <View style={styles.primaryAction}>
            {/* compact, and each button sized from its label rather than an
                equal half: on a small phone an even split cut the longer one off
                to "Record paym…", though both fit side by side. */}
            <CustomButton title="Create invoice" onPress={handleCreateInvoice} compact />
          </View>
          <View style={styles.primaryAction}>
            <CustomButton title="Record payment" variant="secondary" onPress={handleRecordPayment} compact />
          </View>
        </View>
        <Card padded={false} style={styles.quickRow}>
          <QuickAction icon="list" label={SUMMARY_COPY.customer.documentsTitle} onPress={handleOutstandingSummary} />
          <QuickAction
            icon="send"
            label={isSharingStatement ? 'Preparing…' : 'Send statement'}
            onPress={handleSendStatement}
            disabled={isSharingStatement}
          />
          <QuickAction icon="book-open" label="Ledger" onPress={handleLedger} />
          <QuickAction icon="clock" label="History" onPress={handleHistory} />
        </Card>

        {/* ── Tabs ───────────────────────────────── */}
        <Segmented
          options={TABS.map(t => t.label)}
          activeIndex={TABS.findIndex(t => t.key === activeTab)}
          onChange={i => dispatch(setActiveTab(TABS[i].key))}
        />

        {/* ── Tab Content ────────────────────────── */}
        {activeTab === 'overview' && (
          <OverviewTab customer={customer} onToggleActive={handleToggleActive} isToggling={isToggling} />
        )}
        {activeTab === 'invoices' && (
          <ListTabState
            status={invoicesTab.status}
            error={invoicesTab.error}
            isEmpty={invoicesTab.rows.length === 0}
            emptyIcon="file-text"
            emptyText="No invoices for this customer yet."
            onRetry={() => dispatch(fetchCustomerInvoices({ customerId }))}
          >
            <View style={styles.tabContent}>
              {invoicesTab.rows.map(inv => (
                <TouchableOpacity
                  key={inv.id}
                  style={styles.listCard}
                  onPress={() => handleOpenInvoice(inv.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${inv.invoiceNumber}`}
                >
                  <View style={styles.listCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listCardTitle}>{inv.invoiceNumber}</Text>
                      <Text style={styles.listCardSub}>{formatDate(inv.date)}</Text>
                    </View>
                    <View style={styles.listCardEnd}>
                      <Text style={styles.listCardAmount}>{formatCurrency(inv.amount, 'Rs ')}</Text>
                      {/* Wrapped: Badge pins itself to flex-start, which would
                          send it to the left of this right-aligned column. */}
                      <View>
                        <Badge
                          label={INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                          color={INVOICE_STATUS_COLORS[inv.status] ?? colors.textTertiary}
                          dot={false}
                        />
                      </View>
                    </View>
                  </View>
                  {(!!inv.dueDate || inv.balance > 0) && (
                    <Text style={styles.listCardDetail}>
                      {[
                        inv.dueDate ? `Due ${formatDate(inv.dueDate)}` : '',
                        inv.balance > 0 ? `Balance ${formatCurrency(inv.balance, 'Rs ')}` : '',
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
              {invoicesTab.page < invoicesTab.totalPages && (
                <CustomButton
                  title="Load more"
                  variant="secondary"
                  size="sm"
                  onPress={() => dispatch(fetchCustomerInvoices({ customerId, page: invoicesTab.page + 1 }))}
                />
              )}
            </View>
          </ListTabState>
        )}
        {activeTab === 'payments' && (
          <ListTabState
            status={paymentsTab.status}
            error={paymentsTab.error}
            isEmpty={paymentsTab.rows.length === 0}
            emptyIcon="dollar-sign"
            emptyText="No payments recorded for this customer yet."
            onRetry={() => dispatch(fetchCustomerPayments({ customerId }))}
          >
            <View style={styles.tabContent}>
              {paymentsTab.rows.map(pay => (
                <View key={pay.id} style={styles.listCard}>
                  <View style={styles.listCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listCardTitle}>{pay.reference}</Text>
                      <Text style={styles.listCardSub}>{formatDate(pay.date)}</Text>
                    </View>
                    <Text style={[styles.listCardAmount, { color: colors.success }]}>
                      {formatCurrency(pay.amount, 'Rs ')}
                    </Text>
                  </View>
                  <Text style={styles.listCardDetail}>Method: {pay.method}</Text>
                  {pay.applied.map(line => (
                    <Text key={line} style={styles.listCardDetail}>{line}</Text>
                  ))}
                </View>
              ))}
              {paymentsTab.page < paymentsTab.totalPages && (
                <CustomButton
                  title="Load more"
                  variant="secondary"
                  size="sm"
                  onPress={() => dispatch(fetchCustomerPayments({ customerId, page: paymentsTab.page + 1 }))}
                />
              )}
            </View>
          </ListTabState>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

// ═══════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

const QuickAction: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ icon, label, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.quickAction, disabled && styles.quickActionDisabled]}
    onPress={onPress}
    activeOpacity={0.6}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Feather name={icon} size={20} color={colors.primary} />
    <Text style={styles.quickLabel} numberOfLines={2}>{label}</Text>
  </TouchableOpacity>
);

/** Loading / error / empty / success wrapper for the list tabs. */
const ListTabState: React.FC<{
  status: 'idle' | 'loading' | 'failed' | 'loaded';
  error: string;
  isEmpty: boolean;
  emptyIcon: keyof typeof Feather.glyphMap;
  emptyText: string;
  onRetry: () => void;
  children: React.ReactNode;
}> = ({ status, error, isEmpty, emptyIcon, emptyText, onRetry, children }) => {
  if ((status === 'loading' || status === 'idle') && isEmpty) {
    return (
      <View style={styles.tabStateBlock}>
        <ActivityIndicator size="small" color={colors.actionGreen} />
        <Text style={styles.tabStateText}>Loading…</Text>
      </View>
    );
  }
  if (status === 'failed' && isEmpty) {
    return (
      <View style={styles.tabStateBlock}>
        <Feather name="alert-circle" size={28} color={colors.danger} />
        <Text style={styles.tabStateText}>{error || 'Something went wrong.'}</Text>
        <CustomButton title="Retry" onPress={onRetry} variant="secondary" size="sm" />
      </View>
    );
  }
  if (isEmpty) {
    return (
      <View style={styles.tabStateBlock}>
        <Feather name={emptyIcon} size={28} color={colors.textTertiary} />
        <Text style={styles.tabStateText}>{emptyText}</Text>
      </View>
    );
  }
  return <>{children}</>;
};

const OverviewTab: React.FC<{
  customer: Customer;
  onToggleActive: () => void;
  isToggling: boolean;
}> = ({ customer, onToggleActive, isToggling }) => {
  const billing = formatAddress(customer.billingAddress);
  const shipping = formatAddress(customer.shippingAddress);
  return (
  <View style={styles.tabContent}>
    {/* Contact Info */}
    <Card>
      <Text style={styles.infoCardTitle}>Contact</Text>
      <InfoRow icon="mail" label="Email" value={customer.email || '—'} />
      <InfoRow icon="phone" label="Phone" value={customer.phone || '—'} />
      <ContactWhatsappRow partyType="customer" partyId={customer.id} refreshKey={customer.updatedAt} />
      {!!customer.contactPerson && <InfoRow icon="user" label="Contact" value={customer.contactPerson} />}
      {!!customer.company && <InfoRow icon="briefcase" label="Company" value={customer.company} />}
      {!!customer.taxId && <InfoRow icon="hash" label="Tax ID" value={customer.taxId} />}
    </Card>

    {/* Addresses: one card when they are the same address, which they usually are. */}
    {billing === shipping ? (
      <Card>
        <Text style={styles.infoCardTitle}>Billing and shipping address</Text>
        <Text style={styles.addressText}>{billing}</Text>
      </Card>
    ) : (
      <>
        <Card>
          <Text style={styles.infoCardTitle}>Billing address</Text>
          <Text style={styles.addressText}>{billing}</Text>
        </Card>
        <Card>
          <Text style={styles.infoCardTitle}>Shipping address</Text>
          <Text style={styles.addressText}>{shipping}</Text>
        </Card>
      </>
    )}

    {/* Terms & Dates. The credit limit is on the balance card at the top. */}
    <Card>
      <Text style={styles.infoCardTitle}>Terms</Text>
      <InfoRow icon="clipboard" label="Payment terms" value={PAYMENT_TERMS_LABELS[customer.paymentTerms as PaymentTerms] ?? customer.paymentTerms} />
      <InfoRow icon="calendar" label="Customer since" value={formatDate(customer.createdAt)} />
      <InfoRow icon="refresh-cw" label="Last updated" value={formatDate(customer.updatedAt)} />
    </Card>

    {/* Notes */}
    {!!customer.notes && (
      <Card>
        <Text style={styles.infoCardTitle}>Notes</Text>
        <Text style={styles.notesText}>{customer.notes}</Text>
      </Card>
    )}

    {/* Toggle Active */}
    <CustomButton
      title={isToggling ? 'Updating…' : customer.isActive ? 'Deactivate Customer' : 'Activate Customer'}
      onPress={onToggleActive}
      variant={customer.isActive ? 'destructive' : 'primary'}
      size="md"
      fullWidth
      disabled={isToggling}
    />
  </View>
  );
};

function formatAddress(addr: Customer['billingAddress']): string {
  const line1 = addr.street;
  const line2 = [addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ');
  const parts = [line1, line2, addr.country].filter(Boolean);
  return parts.length ? parts.join('\n') : 'Not provided';
}

const InfoRow: React.FC<{ icon: keyof typeof Feather.glyphMap; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Feather name={icon} size={14} color={colors.textSecondary} style={styles.infoIcon} />
    <Text style={styles.infoLabel}>{label}</Text>
    {/* No line limit: an email cut off with an ellipsis is an email nobody can read. */}
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = StyleSheet.create({
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },

  // ── Balance ────────────────────────────────────
  balanceHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  topCardLabel: { ...typography.labelSm, color: colors.textSecondary },
  // Ink, as every figure on the dashboard is. Colour on an amount states a fact.
  topCardBalance: { ...typography.displaySm, color: colors.textPrimary, marginTop: 2, fontVariant: ['tabular-nums'] },

  summaryRows: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.xs + 2,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  summaryLabel: { ...typography.bodySm, color: colors.textSecondary },
  summaryValue: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },

  creditBarTrack: {
    height: 6,
    backgroundColor: colors.neutral100,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  creditBarFill: { height: '100%', borderRadius: 3 },
  creditFooterText: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
  advances: { gap: spacing.xs, alignItems: 'stretch' },

  // ── Actions ────────────────────────────────────
  primaryActions: { flexDirection: 'row', gap: spacing.xs + 2 },
  primaryAction: { flexGrow: 1, flexBasis: 'auto' },
  quickRow: { flexDirection: 'row', paddingVertical: spacing.xs },
  quickAction: { flex: 1, alignItems: 'center', gap: spacing.xxs + 2, paddingVertical: spacing.xs, paddingHorizontal: spacing.xxs },
  quickActionDisabled: { opacity: 0.5 },
  // minHeight is two lines, so "Ledger" and "Send statement" keep their icons level.
  quickLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', minHeight: 32 },

  // ── Tab Content ────────────────────────────────
  tabContent: { gap: spacing.sm },
  tabStateBlock: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  tabStateText: { ...typography.bodySm, color: colors.textSecondary, textAlign: 'center' },

  // ── Info Cards ─────────────────────────────────
  infoCardTitle: {
    ...typography.labelLg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xxs + 1,
  },
  infoIcon: { marginRight: spacing.xs, width: 22, flexShrink: 0 },
  infoLabel: { ...typography.bodySm, color: colors.textSecondary, width: 108, flexShrink: 0 },
  // minWidth: without it an unbroken email sets the row's minimum width, runs
  // out of the card and squeezes the label into it.
  infoValue: { ...typography.labelMd, color: colors.textPrimary, flex: 1, minWidth: 0 },

  addressText: { ...typography.bodySm, color: colors.textPrimary, lineHeight: 22 },
  notesText: { ...typography.bodySm, color: colors.textSecondary, lineHeight: 21 },

  // ── List Cards (Invoices / Payments) ───────────
  // The same surface as Card, so the rows match the cards above them.
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  listCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  listCardEnd: { alignItems: 'flex-end', gap: spacing.xxs },
  listCardTitle: { ...typography.labelLg, color: colors.textPrimary },
  listCardSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  listCardAmount: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  listCardDetail: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },

  // ── Empty / Center ─────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xxl },
  emptyText: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center' }
});

export default CustomerDetailScreen;
