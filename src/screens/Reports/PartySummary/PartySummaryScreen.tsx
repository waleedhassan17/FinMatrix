// ═══════════════════════════════════════════════════════
// FinMatrix — Outstanding invoices / payables summary
// ═══════════════════════════════════════════════════════
// Reached from a customer's or vendor's screen. Everything still open with
// them, as of today, ready to send: the figure to ask for, what is overdue,
// the aging, every unpaid invoice or bill, and the credits that come off.
//
// One screen for both sides; the words change, the shape does not. What it
// shows is exactly what the PDF and the WhatsApp message say — the three are
// built from one model — and it fetches afresh whenever it comes back into
// view, so a summary about to go to a customer never predates their payment.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { THEME, rampSteps } from '../../../theme';
import { Alert } from '../../../utils/alert';
import { useCompanyInfo } from '../../../utils/companyInfo';
import {
  ReportContainer,
  ReportHeader,
  Card,
  SectionCard,
  SummaryLine,
  LoadingBlock,
  ErrorBlock,
  EmptyBlock,
  reportContentStyle,
} from '../../../components/reports/ReportUI';
import { getARPartySummaryAPI } from '../../../networks/reports/arAgingNetwork';
import { getAPPartySummaryAPI } from '../../../networks/reports/apAgingNetwork';
import { partySummarySerializer } from '../../../serializers/partySummarySerializer';
import {
  CREDIT_KIND_LABELS,
  SUMMARY_COPY,
  countLabel,
  hasAnythingOpen,
  headlineFigure,
  lateness,
  normalizeWhatsappPhone,
  rs,
  summaryDate,
  type PartySummary,
} from '../../../models/partySummaryModel';
import {
  openPartySummaryInWhatsApp,
  savePartySummaryPdf,
  sharePartySummaryPdf,
  type SummaryActionResult,
} from '../../../utils/partySummaryPdf';
import type { MoreStackParamList } from '../../../navigators/stacks/MoreStack';

const { colors, radius, spacing, typography } = THEME;

type Nav = NativeStackNavigationProp<MoreStackParamList>;
type SummaryRoute = RouteProp<MoreStackParamList, 'PartySummary'>;

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; summary: PartySummary }
  | { status: 'failed'; message: string }
  /** The party is not in this company. */
  | { status: 'missing' }
  /** A server older than this build: the route does not exist yet. */
  | { status: 'unavailable' };

type Busy = 'share' | 'save' | 'whatsapp' | null;

const PartySummaryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<SummaryRoute>();
  const { partyType, partyId, partyName } = params;
  const copy = SUMMARY_COPY[partyType];
  const company = useCompanyInfo();
  const insets = useSafeAreaInsets();

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const requestId = useRef(0);
  const loadedOnce = useRef(false);

  // Every state change lands in the request's callbacks, after it answers, so
  // the effects below may start one; the spinners are set by the events that
  // ask for them.
  const fetchSummary = useCallback(() => {
    const id = ++requestId.current;
    const request = partyType === 'vendor' ? getAPPartySummaryAPI(partyId) : getARPartySummaryAPI(partyId);
    request
      .then(payload => {
        if (id !== requestId.current) return;
        const summary = partySummarySerializer(payload);
        setState(summary ? { status: 'ready', summary } : { status: 'failed', message: 'The summary came back empty.' });
        loadedOnce.current = true;
      })
      .catch((e: any) => {
        if (id !== requestId.current) return;
        if (e?.status === 404) {
          // Nest's own 404 for a route it does not have starts "Cannot GET";
          // the service's is about the party.
          setState(/cannot get/i.test(String(e?.message)) ? { status: 'unavailable' } : { status: 'missing' });
        } else {
          setState({ status: 'failed', message: e?.message || 'The summary could not be loaded.' });
        }
      })
      .finally(() => {
        if (id === requestId.current) setRefreshing(false);
      });
  }, [partyId, partyType]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Back from an invoice, or from recording a payment: the figures may have
  // moved, and this is about to be sent to someone. Quietly — the figures on
  // screen stay until the new ones arrive.
  useFocusEffect(
    useCallback(() => {
      if (loadedOnce.current) fetchSummary();
    }, [fetchSummary]),
  );

  const retry = () => {
    setState({ status: 'loading' });
    fetchSummary();
  };
  const refresh = () => {
    setRefreshing(true);
    fetchSummary();
  };

  const summary = state.status === 'ready' ? state.summary : null;
  const sendable = summary ? hasAnythingOpen(summary) : false;
  const phone = summary ? normalizeWhatsappPhone(summary.party.phone) : null;

  const run = async (
    kind: Exclude<Busy, null>,
    action: (s: PartySummary, c: typeof company) => Promise<SummaryActionResult>,
  ) => {
    if (!summary || busy) return;
    setBusy(kind);
    try {
      const result = await action(summary, company);
      if (!result.done && result.reason) Alert.alert(copy.title, result.reason);
    } catch (e: any) {
      Alert.alert('Could not prepare the PDF', e?.message || 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  // A push onto this tab: the documents are shared record screens
  // (navigations-maps/sharedRecords), so back returns to this summary.
  const openDocument = (documentType: 'invoice' | 'bill', documentId: string) => {
    if (!documentId) return;
    const screen = documentType === 'bill' ? 'BillDetail' : 'InvoiceDetail';
    const param = documentType === 'bill' ? 'billId' : 'invoiceId';
    (navigation as unknown as NativeStackNavigationProp<Record<string, object>>).navigate(screen, {
      [param]: documentId,
    });
  };

  const subtitle = summary
    ? `${summary.party.name} · as of ${summaryDate(summary.asOfDate)}`
    : partyName || undefined;

  return (
    <ReportContainer>
      <ReportHeader title={copy.title} subtitle={subtitle} onBack={() => navigation.goBack()} />

      {state.status === 'loading' ? <LoadingBlock label="Preparing the summary…" /> : null}
      {state.status === 'failed' ? <ErrorBlock message={state.message} onRetry={retry} /> : null}
      {state.status === 'missing' ? (
        <EmptyBlock
          icon="user-x"
          title={`This ${partyType} could not be found`}
          hint="It may have been removed."
        />
      ) : null}
      {state.status === 'unavailable' ? (
        <EmptyBlock
          icon="cloud-off"
          title="Not available yet"
          hint="This summary needs the latest server update. Please try again later."
        />
      ) : null}

      {summary ? (
        <>
          <ScrollView
            contentContainerStyle={reportContentStyle}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
            }
          >
            {sendable ? (
              <SummaryBody summary={summary} onOpenDocument={openDocument} />
            ) : (
              <EmptyBlock
                icon="check-circle"
                title="Nothing outstanding"
                hint={`${summary.party.name} ${copy.nothingOpen}.`}
              />
            )}
          </ScrollView>

          {sendable ? (
            <View style={[styles.footer, { paddingBottom: spacing.sm + insets.bottom }]}>
              <TouchableOpacity
                style={[styles.primaryBtn, busy !== null && styles.dimmed]}
                activeOpacity={0.85}
                disabled={busy !== null}
                onPress={() => run('share', sharePartySummaryPdf)}
                accessibilityRole="button"
                accessibilityLabel="Share PDF"
              >
                {busy === 'share' ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Feather name="share-2" size={16} color={colors.textInverse} />
                )}
                <Text style={styles.primaryText}>Share PDF</Text>
              </TouchableOpacity>
              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, (busy !== null || !phone) && styles.dimmed]}
                  activeOpacity={0.85}
                  disabled={busy !== null || !phone}
                  onPress={() => run('whatsapp', openPartySummaryInWhatsApp)}
                  accessibilityRole="button"
                  accessibilityLabel={phone ? 'Send on WhatsApp' : 'WhatsApp, no mobile number on file'}
                >
                  <Feather name="message-circle" size={16} color={colors.primary} />
                  <Text style={styles.secondaryText}>WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryBtn, busy !== null && styles.dimmed]}
                  activeOpacity={0.85}
                  disabled={busy !== null}
                  onPress={() => run('save', savePartySummaryPdf)}
                  accessibilityRole="button"
                  accessibilityLabel="Save PDF"
                >
                  {busy === 'save' ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Feather name="download" size={16} color={colors.primary} />
                  )}
                  <Text style={styles.secondaryText}>Save PDF</Text>
                </TouchableOpacity>
              </View>
              {!phone ? (
                <Text style={styles.footerHint}>No mobile number on file — Share PDF reaches WhatsApp too.</Text>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </ReportContainer>
  );
};

// ─── The summary itself ──────────────────────────────

const SummaryBody: React.FC<{
  summary: PartySummary;
  onOpenDocument: (type: 'invoice' | 'bill', id: string) => void;
}> = ({ summary: s, onOpenDocument }) => {
  const copy = SUMMARY_COPY[s.partyType];
  const head = headlineFigure(s);
  const hasCredits = s.credits.items.length > 0;
  const filled = s.buckets.filter(b => b.amount !== 0);
  const ramp = rampSteps(s.buckets.length);
  const largest = Math.max(...filled.map(b => b.amount), 0);

  return (
    <>
      {/* The figure to ask for */}
      <Card>
        <Text style={styles.headLabel}>{head.label}</Text>
        <Text style={styles.headValue} accessibilityRole="header">
          {rs(head.value)}
        </Text>
        <Text style={styles.headCaption}>
          {s.totals.overdue > 0 ? (
            <Text style={styles.overdue}>{rs(s.totals.overdue)} overdue</Text>
          ) : (
            <Text>Nothing overdue</Text>
          )}
          <Text style={styles.faint}>
            {' · '}
            {s.totals.overdue > 0
              ? `${s.totals.overdueCount} of ${countLabel(s.totals.count, s.partyType)}`
              : `${countLabel(s.totals.count, s.partyType)} open`}
          </Text>
        </Text>
        {s.lastPayment ? (
          <Text style={styles.faintLine}>
            {copy.lastPaymentLabel} {rs(s.lastPayment.amount)} · {summaryDate(s.lastPayment.date)}
          </Text>
        ) : null}

        {filled.length > 0 ? (
          <View style={styles.aging} accessibilityLabel="Aging, in days overdue">
            <Text style={styles.agingTitle}>Aging · days overdue</Text>
            {s.buckets.map((b, i) =>
              b.amount === 0 ? null : (
                <View key={b.key} style={styles.agingRow}>
                  <Text style={styles.agingLabel} numberOfLines={1}>
                    {b.label}
                  </Text>
                  <View style={styles.agingTrack}>
                    <View
                      style={[
                        styles.agingBar,
                        { width: `${Math.max(4, (b.amount / (largest || 1)) * 100)}%`, backgroundColor: ramp[i] },
                      ]}
                    />
                  </View>
                  <Text style={styles.agingAmount} numberOfLines={1}>
                    {rs(b.amount)}
                  </Text>
                </View>
              ),
            )}
          </View>
        ) : null}
      </Card>

      {/* The documents */}
      {s.documents.length > 0 ? (
        <SectionCard title={`${copy.documentsTitle} · ${s.documents.length}`} icon="file-text">
          {s.documents.map((d, i) => (
            <TouchableOpacity
              key={d.documentId || i}
              style={[styles.row, i > 0 && styles.rowRule]}
              activeOpacity={0.7}
              onPress={() => onOpenDocument(d.documentType, d.documentId)}
              accessibilityRole="button"
              accessibilityLabel={`${d.documentNumber || copy.noun}, ${rs(d.balance)}, ${lateness(d.daysOverdue)}. Opens the ${copy.noun}`}
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {d.documentNumber || copy.noun}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  Due {summaryDate(d.dueDate)} ·{' '}
                  <Text style={d.daysOverdue > 0 ? styles.overdue : undefined}>{lateness(d.daysOverdue)}</Text>
                </Text>
              </View>
              <View style={styles.rowEnd}>
                <Text style={styles.rowAmount}>{rs(d.balance)}</Text>
                {d.amountPaid > 0 ? <Text style={styles.rowOf}>of {rs(d.total)}</Text> : null}
              </View>
              <Feather name="chevron-right" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </SectionCard>
      ) : null}

      {/* Credits, and what they leave */}
      {hasCredits ? (
        <SectionCard title={`Unapplied credits · ${s.credits.items.length}`} icon="rotate-ccw">
          {s.credits.items.map((c, i) => (
            <View key={`${c.kind}-${c.id}`} style={[styles.row, i > 0 && styles.rowRule]}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {c.reference || CREDIT_KIND_LABELS[c.kind]}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {CREDIT_KIND_LABELS[c.kind]} · {summaryDate(c.date)}
                </Text>
              </View>
              <View style={styles.rowEnd}>
                <Text style={styles.rowAmount}>− {rs(c.available)}</Text>
                {c.available < c.amount ? <Text style={styles.rowOf}>of {rs(c.amount)}</Text> : null}
              </View>
            </View>
          ))}
          <View style={styles.totals}>
            <SummaryLine label="Total outstanding" value={rs(s.totals.outstanding)} />
            <SummaryLine label="Less credits" value={`− ${rs(s.credits.total)}`} />
            <SummaryLine label={head.label} value={rs(head.value)} strong />
          </View>
        </SectionCard>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  headLabel: { ...typography.labelSm, color: colors.textSecondary },
  headValue: { ...typography.h2, color: colors.textPrimary, marginTop: 2 },
  headCaption: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  overdue: { color: colors.danger },
  faint: { color: colors.textTertiary },
  faintLine: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },

  aging: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },
  agingTitle: { ...typography.overline, color: colors.textTertiary },
  agingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  agingLabel: { ...typography.caption, color: colors.textSecondary, width: 76 },
  agingTrack: { flex: 1, height: 8, borderRadius: radius.full, backgroundColor: colors.neutral100, overflow: 'hidden' },
  agingBar: { height: 8, borderRadius: radius.full },
  agingAmount: { ...typography.labelSm, color: colors.textPrimary, minWidth: 92, textAlign: 'right' },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { ...typography.labelMd, color: colors.primary },
  rowSub: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  rowEnd: { alignItems: 'flex-end' },
  rowAmount: { ...typography.labelMd, color: colors.textPrimary },
  rowOf: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },
  totals: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },

  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryText: { ...typography.labelLg, color: colors.textInverse },
  secondaryRow: { flexDirection: 'row', gap: spacing.xs },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryText: { ...typography.labelMd, color: colors.primary },
  dimmed: { opacity: 0.5 },
  footerHint: { ...typography.caption, color: colors.textTertiary, textAlign: 'center' },
});

export default PartySummaryScreen;
