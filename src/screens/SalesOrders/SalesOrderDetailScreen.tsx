import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Alert } from '../../utils/alert';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { THEME } from '../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { useIsOwner } from '../../hooks/useCapability';
import {
  fetchSalesOrder, selectSalesOrderState, fulfillSalesOrder,
  convertSalesOrderInvoice, cancelSalesOrder, removeSalesOrder,
  closeSalesOrder, reopenSalesOrder,
} from './salesOrderSlice';
import {
  billedNotShipped,
  defaultShipping,
  remainingToShip,
  salesOrderActions,
  salesOrderBarPlan,
  shipmentPayload,
  shippedNotInvoiced,
  type SalesOrder,
} from '../../models/salesOrderModel';
import { formatCurrency } from '../../utils/formatters';
import CreditLimitModal from '../../components/shared/CreditLimitModal';
import { creditAssessmentFrom, type CreditAssessment } from '../../models/creditModel';

import { ActionBar, IconButton, type MoreAction } from '../../components/form/FormUI';
import { ReportContainer, ReportHeader, Card, SectionCard, Badge, ProgressBar, LoadingBlock, ErrorBlock } from '../../components/reports/ReportUI';
import { txnStatusColor } from '../../components/transactions/txnStatus';
import { titleCase } from '../../components/transactions/TxnListUI';
import type { TransactionsStackParamList } from '../../navigators/stacks/TransactionsStack';
import { useCompanyInfo } from '../../utils/companyInfo';
import { shareSalesOrderPdf } from '../../utils/salesOrderShare';
import { salesOrderForPdf } from '../../utils/documentPdfAdapters';

type Nav = NativeStackNavigationProp<TransactionsStackParamList>;
type Rt = RouteProp<TransactionsStackParamList, 'SalesOrderDetail'>;
const rs = (n: number) => formatCurrency(n, 'Rs ');
const units = (n: number) => `${Number(n.toFixed(4))} unit${n === 1 ? '' : 's'}`;
/** What the server said about a rejected thunk. These thunks rejectWithValue
 *  (keeping the code and details), so the message is on `payload`. */
const failureText = (r: any) => r?.payload?.message ?? r?.error?.message ?? 'Please try again.';
const leftToShip = (o: SalesOrder) => o.totals?.toShip ?? o.lines.reduce((sum, l) => sum + remainingToShip(l), 0);


const SalesOrderDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { salesOrderId } = route.params;
  const dispatch = useAppDispatch();
  const isOwner = useIsOwner();
  const { current: o, isLoading, isSaving, error } = useAppSelector(selectSalesOrderState);

  useFocusEffect(useCallback(() => { dispatch(fetchSalesOrder(salesOrderId)); }, [dispatch, salesOrderId]));

  // Shipping and invoicing are checked against the customer's credit limit.
  // A refusal carries the breakdown; the retry is the same action with the
  // owner's reason.
  const [creditRefusal, setCreditRefusal] = useState<{ assessment: CreditAssessment; retry: (reason: string) => void } | null>(null);
  const companyInfo = useCompanyInfo();
  const [sharing, setSharing] = useState(false);
  // Recording a shipment: what is going out now, per line. A partial shipment
  // is the normal case — each one can be invoiced on its own.
  const [shipping, setShipping] = useState<Record<string, string> | null>(null);

  // The order confirmation a customer receives, item photos beside the lines.
  const sharePdf = async () => {
    if (!o) return;
    setSharing(true);
    try {
      await shareSalesOrderPdf({ salesOrder: salesOrderForPdf(o), company: companyInfo });
    } finally {
      setSharing(false);
    }
  };

  const ship = async (lines: { lineId: string; quantityFulfilled: string }[], overrideReason?: string) => {
    const r: any = await dispatch(fulfillSalesOrder({
      id: salesOrderId,
      lines,
      ...(overrideReason ? { overrideReason } : {}),
    }));
    if (r.meta.requestStatus === 'fulfilled') { setShipping(null); return; }
    const assessment = creditAssessmentFrom(r.payload);
    if (assessment) { setCreditRefusal({ assessment, retry: reason => { void ship(lines, reason); } }); return; }
    // Short stock lands here too: goods cannot leave that are not on the shelf.
    Alert.alert('Could not record shipment', failureText(r));
  };
  const shipEverythingLeft = () => {
    if (!o) return;
    const left = o.lines.filter(l => l.id && remainingToShip(l) > 0);
    void ship(left.map(l => ({ lineId: l.id!, quantityFulfilled: String(l.quantity) })));
  };
  const saveShipment = () => {
    if (!o || !shipping) return;
    const { lines, over } = shipmentPayload(o.lines, shipping);
    if (over.length) {
      Alert.alert('More than is left', 'A line ships more than is left on the order. Reduce it and save again.');
      return;
    }
    if (!lines.length) { Alert.alert('Nothing to ship', 'Enter what is going out now.'); return; }
    void ship(lines);
  };

  const runConvert = async (closeRemaining: boolean, overrideReason?: string) => {
    const r: any = await dispatch(convertSalesOrderInvoice({ id: salesOrderId, overrideReason, closeRemaining }));
    if (r.meta.requestStatus === 'fulfilled') {
      const pending = r.payload?.pending ?? r.payload?.data?.pending;
      if (pending) {
        Alert.alert('Sent for approval', 'The owner approves before the invoice is raised.');
        return;
      }
      const invoiceId: string | undefined = r.payload?.data?.invoice?.id;
      Alert.alert(
        'Invoice created',
        closeRemaining ? 'The rest of the order is closed.' : 'The order stays open for anything not shipped yet.',
        invoiceId
          ? [
              { text: 'Stay here', style: 'cancel' },
              { text: 'View invoice', onPress: () => navigation.navigate('InvoiceDetail', { invoiceId }) },
            ]
          : undefined,
      );
      return;
    }
    const assessment = creditAssessmentFrom(r.payload);
    if (assessment) { setCreditRefusal({ assessment, retry: reason => { void runConvert(closeRemaining, reason); } }); return; }
    Alert.alert('Could not create invoice', failureText(r));
  };
  const convert = (order: SalesOrder) => {
    const next = order.nextInvoice;
    const approval = isOwner ? '' : '\n\nThe owner approves it before it posts.';
    if (next?.mode === 'shipped') {
      const billed = next.lines.reduce((sum, l) => sum + l.quantity, 0);
      const left = leftToShip(order);
      const rest = !next.isFinal && left > 0;
      Alert.alert(
        isOwner ? 'Invoice the shipped goods?' : 'Request an invoice?',
        `Bills ${units(billed)} shipped and not invoiced yet: ${rs(next.total)}.` +
          (rest ? `\n\n${units(left)} not shipped yet. The order stays open for them — or close the rest now if the customer will not take them.` : '') +
          approval,
        [
          { text: 'Cancel', style: 'cancel' },
          ...(rest ? [{ text: 'Invoice & close rest', onPress: () => { void runConvert(true); } }] : []),
          // Last: on the web build the confirm dialog runs this one.
          { text: isOwner ? 'Invoice' : 'Request', onPress: () => { void runConvert(false); } },
        ],
      );
      return;
    }
    Alert.alert(
      isOwner ? 'Ship & invoice everything?' : 'Request an invoice?',
      `Nothing is recorded as shipped, so this ships and invoices the whole order in one step${next ? `: ${rs(next.total)}` : ''}.` +
        approval,
      [
        { text: 'Cancel', style: 'cancel' },
        // Invoicing POSTS: it moves stock and books COGS, so it can be refused —
        // short stock, a closed period, the credit limit. runConvert says why.
        { text: isOwner ? 'Ship & invoice' : 'Request', onPress: () => { void runConvert(false); } },
      ],
    );
  };

  const closeOrder = (order: SalesOrder) => {
    if (!salesOrderActions(order).close) {
      const unbilled = shippedNotInvoiced(order);
      Alert.alert(
        'Invoice the shipped goods first',
        `${units(unbilled)} shipped on this order ${unbilled === 1 ? 'is' : 'are'} not invoiced yet. Invoice them — choose "Invoice & close rest" to do both in one step.`,
      );
      return;
    }
    Alert.alert(
      'Close this order?',
      `The ${units(leftToShip(order))} not shipped yet will not ship. What has been shipped and invoiced stays as it is. You can reopen the order later.`,
      [
        { text: 'Keep open', style: 'cancel' },
        {
          text: 'Close order',
          style: 'destructive',
          onPress: async () => {
            const r: any = await dispatch(closeSalesOrder({ id: salesOrderId }));
            if (r.meta.requestStatus !== 'fulfilled') Alert.alert('Could not close order', failureText(r));
          },
        },
      ],
    );
  };
  const reopen = async () => {
    const r: any = await dispatch(reopenSalesOrder(salesOrderId));
    if (r.meta.requestStatus !== 'fulfilled') Alert.alert('Could not reopen order', failureText(r));
  };
  const cancel = async () => {
    const r: any = await dispatch(cancelSalesOrder(salesOrderId));
    if (r.meta.requestStatus !== 'fulfilled') Alert.alert('Could not cancel order', failureText(r));
  };
  const doDelete = () => {
    Alert.alert('Delete sales order', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const r: any = await dispatch(removeSalesOrder(salesOrderId));
          // Leave only once it is actually gone.
          if (r.meta.requestStatus === 'fulfilled') navigation.goBack();
          else Alert.alert('Could not delete', failureText(r));
        },
      },
    ]);
  };

  if (isLoading && !o) return <ReportContainer><ReportHeader title="Sales Order" onBack={() => navigation.goBack()} /><LoadingBlock label="Loading…" /></ReportContainer>;
  if (error && !o) return <ReportContainer><ReportHeader title="Sales Order" onBack={() => navigation.goBack()} /><ErrorBlock message={error} onRetry={() => dispatch(fetchSalesOrder(salesOrderId))} /></ReportContainer>;
  if (!o) return <ReportContainer><ReportHeader title="Sales Order" onBack={() => navigation.goBack()} /></ReportContainer>;

  const actions = salesOrderActions(o);
  const plan = salesOrderBarPlan(o);
  const managed = !!o.deliveryId;
  const invoiceLabel = !isOwner ? 'Request Invoice' : o.nextInvoice?.mode === 'shipped' ? 'Invoice Shipped' : 'Convert to Invoice';
  const startShipping = () => setShipping(defaultShipping(o.lines));
  const button = (kind: 'invoice' | 'ship' | 'edit' | null) =>
    kind === 'invoice'
      ? { title: invoiceLabel, onPress: () => convert(o), isLoading: isSaving }
      : kind === 'ship'
        ? { title: 'Record Shipment', onPress: startShipping }
        : kind === 'edit'
          ? { title: 'Edit', onPress: () => navigation.navigate('SalesOrderForm', { salesOrderId }) }
          : undefined;

  const more: MoreAction[] = [
    ...(actions.ship ? [{ label: 'Ship everything left', icon: 'check' as const, onPress: shipEverythingLeft }] : []),
    ...(actions.invoice && plan.primary !== 'invoice' && plan.secondary !== 'invoice'
      ? [{ label: isOwner ? 'Ship & invoice everything' : 'Request invoice', icon: 'file-text' as const, onPress: () => convert(o) }]
      : []),
    ...(actions.edit && plan.secondary !== 'edit'
      ? [{ label: 'Edit order', icon: 'edit-2' as const, onPress: () => navigation.navigate('SalesOrderForm', { salesOrderId }) }]
      : []),
    ...(!managed && o.status === 'partial'
      ? [{ label: 'Close order', icon: 'lock' as const, confirm: false as const, onPress: () => closeOrder(o) }]
      : []),
    ...(actions.reopen ? [{ label: 'Reopen order', icon: 'rotate-ccw' as const, onPress: () => { void reopen(); } }] : []),
    ...(actions.cancel
      ? [{
          label: 'Cancel order',
          icon: 'slash' as const,
          destructive: true,
          confirm: { title: 'Cancel this sales order?', message: 'It can no longer be shipped or invoiced. This cannot be undone.', confirmLabel: 'Cancel order' },
          onPress: () => { void cancel(); },
        }]
      : []),
    ...(actions.delete && isOwner
      ? [{ label: 'Delete sales order', icon: 'trash-2' as const, destructive: true, confirm: false as const, onPress: doDelete }]
      : []),
  ];

  return (
    <ReportContainer>
      <ReportHeader title={o.orderNumber} subtitle={o.customerName} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={styles.headRow}>
            <Badge label={titleCase(o.status)} color={txnStatusColor(o.status)} dot />
            <Text style={styles.total}>{rs(o.total)}</Text>
          </View>
          <Info label="Order date" value={o.orderDate} />
          {!!o.expectedDate && <Info label="Expected date" value={o.expectedDate} />}
          {!!o.totals && <Info label="Shipped" value={`${o.totals.shipped} of ${o.totals.ordered}`} />}
          {!!o.totals && o.totals.invoiced > 0 && <Info label="Invoiced" value={`${o.totals.invoiced} of ${o.totals.ordered}`} />}
          {!o.totals && !!o.invoiceId && <Info label="Invoiced" value="Yes" />}
        </Card>

        <Banners order={o} managed={managed} isOwner={isOwner} />

        <SectionCard title={shipping ? 'Record a shipment' : 'Items & Shipment'} icon="package">
          {shipping && (
            <Text style={styles.hint}>Enter what is going out now. What already shipped is added for you.</Text>
          )}
          {o.lines.map((l, i) => {
            const pct = l.quantity > 0 ? Math.min(1, l.quantityFulfilled / l.quantity) : 0;
            const left = remainingToShip(l);
            if (shipping && l.id) {
              return (
                <View key={l.id} style={styles.shipRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lineDesc}>{l.description}</Text>
                    <Text style={styles.lineMeta}>
                      Ordered {l.quantity} • Shipped {l.quantityFulfilled} • Invoiced {l.quantityInvoiced} • Left {left}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.shipInput}
                    value={shipping[l.id] ?? ''}
                    onChangeText={v => setShipping(s => ({ ...(s ?? {}), [l.id!]: v.replace(/[^0-9.]/g, '') }))}
                    placeholder="0"
                    placeholderTextColor={THEME.colors.textTertiary}
                    keyboardType="decimal-pad"
                    editable={left > 0}
                    accessibilityLabel={`Ship now, ${l.description}`}
                  />
                  <Text style={styles.shipMax}>/ {left}</Text>
                </View>
              );
            }
            return (
              <View key={l.id ?? i} style={styles.lineRow}>
                <View style={styles.lineTop}>
                  <Text style={styles.lineDesc}>{l.description}</Text>
                  <Text style={styles.lineTotal}>{rs(l.lineTotal)}</Text>
                </View>
                <Text style={styles.lineMeta}>
                  {l.quantityFulfilled}/{l.quantity} shipped
                  {l.quantityInvoiced > 0 ? ` · ${l.quantityInvoiced >= l.quantity ? 'invoiced' : `${l.quantityInvoiced} invoiced`}` : ''}
                  {' · '}{rs(l.unitPrice)} ea
                  {!l.itemId ? ' · service' : l.onHand != null ? ` · on hand ${l.onHand}` : ''}
                </Text>
                {(l.backorderQty ?? 0) > 0 && (
                  <Text style={[styles.lineMeta, { color: THEME.colors.warning }]}>Backorder {l.backorderQty} — ships when stock arrives</Text>
                )}
                <ProgressBar pct={pct} color={pct >= 1 ? THEME.colors.success : THEME.colors.warning} />
              </View>
            );
          })}
          {!shipping && (
            <>
              <View style={styles.divider} />
              <Info label="Subtotal" value={rs(o.subtotal)} />
              {o.discountAmount > 0 && <Info label="Discount" value={`- ${rs(o.discountAmount)}`} />}
              <Info label="Tax" value={rs(o.taxAmount)} />
              <Info label="Total" value={rs(o.total)} strong />
            </>
          )}
        </SectionCard>

        {o.invoices.length > 0 && !shipping && (
          <SectionCard title={o.invoices.length === 1 ? 'Invoice' : 'Invoices'} icon="file-text">
            {o.invoices.map(inv => (
              <TouchableOpacity
                key={inv.id}
                style={styles.invoiceRow}
                onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: inv.id })}
                accessibilityRole="button"
                accessibilityLabel={`Open invoice ${inv.invoiceNumber}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.lineDesc, inv.status === 'void' && styles.voided]}>{inv.invoiceNumber}</Text>
                  <Text style={styles.lineMeta}>{inv.invoiceDate} · {titleCase(inv.status)}</Text>
                </View>
                <Text style={styles.lineTotal}>{rs(inv.total)}</Text>
              </TouchableOpacity>
            ))}
          </SectionCard>
        )}

        {!!o.notes && !shipping && <Card><Text style={styles.notes}>{o.notes}</Text></Card>}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* One bar instead of a stack of buttons. Primary is the next step:
          invoice goods that shipped and are not billed, else record the next
          shipment. Everything else is behind More, closed while a request is
          running. A delivery's own order is shipped and invoiced through the
          delivery, so it offers only Share. */}
      {shipping ? (
        <ActionBar
          secondary={{ title: 'Cancel', onPress: () => setShipping(null), disabled: isSaving }}
          primary={{ title: 'Save Shipment', onPress: saveShipment, isLoading: isSaving, icon: 'check-circle' }}
        />
      ) : (
        <ActionBar
          leading={
            <IconButton icon="share-2" onPress={() => { void sharePdf(); }} isLoading={sharing} accessibilityLabel="Share PDF" />
          }
          moreDisabled={isSaving}
          primary={managed ? undefined : button(plan.primary)}
          secondary={managed ? undefined : button(plan.secondary)}
          more={!managed && more.length ? more : undefined}
        />
      )}
      <CreditLimitModal
        assessment={creditRefusal?.assessment ?? null}
        busy={isSaving}
        onClose={() => setCreditRefusal(null)}
        onOverride={reason => { const retry = creditRefusal?.retry; setCreditRefusal(null); retry?.(reason); }}
        onRecordAdvance={a => { setCreditRefusal(null); navigation.navigate('ReceivePayment', { customerId: a.customerId }); }}
      />
    </ReportContainer>
  );
};

/** Notes above the lines: who acts next, and why. */
const Banners: React.FC<{ order: SalesOrder; managed: boolean; isOwner: boolean }> = ({ order, managed, isOwner }) => {
  if (managed) {
    return (
      <Note>
        This order belongs to delivery {order.deliveryReference ?? ''}. It is shipped and invoiced through that delivery.
      </Note>
    );
  }
  const billedAhead = billedNotShipped(order);
  const left = leftToShip(order);
  return (
    <>
      {order.status === 'invoiced' && billedAhead > 0 && (
        <Note warning>
          {units(billedAhead)} invoiced but not delivered yet. Record the shipment when {billedAhead === 1 ? 'it goes' : 'they go'} out — the invoice already took the stock off the books.
        </Note>
      )}
      {order.status === 'partial' && order.invoices.length > 0 && left > 0 && (
        <Note>
          {units(left)} still to ship. Ship and invoice {left === 1 ? 'it' : 'them'} as {left === 1 ? 'it goes' : 'they go'} out, or close the order if the customer will not take the rest.
        </Note>
      )}
      {order.status === 'closed' && <Note>This order was closed: what had not shipped will not ship. Reopen it to ship the rest.</Note>}
      {!isOwner && salesOrderActions(order).invoice && <Note>Invoicing posts the sale and moves stock, so the owner approves it.</Note>}
    </>
  );
};

const Note: React.FC<{ warning?: boolean; children: React.ReactNode }> = ({ warning, children }) => (
  <View style={[styles.note, warning && styles.noteWarning]}>
    <Text style={styles.noteText}>{children}</Text>
  </View>
);

const Info: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, strong && styles.bold]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  total: { ...THEME.typography.h4, color: THEME.colors.textPrimary },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary },
  infoValue: { ...THEME.typography.labelMd, color: THEME.colors.textPrimary },
  bold: { ...THEME.typography.labelLg },
  lineRow: { paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight, gap: 5 },
  lineTop: { flexDirection: 'row', justifyContent: 'space-between' },
  lineDesc: { ...THEME.typography.labelMd, color: THEME.colors.textPrimary, flex: 1 },
  lineMeta: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  lineTotal: { ...THEME.typography.labelMd, color: THEME.colors.textPrimary },
  divider: { height: 1, backgroundColor: THEME.colors.border, marginVertical: 8 },
  notes: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary },
  hint: { ...THEME.typography.bodySm, color: THEME.colors.textSecondary, marginBottom: 4 },
  shipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.colors.borderLight,
    gap: 6,
  },
  shipInput: {
    width: 64,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 6,
    ...THEME.typography.labelLg,
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  shipMax: { ...THEME.typography.caption, color: THEME.colors.textTertiary },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.colors.borderLight,
    gap: 8,
  },
  voided: { textDecorationLine: 'line-through', color: THEME.colors.textTertiary },
  note: { borderRadius: THEME.radius.md, padding: 12, backgroundColor: THEME.colors.infoLight },
  noteWarning: { backgroundColor: THEME.colors.warningLighter },
  noteText: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary },
});

export default SalesOrderDetailScreen;
