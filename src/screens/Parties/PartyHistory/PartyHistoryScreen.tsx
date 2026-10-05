// ═══════════════════════════════════════════════════════
// FinMatrix — Customer / vendor History
// ═══════════════════════════════════════════════════════
// Peachtree's History tab, on a phone: four figures (since when, the last
// invoice or bill, the last payment, days to pay), then one thing at a time —
// the fiscal year month by month, or (for the owner) what changed on the
// record and who changed it. The months come from the same postings as the
// General Ledger, so their balance is the ledger's.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { formatCurrency } from '../../../utils/formatters';
import {
  ReportContainer, ReportHeader, Card, SectionCard, FigureStrip, Segmented,
  LoadingBlock, ErrorBlock, EmptyBlock, reportContentStyle,
} from '../../../components/reports/ReportUI';
import { getCustomerHistoryAPI } from '../../../networks/sales/customerNetwork';
import { getVendorHistoryAPI } from '../../../networks/purchases/vendorNetwork';
import {
  HISTORY_ACTION_LABELS, HISTORY_COPY, historyFieldLabel, historyValue, monthLabel,
  partyHistorySerializer, type HistoryChange, type PartyHistory,
} from '../../../models/partyHistoryModel';
import type { SharedRecordParamList } from '../../../navigators/stacks/sharedRecordParams';

const { colors, spacing, typography } = THEME;
const rs = (n: number) => formatCurrency(n, 'Rs ');

type Nav = NativeStackNavigationProp<SharedRecordParamList>;
type HistoryRoute = RouteProp<SharedRecordParamList, 'PartyHistory'>;

/** "12 Sep 2026" for an ISO date or timestamp. */
const shortDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
const when = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

/** The fiscal year today falls in: the year it started in. */
const currentFiscalYear = (startMonth: number): number => {
  const today = new Date();
  return today.getMonth() + 1 >= startMonth ? today.getFullYear() : today.getFullYear() - 1;
};

const PartyHistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { partyType, partyId, partyName } = useRoute<HistoryRoute>().params;
  const copy = HISTORY_COPY[partyType];

  const [year, setYear] = useState<number | undefined>(undefined);
  const [view, setView] = useState<'months' | 'changes'>('months');
  const [history, setHistory] = useState<PartyHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef(0);

  // State changes only when the answer arrives; the newest request wins.
  // Whoever asks for a reload (a year, Retry) shows the spinner first.
  const load = useCallback(() => {
    const mine = ++request.current;
    const call = partyType === 'customer' ? getCustomerHistoryAPI(partyId, year) : getVendorHistoryAPI(partyId, year);
    return call
      .then(raw => {
        if (mine !== request.current) return;
        setHistory(partyHistorySerializer(raw, partyType));
        setError('');
      })
      .catch((e: any) => {
        if (mine === request.current) setError(e?.message || 'The history could not be loaded.');
      })
      .finally(() => {
        if (mine === request.current) setLoading(false);
      });
  }, [partyType, partyId, year]);

  useEffect(() => { void load(); }, [load]);

  const chooseYear = useCallback((y: number | undefined) => {
    setLoading(true);
    setYear(y);
  }, []);
  const retry = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const startMonth = Number(history?.fiscalYear.startDate.slice(5, 7)) || 1;
  const thisYear = currentFiscalYear(startMonth);
  const years = [thisYear, thisYear - 1, thisYear - 2];
  const shownYear = history?.fiscalYear.year ?? thisYear;
  const showChanges = history?.changes !== null && history?.changes !== undefined;

  return (
    <ReportContainer>
      <ReportHeader
        title="History"
        subtitle={history ? (history.party.code ? `${history.party.code} · ${history.party.name}` : history.party.name) : partyName ?? ''}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={reportContentStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {loading && !history && <LoadingBlock label="Loading history…" />}
        {!!error && <ErrorBlock message={error} onRetry={retry} />}

        {history && !error && (
          <>
            <FigureStrip
              items={[
                { label: copy.since, value: shortDate(history.since) },
                {
                  label: copy.lastDocument,
                  value: history.lastDocument ? rs(history.lastDocument.amount) : '—',
                  caption: history.lastDocument
                    ? [history.lastDocument.number, shortDate(history.lastDocument.date)].filter(Boolean).join(' · ')
                    : 'None yet',
                },
                {
                  label: 'Last payment',
                  value: history.lastPayment ? rs(history.lastPayment.amount) : '—',
                  caption: history.lastPayment
                    ? [history.lastPayment.number, shortDate(history.lastPayment.date)].filter(Boolean).join(' · ')
                    : 'None yet',
                },
                {
                  label: copy.pays,
                  value: history.averageDaysToPay ? `${history.averageDaysToPay.days} days` : '—',
                  caption: history.averageDaysToPay
                    ? `Average over ${history.averageDaysToPay.count} paid in the last 12 months`
                    : 'Nothing paid in full in the last 12 months',
                },
              ]}
            />

            {showChanges && (
              <Card>
                <Segmented
                  options={['By month', `Changes · ${history.changes!.length}`]}
                  activeIndex={view === 'months' ? 0 : 1}
                  onChange={i => setView(i === 0 ? 'months' : 'changes')}
                />
              </Card>
            )}

            {view === 'months' || !showChanges ? (
              <SectionCard
                title={`Fiscal ${shownYear}`}
                subtitle={`${monthLabel(history.months[0]?.month ?? '')} – ${monthLabel(history.months[history.months.length - 1]?.month ?? '')}`}
                icon="calendar"
              >
                <View style={styles.yearRow}>
                  {years.map(y => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => chooseYear(y === thisYear ? undefined : y)}
                      style={[styles.chip, y === shownYear && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, y === shownYear && styles.chipTextActive]}>
                        {y === thisYear ? 'This year' : y === thisYear - 1 ? 'Last year' : String(y)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.monthRow}>
                  <Text style={styles.monthLabel}>Brought forward</Text>
                  <Text style={styles.monthBalance}>{rs(history.openingBalance)}</Text>
                </View>
                {history.months.map(m => {
                  const quiet = m.charged === 0 && m.settled === 0;
                  return (
                    <View key={m.month} style={styles.monthRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.monthLabel}>{monthLabel(m.month)}</Text>
                        <Text style={[styles.monthDetail, quiet && styles.quiet]}>
                          {quiet
                            ? 'Nothing this month'
                            : `${copy.charged} ${rs(m.charged)} · ${copy.settled} ${rs(m.settled)}`}
                        </Text>
                      </View>
                      <Text style={styles.monthBalance}>{rs(m.balance)}</Text>
                    </View>
                  );
                })}
                <View style={[styles.monthRow, styles.totalRow]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.totalText}>Year</Text>
                    <Text style={styles.monthDetail}>
                      {copy.charged} {rs(history.totals.charged)} · {copy.settled} {rs(history.totals.settled)}
                    </Text>
                  </View>
                  <Text style={styles.totalText}>{rs(history.closingBalance)}</Text>
                </View>
                <Text style={styles.footnote}>
                  {partyType === 'customer'
                    ? 'Sales are invoices less credit memos; receipts are money received less refunds. The right-hand figure is the balance at each month’s end.'
                    : 'Purchases are bills less vendor credits. The right-hand figure is what you owe at each month’s end.'}
                </Text>
              </SectionCard>
            ) : (
              <SectionCard title="Changes" subtitle="Who changed what, newest first" icon="edit-3">
                {history.changes!.length === 0 ? (
                  <EmptyBlock title="No changes recorded yet." />
                ) : (
                  history.changes!.map(c => <ChangeRow key={c.id} change={c} partyType={partyType} />)
                )}
              </SectionCard>
            )}
          </>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const ChangeRow: React.FC<{ change: HistoryChange; partyType: 'customer' | 'vendor' }> = ({ change, partyType }) => (
  <View style={styles.changeRow}>
    <Text style={styles.changeHead}>
      {HISTORY_ACTION_LABELS[change.action]}
      <Text style={styles.changeWho}>
        {' · '}
        {change.user ?? (change.action === 'created' ? 'before changes were recorded' : 'the system')}
      </Text>
    </Text>
    <Text style={styles.changeWhen}>{when(change.at)}</Text>
    {change.fields.map(f => (
      <Text key={f.field} style={styles.changeField}>
        <Text style={styles.changeFieldName}>{historyFieldLabel(f.field, partyType)}: </Text>
        {change.action === 'created' || f.field === 'defaultExpenseAccountId'
          ? historyValue(f.field, f.to)
          : `${historyValue(f.field, f.from)} → ${historyValue(f.field, f.to)}`}
      </Text>
    ))}
  </View>
);

const styles = StyleSheet.create({
  yearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: colors.neutral100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary + '18', borderColor: colors.primary },
  chipText: { ...typography.labelSm, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: typography.labelLg.fontWeight },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  monthLabel: { ...typography.bodySm, color: colors.textPrimary },
  monthDetail: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  quiet: { color: colors.textTertiary },
  monthBalance: { ...typography.labelMd, color: colors.textPrimary, marginLeft: spacing.sm },
  totalRow: { borderTopWidth: 2, borderTopColor: colors.border },
  totalText: { ...typography.labelLg, color: colors.textPrimary },
  footnote: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm },
  changeRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  changeHead: { ...typography.labelMd, color: colors.textPrimary },
  changeWho: { ...typography.bodySm, color: colors.textSecondary },
  changeWhen: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
  changeField: { ...typography.bodySm, color: colors.textPrimary, marginTop: spacing.xxs },
  changeFieldName: { color: colors.textSecondary },
});

export default PartyHistoryScreen;
