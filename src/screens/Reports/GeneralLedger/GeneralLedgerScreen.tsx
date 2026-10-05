import dayjs from 'dayjs';
import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  fetchGeneralLedger, selectGeneralLedgerState, setLedgerAccount, setLedgerRange, refreshLedgerRange
} from './generalLedgerSlice';
import { formatCurrency } from '../../../utils/formatters';
import type {
  LedgerEntry, LedgerPartiesReport, LedgerPartyType, PartyLedgerEntry, PartyLedgerReport,
} from '../../../models/generalLedgerModel';
import { getLedgerPartiesAPI, getPartyLedgerAPI } from '../../../networks/reports/generalLedgerNetwork';
import { ledgerPartiesSerializer, partyLedgerSerializer } from '../../../serializers/generalLedgerSerializer';
import { partyLabel } from '../../../models/partyCodeModel';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import { displayOrder, ROW_CAP, visibleLedgerRows } from './ledgerRows';
import type { ReportsStackParamList } from '../../../navigators/stacks/ReportsStack';

// Design-system tokens (see src/theme/theme.ts).
const { typography } = THEME;
import {
  ReportContainer, ReportHeader, Card, SectionCard, FigureStrip, RefreshFade, DateField, Badge,
  LoadingBlock, ErrorBlock, EmptyBlock, reportContentStyle, amountColWidth,
  ReportTitleBlock, useStatementCompany, rangeLabel, Segmented
} from '../../../components/reports/ReportUI';

type ReportsNav = NativeStackNavigationProp<ReportsStackParamList>;
type LedgerRoute = RouteProp<ReportsStackParamList, 'GeneralLedger'>;

/**
 * Who the ledger is read by. One ledger, three selections — an account, a
 * customer or a vendor — the way Peachtree lets you pull up any account's or
 * any customer's ledger and read it the same way. A customer's or vendor's
 * page opens this screen with them selected.
 */
type LedgerView = 'accounts' | 'customers' | 'vendors';
const VIEWS: LedgerView[] = ['accounts', 'customers', 'vendors'];
const VIEW_LABELS = ['Accounts', 'Customers', 'Vendors'];
const PARTY_OF: Record<LedgerView, LedgerPartyType | null> = {
  accounts: null,
  customers: 'customer',
  vendors: 'vendor',
};

/** A table line, whoever the ledger is read by. */
interface TableRow {
  key: string;
  date: string;
  postedAt: string;
  /** The journal reference (accounts) or the transaction — "Invoice INV-2026-0012" (parties). */
  title: string;
  caption: string;
  debit: number;
  credit: number;
  balance: number;
  /** Where a tap goes; absent when there is nothing to open. */
  open?: () => void;
}

interface TableGroup {
  key: string;
  heading: string;
  rows: TableRow[];
  opening?: number;
  closing: number;
}
const rs = (n: number) => formatCurrency(n, 'Rs ');

// The posting date is the accounting date; the time comes from when the entry
// was recorded, which is what an audit trail needs.
const fmtLedgerDate = (d: string): string => (d ? dayjs(d).format('MMM D, YYYY') : '—');
const fmtLedgerTime = (ts: string): string => (ts ? dayjs(ts).format('HH:mm:ss') : '');

/**
 * Group entries by account WITHOUT reordering them: accounts appear in the
 * order they first occur in the response, and each account's entries keep the
 * order the API returned. Nothing is sorted, summed into a balance, or
 * otherwise recomputed here.
 */
const groupByAccount = (entries: LedgerEntry[]) => {
  const order: string[] = [];
  const byCode = new Map<string, { code: string; name: string; rows: LedgerEntry[] }>();
  for (const e of entries) {
    const code = e.accountCode ?? '';
    let group = byCode.get(code);
    if (!group) {
      group = { code, name: e.accountName ?? '', rows: [] };
      byCode.set(code, group);
      order.push(code);
    }
    group.rows.push(e);
  }
  return order.map(code => byCode.get(code)!);
};

/** Party lines grouped by customer or vendor, in the order they first occur. */
const groupByParty = (entries: PartyLedgerEntry[]) => {
  const order: string[] = [];
  const byId = new Map<string, { id: string; heading: string; rows: PartyLedgerEntry[] }>();
  for (const e of entries) {
    let group = byId.get(e.partyId);
    if (!group) {
      group = { id: e.partyId, heading: e.partyCode ? `${e.partyCode} — ${e.partyName}` : e.partyName, rows: [] };
      byId.set(e.partyId, group);
      order.push(e.partyId);
    }
    group.rows.push(e);
  }
  return order.map(id => byId.get(id)!);
};

const GeneralLedgerScreen: React.FC = () => {
  const navigation = useNavigation<ReportsNav>();
  const route = useRoute<LedgerRoute>();
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectGeneralLedgerState);
  const company = useStatementCompany();

  // The selection lives on this screen, not in the shared slice: a ledger
  // opened from a customer's page must not change the Reports tab's ledger.
  const params = route.params;
  const [view, setView] = useState<LedgerView>(
    params?.partyType === 'vendor' ? 'vendors' : params?.partyType === 'customer' ? 'customers' : 'accounts',
  );
  const [partyId, setPartyId] = useState<string>(params?.partyId ?? '');
  const partyType = PARTY_OF[view];

  // Bring the window up to today every time the screen is opened.
  //
  // The default is seeded in the slice's initialState, which is evaluated once
  // at bundle startup — so on a device left running for days it silently keeps
  // asking for a window that ended when the app launched, and the report looks
  // like the books stopped. The reducer leaves a range the user chose alone.
  //
  // And re-fetch on every focus: postings made elsewhere (a payment, a bill)
  // while this screen sat in the stack otherwise never appeared — "the ledger
  // is not updating".
  const range = state.range;
  const account = state.account;

  // The ledger read by party: fetched here, newest request wins.
  const [party, setParty] = useState<{
    report: PartyLedgerReport | null;
    parties: LedgerPartiesReport | null;
    loading: boolean;
    error: string;
  }>({ report: null, parties: null, loading: false, error: '' });
  const partyRequest = useRef(0);
  const loadParty = useCallback(async () => {
    if (!partyType) return;
    const request = ++partyRequest.current;
    setParty(p => ({ ...p, loading: true, error: '' }));
    try {
      const [ledgerRaw, partiesRaw] = await Promise.all([
        getPartyLedgerAPI({ ...range, party: partyType, partyId: partyId || undefined }),
        getLedgerPartiesAPI({ type: partyType, ...range }),
      ]);
      if (request !== partyRequest.current) return;
      setParty({
        report: partyLedgerSerializer(ledgerRaw),
        parties: ledgerPartiesSerializer(partiesRaw),
        loading: false,
        error: '',
      });
    } catch (e: any) {
      if (request !== partyRequest.current) return;
      setParty(p => ({ ...p, loading: false, error: e?.message || 'Failed to load the ledger' }));
    }
  }, [partyType, partyId, range]);

  const reload = useCallback(
    () => (partyType ? loadParty() : dispatch(fetchGeneralLedger({ range, account }))),
    [dispatch, range, account, partyType, loadParty],
  );
  const isFirstFocus = React.useRef(true);
  useFocusEffect(
    useCallback(() => {
      dispatch(refreshLedgerRange());
      // The effect below loads on mount; later focuses reload here.
      if (isFirstFocus.current) { isFirstFocus.current = false; return; }
      void reload();
    }, [dispatch, reload]),
  );

  useEffect(() => {
    if (partyType) return;
    dispatch(fetchGeneralLedger({ range: state.range, account: state.account }));
  }, [dispatch, partyType, state.range.startDate, state.range.endDate, state.account]);

  useEffect(() => {
    if (partyType) void loadParty();
  }, [partyType, loadParty]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  // Newest first by default: the latest postings are what people check.
  const [newestFirst, setNewestFirst] = useState(true);

  const { ledger: accountLedger, accounts } = state;
  // The report on screen: the account ledger, or the party one.
  const ledger: { entries: LedgerEntry[]; totals: { debit: number; credit: number } } | null =
    partyType ? party.report : accountLedger;
  const isLoading = partyType ? party.loading : state.isLoading;
  const error = partyType ? party.error : state.error;

  // The most recent lines, never the oldest — see ledgerRows.ts for why that
  // distinction cost a week of apparently missing accounts.
  // The table draws a bounded window (a plain ScrollView), but every line is
  // reachable: "Show earlier lines" widens it a thousand at a time. A new
  // ledger (period, refresh) starts from the most recent window again.
  const [widened, setWidened] = useState<{ ledger: unknown; cap: number }>({ ledger: null, cap: ROW_CAP });
  const cap = widened.ledger === ledger ? widened.cap : ROW_CAP;
  const { rows, hiddenCount } = useMemo(
    () => visibleLedgerRows(ledger ? ledger.entries : [], cap),
    [ledger, cap],
  );

  /** Where a party line opens: its document, or else its journal entry. */
  const openPartyLine = useCallback((e: PartyLedgerEntry): (() => void) | undefined => {
    if (e.documentId && e.documentType === 'invoice') return () => navigation.navigate('InvoiceDetail', { invoiceId: e.documentId! });
    if (e.documentId && e.documentType === 'bill') return () => navigation.navigate('BillDetail', { billId: e.documentId! });
    if (e.documentId && e.documentType === 'credit_memo') return () => navigation.navigate('CreditMemoDetail', { creditMemoId: e.documentId! });
    if (e.documentId && e.documentType === 'vendor_credit') return () => navigation.navigate('VendorCreditDetail', { vendorCreditId: e.documentId! });
    if (e.sourceId) return () => navigation.navigate('JournalEntryDetail', { entryId: e.sourceId });
    return undefined;
  }, [navigation]);

  const groups: TableGroup[] = useMemo(() => {
    if (partyType) {
      const report = party.report;
      const opening = new Map((report?.openingBalances ?? []).map(b => [b.partyId, b.balance]));
      const closing = new Map((report?.closingBalances ?? []).map(b => [b.partyId, b.balance]));
      return groupByParty(rows as PartyLedgerEntry[]).map(g => ({
        key: g.id,
        heading: g.heading,
        opening: opening.get(g.id),
        closing: closing.get(g.id) ?? g.rows[g.rows.length - 1]?.balance ?? 0,
        rows: g.rows.map((e, i) => ({
          key: `${e.sourceId}-${e.accountCode}-${i}`,
          date: e.date,
          postedAt: e.postedAt,
          title: `${[e.label, e.documentNumber].filter(Boolean).join(' ')}${e.voided ? '  · Voided' : ''}`,
          caption: `${e.accountCode} ${e.accountName} · ${e.reference}`,
          debit: e.debit,
          credit: e.credit,
          balance: e.balance,
          open: openPartyLine(e),
        })),
      }));
    }
    const opening = new Map((accountLedger?.openingBalances ?? []).map(b => [b.accountCode, b.balance]));
    const closing = new Map((accountLedger?.closingBalances ?? []).map(b => [b.accountCode, b.balance]));
    return groupByAccount(rows).map(g => ({
      key: g.code,
      heading: `${g.code} — ${g.name}`,
      opening: opening.get(g.code),
      // The API's own closing balance (or its balance on the account's last
      // chronological entry) — never a running balance recomputed here.
      closing: closing.get(g.code) ?? g.rows[g.rows.length - 1]?.balance ?? 0,
      rows: g.rows.map((e, i) => ({
        key: `${e.sourceId}-${e.accountCode}-${i}`,
        date: e.date,
        postedAt: e.postedAt,
        title: `${e.reference}${e.voided ? '  · Voided' : ''}`,
        caption: e.memo,
        debit: e.debit,
        credit: e.credit,
        balance: e.balance,
        // Every account line reads from a journal entry — the drill-through.
        open: e.sourceId ? () => navigation.navigate('JournalEntryDetail', { entryId: e.sourceId }) : undefined,
      })),
    }));
  }, [partyType, party.report, accountLedger, rows, navigation, openPartyLine]);

  // The picker for a customer or vendor: every one, found by ID or name.
  const partyOptions = useMemo(() => {
    const options = [
      { label: view === 'vendors' ? 'All vendors' : 'All customers', value: '' },
      ...(party.parties?.parties ?? []).map(p => ({
        label: `${partyLabel(p.partyCode, p.partyName)} — ${rs(p.closing)}`,
        value: p.partyId,
      })),
    ];
    const named = party.report?.party;
    if (partyId && named?.id === partyId && !options.some(o => o.value === partyId)) {
      options.push({ label: partyLabel(named.code, named.name ?? ''), value: partyId });
    }
    return options;
  }, [party.parties, party.report, partyId, view]);
  const selected = party.report?.party.id === partyId ? party.report.party : null;
  const noun = view === 'vendors' ? 'vendor' : 'customer';
  const control = partyType && !partyId ? party.report?.control : null;

  // Ledger rule: amounts are shown COMPLETE at full size. The Debit/Credit
  // columns are sized to the longest amount in the data; on narrow screens
  // the table pans horizontally instead of shrinking the figures.
  const valW = useMemo(() => {
    if (!ledger) return 96;
    const formatted = rows
      .flatMap(e => [e.debit ? rs(e.debit) : '', e.credit ? rs(e.credit) : '', rs(e.balance)])
      .concat([rs(ledger.totals.debit), rs(ledger.totals.credit)]);
    return amountColWidth(formatted);
  }, [ledger, rows]);

  return (
    <ReportContainer>
      <ReportHeader
        title="General Ledger"
        subtitle={
          !partyType
            ? 'Chronological account activity'
            : selected
              ? `${partyLabel(selected.code, selected.name ?? '')} · ${noun} ledger`
              : `Every ${noun}'s postings`
        }
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={reportContentStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} />}
      >
        <Card>
          <View style={styles.filterRow}>
            <DateField label="From" value={state.range.startDate}
              onChangeText={t => dispatch(setLedgerRange({ ...state.range, startDate: t }))} />
            <DateField label="To" value={state.range.endDate}
              onChangeText={t => dispatch(setLedgerRange({ ...state.range, endDate: t }))} />
          </View>
        </Card>

        <Card>
          <Segmented
            options={VIEW_LABELS}
            activeIndex={VIEWS.indexOf(view)}
            onChange={i => { setView(VIEWS[i]); setPartyId(''); }}
          />
          {partyType && (
            <View style={styles.partyPicker}>
              <CustomDropdown
                label={view === 'vendors' ? 'Vendor' : 'Customer'}
                options={partyOptions}
                value={partyId}
                onChange={setPartyId}
                placeholder={view === 'vendors' ? 'All vendors' : 'All customers'}
                searchable
              />
            </View>
          )}
        </Card>

        {isLoading && !ledger && <LoadingBlock label="Loading ledger…" />}
        {!!error && <ErrorBlock message={error} onRetry={() => void reload()} />}

        {ledger && !error && (
          <RefreshFade busy={isLoading}>
            <ReportTitleBlock
              company={company}
              report="General Ledger"
              periodLabel={rangeLabel(state.range.startDate, state.range.endDate)}
            />

            <FigureStrip items={[
              { label: 'Total debits', value: rs(ledger.totals.debit), caption: 'In the period' },
              { label: 'Total credits', value: rs(ledger.totals.credit), caption: 'In the period' },
            ]} />

            {/* Account filter chips */}
            {!partyType && accounts && accounts.accounts.length > 0 && (
              <SectionCard title="Accounts" subtitle="Tap to filter the ledger" icon="folder">
                <View style={styles.chipsRow}>
                  <Chip label="All" active={!state.account} onPress={() => dispatch(setLedgerAccount(null))} />
                  {accounts.accounts.map(a => (
                    <Chip key={a.accountCode} label={`${a.accountCode} ${a.accountName.split(' ')[0]}`}
                      active={state.account === a.accountCode}
                      onPress={() => dispatch(setLedgerAccount(a.accountCode))} />
                  ))}
                </View>
                {accounts.accounts.map(a => (
                  <View key={a.accountCode} style={styles.acctRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.acctName}>{a.accountName}</Text>
                      <Text style={styles.acctCode}>{a.accountCode} · {a.entries} entries</Text>
                    </View>
                    <Text style={styles.acctBal}>{rs(a.balance)}</Text>
                  </View>
                ))}
              </SectionCard>
            )}

            <SectionCard
              title="Ledger Entries"
              subtitle={
                partyType
                  ? selected
                    ? partyLabel(selected.code, selected.name ?? '')
                    : view === 'vendors' ? 'All vendors' : 'All customers'
                  : state.account ? `Account ${state.account}` : 'All accounts'
              }
              icon="list"
            >
              {rows.length === 0 && (
                <EmptyBlock
                  title={partyId ? `Nothing posted for this ${noun} in the period.` : 'No ledger activity for this period.'}
                />
              )}

              {rows.length > 0 && (
                <View style={styles.chipsRow}>
                  <Chip label="Newest first" active={newestFirst} onPress={() => setNewestFirst(true)} />
                  <Chip label="Oldest first" active={!newestFirst} onPress={() => setNewestFirst(false)} />
                </View>
              )}

              {/* Truncation has to announce itself. The old cap cut the newest
                  rows away in silence, which is indistinguishable from the
                  ledger having stopped. */}
              {hiddenCount > 0 && (
                <View style={styles.truncationNotice}>
                  <Text style={styles.truncationText}>
                    Showing the most recent {rows.length.toLocaleString()} of{' '}
                    {ledger.entries.length.toLocaleString()} lines.
                  </Text>
                  <TouchableOpacity onPress={() => setWidened({ ledger, cap: cap + ROW_CAP })} activeOpacity={0.7}>
                    <Text style={styles.truncationAction}>
                      Show {Math.min(hiddenCount, ROW_CAP).toLocaleString()} earlier{' '}
                      {Math.min(hiddenCount, ROW_CAP) === 1 ? 'line' : 'lines'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {rows.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableScroll}>
                  <View style={styles.table}>
                    <View style={styles.headRow}>
                      <Text style={[styles.colDate, styles.headText]}>Date</Text>
                      <Text style={[styles.colAcct, styles.headText]}>Ref / Memo</Text>
                      <Text style={[{ width: valW }, styles.colVal, styles.headText]}>Debit</Text>
                      <Text style={[{ width: valW }, styles.colVal, styles.headText]}>Credit</Text>
                      <Text style={[{ width: valW }, styles.colVal, styles.headText]}>Balance</Text>
                    </View>

                    {groups.map(group => {
                      // Display sums of exactly the rows above them.
                      const debit = group.rows.reduce((t, e) => t + (e.debit || 0), 0);
                      const credit = group.rows.reduce((t, e) => t + (e.credit || 0), 0);
                      const openingRow = group.opening !== undefined && hiddenCount === 0 ? (
                        <View style={styles.bodyRow}>
                          <Text style={[styles.colDate, styles.refText]} />
                          <Text style={[styles.colAcct, styles.refText]}>Opening balance</Text>
                          <Text style={[{ width: valW }, styles.colVal, styles.refText]} />
                          <Text style={[{ width: valW }, styles.colVal, styles.refText]} />
                          <Text style={[{ width: valW }, styles.colVal, styles.bodyText]}>{rs(group.opening)}</Text>
                        </View>
                      ) : null;
                      return (
                        <View key={group.key}>
                          <View style={styles.groupHead}>
                            <Text style={styles.groupHeadText} numberOfLines={1}>{group.heading}</Text>
                          </View>

                          {!newestFirst && openingRow}
                          {displayOrder(group.rows, newestFirst).map(e => (
                            <TouchableOpacity
                              key={e.key}
                              style={styles.bodyRow}
                              onPress={e.open}
                              disabled={!e.open}
                              activeOpacity={0.6}
                            >
                              <View style={styles.colDate}>
                                <Text style={styles.bodyText}>{fmtLedgerDate(e.date)}</Text>
                                <Text style={styles.refText}>{fmtLedgerTime(e.postedAt)}</Text>
                              </View>
                              <View style={styles.colAcct}>
                                <Text style={styles.bodyText} numberOfLines={1}>{e.title}</Text>
                                {!!e.caption && <Text style={styles.refText} numberOfLines={1}>{e.caption}</Text>}
                              </View>
                              <Text style={[{ width: valW }, styles.colVal, styles.bodyText]}>{e.debit ? rs(e.debit) : '—'}</Text>
                              <Text style={[{ width: valW }, styles.colVal, styles.bodyText]}>{e.credit ? rs(e.credit) : '—'}</Text>
                              <Text style={[{ width: valW }, styles.colVal, styles.bodyText]}>{rs(e.balance)}</Text>
                            </TouchableOpacity>
                          ))}
                          {newestFirst && openingRow}

                          <View style={styles.groupTotalRow}>
                            <Text style={[styles.colDate, styles.groupTotalText]} />
                            <Text style={[styles.colAcct, styles.groupTotalText]} numberOfLines={1}>
                              Total for {group.heading}
                            </Text>
                            <Text style={[{ width: valW }, styles.colVal, styles.groupTotalText]}>{rs(debit)}</Text>
                            <Text style={[{ width: valW }, styles.colVal, styles.groupTotalText]}>{rs(credit)}</Text>
                            <Text style={[{ width: valW }, styles.colVal, styles.groupTotalText]}>{rs(group.closing)}</Text>
                          </View>
                        </View>
                      );
                    })}

                    {/* These come from the server and cover the WHOLE period,
                        so when rows are capped they deliberately do not foot to
                        what is above them. Say which it is rather than letting
                        the mismatch look like an arithmetic error. */}
                    <View style={styles.totalRow}>
                      <Text style={[styles.colDate, styles.totalText]}>Total</Text>
                      <Text style={[styles.colAcct, styles.totalText]} numberOfLines={1}>
                        {hiddenCount > 0 ? 'for the whole period, including lines not shown' : ''}
                      </Text>
                      <Text style={[{ width: valW }, styles.colVal, styles.totalText]}>{rs(ledger.totals.debit)}</Text>
                      <Text style={[{ width: valW }, styles.colVal, styles.totalText]}>{rs(ledger.totals.credit)}</Text>
                      <Text style={[{ width: valW }, styles.colVal, styles.totalText]} />
                    </View>
                  </View>
                </ScrollView>
              )}
            </SectionCard>

            {partyType && (
              <Text style={styles.footnote}>
                {partyType === 'customer'
                  ? 'Balance is what the customer owes, carried forward from before the period; below zero is credit in their favour. Tap a line to open its document.'
                  : 'Balance is debit-positive like every account here: below zero is what you owe the vendor. Tap a line to open its document.'}
              </Text>
            )}
            {control && (
              <Text style={styles.footnote}>
                {Math.abs(control.unlinked) < 0.005
                  ? `Every ${noun}'s balance adds up to ${control.accounts.map(a => `${a.code} ${a.name}`).join(' and ')}: ${rs(control.balance)}.`
                  : `${rs(control.unlinked)} on ${control.accounts.map(a => a.code).join(' and ')} belongs to no ${noun} — posted straight to the account by a journal entry. See the Accounts view.`}
              </Text>
            )}
          </RefreshFade>
        )}
      </ScrollView>
    </ReportContainer>
  );
};

const Chip: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: THEME.spacing.sm },
  partyPicker: { marginTop: THEME.spacing.md },
  footnote: { ...THEME.typography.caption, color: THEME.colors.textTertiary, marginTop: THEME.spacing.sm, marginHorizontal: THEME.spacing.xs },
  truncationNotice: {
    backgroundColor: THEME.colors.warning + '14',
    borderWidth: 1,
    borderColor: THEME.colors.warning + '33',
    borderRadius: THEME.radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  truncationText: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  truncationAction: { ...THEME.typography.labelSm, color: THEME.colors.primary, marginTop: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 16, backgroundColor: THEME.colors.neutral100, borderWidth: 1, borderColor: THEME.colors.border },
  chipActive: { backgroundColor: THEME.colors.primary + '18', borderColor: THEME.colors.primary },
  chipText: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  chipTextActive: { color: THEME.colors.primary, fontWeight: typography.labelLg.fontWeight },
  acctRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight },
  acctName: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: typography.labelLg.fontWeight },
  acctCode: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  acctBal: { ...THEME.typography.labelMd, color: THEME.colors.textPrimary, flexShrink: 0, marginLeft: 10 },
  headRow: { gap: 10, flexDirection: 'row', paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: THEME.colors.border },
  headText: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  bodyRow: { gap: 10, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.borderLight },
  bodyText: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary },
  refText: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary },
  colDate: { width: 96, flexShrink: 0 },
  tableScroll: { minWidth: '100%' },
  table: { flex: 1, minWidth: '100%' },
  colAcct: { flex: 1, minWidth: 190 },
  colVal: { textAlign: 'right', flexShrink: 0 },
  groupHead: { paddingTop: 14, paddingBottom: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.border },
  groupHeadText: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: typography.labelLg.fontWeight },
  groupTotalRow: { gap: 10, flexDirection: 'row', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: THEME.colors.border },
  groupTotalText: { ...THEME.typography.labelSm, color: THEME.colors.textSecondary, fontWeight: typography.labelLg.fontWeight },
  totalRow: { gap: 10, flexDirection: 'row', paddingVertical: 10, marginTop: 2, borderTopWidth: 2, borderTopColor: THEME.colors.border },
  totalText: { ...THEME.typography.bodySm, color: THEME.colors.textPrimary, fontWeight: typography.labelLg.fontWeight }
});

export default GeneralLedgerScreen;
