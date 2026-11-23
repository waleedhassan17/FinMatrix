// ═══════════════════════════════════════════════════════
// FinMatrix — Day Summary
// ═══════════════════════════════════════════════════════
// What the business did on one day, at a glance: counts and totals of every
// document created, money in and out by method, who bought, what sold, who
// entered what, and what an owner should look at. Staff get the same screen
// limited to what they prepared themselves ("My day").
//
// Step days with the arrows, the calendar, or a swipe across the screen.
// Registered on the Dashboard and Reports stacks; a `date` param (from the
// end-of-day notification) opens that day.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Share, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';

import { THEME } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { useIsOwner } from '../../../hooks/useCapability';
import { useCompanyInfo } from '../../../utils/companyInfo';
import { compactMoney } from '../../../models/itemExplorerModel';
import { toIsoDate } from '../../../models/reportModel';
import {
  ReportContainer,
  ReportHeader,
  HeaderIconButton,
  Card,
  SectionCard,
  DateField,
  Segmented,
  FilterChip,
  ReportSkeleton,
  ErrorBlock,
  EmptyBlock,
  reportContentStyle,
  nearEnd,
} from '../../../components/reports/ReportUI';
import RankedBars from '../shared/RankedBars';
import { useAdoptParam } from '../shared/useAdoptParam';
import { useShareReportPdf } from '../shared/useShareReportPdf';
import { itemSheetDoc, itemShareLines, sheetPeriodLabel } from '../../../models/dayItemSheetModel';
import {
  COMPARE_KEYS,
  compareLabel,
  dayLabel,
  dayReportDoc,
  dayShareText,
  relativeDayName,
  shiftDay,
  zoneLabel,
  type DayEntry,
  type DayEntryFilter,
  type DayEntryTarget,
} from '../../../models/daySummaryModel';
import { dayEntriesSerializer } from '../../../serializers/daySummarySerializer';
import { getDayEntriesAPI } from '../../../networks/reports/daySummaryNetwork';
import {
  fetchDayEntries,
  fetchDayItems,
  fetchDaySchedule,
  fetchDaySummary,
  openDay,
  refreshDayDate,
  saveDaySchedule,
  selectDaySummaryState,
  setDayCompare,
  setDayCreatedBy,
  setDayDate,
  setDayFilter,
  setDayQuery,
  setItemGroupBy,
  setItemQuery,
  setItemSort,
  setSheetMode,
  setSheetRange,
} from './daySummarySlice';
import DayHeadline from './DayHeadline';
import { AttentionCard, DocumentGrid, MoneyCard, ProfitCard, PurchasingCard, ReorderCard, TeamCard } from './DayPanels';
import ItemSalesCard from './ItemSalesCard';
import DayBookList from './DayBookList';
import HourlyActivity from './HourlyActivity';
import DigestSheet from './DigestSheet';

const { colors, radius, spacing, typography } = THEME;

type Params = { DaySummary: { date?: string } | undefined };
type Nav = NativeStackNavigationProp<Record<string, object | undefined>>;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** The day's PDF lists at most this many Day Book rows, and says so when there are more. */
const PDF_ROW_CAP = 500;

const DaySummaryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<Params, 'DaySummary'>>();
  const dispatch = useAppDispatch();
  const st = useAppSelector(selectDaySummaryState);
  const isOwner = useIsOwner();
  const company = useCompanyInfo();
  const pdf = useShareReportPdf();
  const [digestOpen, setDigestOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const bookY = useRef(0);

  const handed = route.params?.date && ISO.test(route.params.date) ? route.params.date : null;
  const ready = useAdoptParam(handed, st.date, () => {
    if (handed) dispatch(openDay(handed));
  });

  // Back to today each time the screen opens, unless a day was chosen.
  useFocusEffect(
    useCallback(() => {
      if (!handed) dispatch(refreshDayDate());
    }, [dispatch, handed]),
  );

  const createdBy = isOwner ? st.createdBy : null;
  // Item-wise sales: the day on screen, or a range of its own.
  const [sheetFrom, sheetTo] =
    st.sheetMode === 'range' && st.sheetFrom ? [st.sheetFrom, st.sheetTo] : [st.date, st.date];
  const itemCompare = st.compare === 'yesterday' ? 'previous' : 'lastWeek';
  const loadItems = useCallback(
    () => dispatch(fetchDayItems({ from: sheetFrom, to: sheetTo, createdBy, compare: itemCompare })),
    [dispatch, sheetFrom, sheetTo, createdBy, itemCompare],
  );
  const load = useCallback(
    () =>
      Promise.all([
        dispatch(fetchDaySummary({ date: st.date, createdBy })),
        dispatch(fetchDayEntries({ date: st.date, createdBy, filter: st.filter, query: st.query, page: 1 })),
        loadItems(),
      ]),
    [dispatch, st.date, st.filter, st.query, createdBy, loadItems],
  );

  useEffect(() => {
    if (!ready(st.date)) return;
    loadItems();
  }, [ready, st.date, loadItems]);

  useEffect(() => {
    if (!ready(st.date)) return;
    dispatch(fetchDaySummary({ date: st.date, createdBy }));
  }, [dispatch, ready, st.date, createdBy]);

  useEffect(() => {
    if (!ready(st.date)) return;
    dispatch(fetchDayEntries({ date: st.date, createdBy, filter: st.filter, query: st.query, page: 1 }));
  }, [dispatch, ready, st.date, st.filter, st.query, createdBy]);

  // The next page of the Day Book, when there is one and none is on its way.
  // Scrolling to the bottom asks for it by itself, so a phone never needs a
  // pager: the list simply carries on.
  const loadMore = useCallback(() => {
    if (st.entriesLoading || st.entriesLoadingMore || st.entries.length >= st.entriesTotal) return;
    dispatch(
      fetchDayEntries({ date: st.date, createdBy, filter: st.filter, query: st.query, page: st.entriesPage + 1 }),
    );
  }, [dispatch, st.date, st.filter, st.query, st.entries.length, st.entriesTotal, st.entriesPage, st.entriesLoading, st.entriesLoadingMore, createdBy]);
  const onSearch = useCallback((q: string) => dispatch(setDayQuery(q)), [dispatch]);

  useEffect(() => {
    if (isOwner) dispatch(fetchDaySchedule());
  }, [dispatch, isOwner]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const s = st.summary;
  const today = s?.today || toIsoDate(new Date());
  const atLatest = st.date >= today;
  const goTo = useCallback((d: string) => dispatch(setDayDate(d > today ? today : d)), [dispatch, today]);

  // A swipe across the screen steps a day: right for the day before, left for
  // the day after. Vertical scrolling is untouched — a fling is horizontal.
  const swipe = Gesture.Race(
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .runOnJS(true)
      .onEnd(() => goTo(shiftDay(st.date, -1))),
    Gesture.Fling()
      .direction(Directions.LEFT)
      .runOnJS(true)
      .onEnd(() => {
        if (!atLatest) goTo(shiftDay(st.date, 1));
      }),
  );

  const setFilter = (f: DayEntryFilter) => dispatch(setDayFilter(f));
  // A document tile (or an attention line) narrows the Day Book — and shows it.
  const filterAndShow = (f: DayEntryFilter) => {
    setFilter(f);
    if (f !== 'all') requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(bookY.current - 8, 0), animated: true }));
  };
  const open = (t: DayEntryTarget) => navigation.navigate(t.screen, t.params);
  // Purchase orders live on the Transactions tab.
  const openPurchaseOrders = () =>
    (navigation as unknown as { navigate: (n: string, p: object) => void }).navigate('TransactionsStack', { screen: 'POList', initial: false });

  /**
   * The day as a PDF: every Day Book row of the view (up to PDF_ROW_CAP, and
   * it says so past that), and the item-wise sheet when it covers the day.
   */
  const sharePdf = async () => {
    if (!s) return;
    setPdfBusy(true);
    try {
      const rows: DayEntry[] = [];
      let total = 0;
      for (let page = 1; rows.length < PDF_ROW_CAP; page++) {
        const p = dayEntriesSerializer(
          await getDayEntriesAPI({
            date: st.date,
            type: st.filter,
            createdBy,
            q: st.query,
            page,
            limit: 100,
          }),
        );
        total = p.total;
        rows.push(...p.items);
        if (p.items.length === 0 || rows.length >= p.total) break;
      }
      const sheetForDay = st.items && st.items.from === st.date && st.items.to === st.date ? st.items : null;
      // The sheet in the day's two columns: net units, then net sales.
      const sheetDoc = sheetForDay
        ? itemSheetDoc(sheetForDay, { groupBy: st.itemGroupBy, sort: st.itemSort, q: st.itemQuery }, company.name)
        : null;
      const unitsAt = sheetDoc ? sheetDoc.columns.indexOf('Net units') : -1;
      const salesAt = sheetDoc ? sheetDoc.columns.indexOf('Net sales') : -1;
      const sheetRows = sheetDoc
        ? sheetDoc.rows.map(r => ({
            ...r,
            values: [unitsAt >= 0 ? (r.values[unitsAt] ?? null) : null, salesAt >= 0 ? (r.values[salesAt] ?? null) : null],
          }))
        : [];
      await pdf.share(
        dayReportDoc(s, rows.slice(0, PDF_ROW_CAP), {
          compare: st.compare,
          entryTotal: total,
          extraRows: sheetRows.length
            ? [{ label: 'Item-wise sales (net sales)', kind: 'heading', values: [null, null] }, ...sheetRows]
            : [],
        }),
      );
    } catch {
      Alert.alert('Could not make the PDF', 'Check the connection and try again.');
    } finally {
      setPdfBusy(false);
    }
  };

  const shareText = async () => {
    if (!s) return;
    // The day's top product groups ride along when the sheet covers that day.
    const sheetForDay = st.items && st.items.from === st.date && st.items.to === st.date ? st.items : null;
    const extra = sheetForDay ? itemShareLines(sheetForDay, st.itemGroupBy) : [];
    const message = [dayShareText(s, company.name), ...(extra.length ? ['', ...extra] : [])].join('\n');
    if (Platform.OS === 'web') {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
      return;
    }
    try {
      await Share.share({ message });
    } catch {
      Alert.alert('Could not share', 'The summary could not be shared. Try again.');
    }
  };

  const ownOnly = s?.scope.ownOnly ?? !isOwner;
  const who = s?.scope.createdBy;
  const title = ownOnly ? 'My day' : 'Day Summary';
  const kinds = new Set(s?.kinds ?? []);
  // A failed refresh of the day on screen keeps its figures, and says so.
  const refreshFailed = !!s && !!st.error && !st.isLoading;
  const reorderPeriod = st.items
    ? st.items.from === st.items.to
      ? `on ${dayLabel(st.items.from)}`
      : `in ${sheetPeriodLabel(st.items.from, st.items.to)}`
    : '';

  return (
    <ReportContainer>
      <ReportHeader
        title={title}
        subtitle={who && !ownOnly ? `Entered by ${who.name}` : dayLabel(st.date)}
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.headerActions}>
            <HeaderIconButton icon="message-circle" accessibilityLabel="Share the summary as text" onPress={shareText} disabled={!s} />
            <HeaderIconButton
              icon="share-2"
              accessibilityLabel="Share as PDF"
              onPress={sharePdf}
              disabled={!s || pdf.busy || pdfBusy}
            />
            {isOwner ? (
              <HeaderIconButton icon="bell" accessibilityLabel="Daily summary settings" onPress={() => setDigestOpen(true)} />
            ) : null}
          </View>
        }
      />

      <ScrollView
          ref={scrollRef}
          contentContainerStyle={reportContentStyle}
          showsVerticalScrollIndicator={false}
          onScroll={nearEnd(loadMore)}
          scrollEventThrottle={250}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
        >
          {/* ── The day — swipe it to step a day (only here, so a swipe never
               fights the sideways lists further down) ─────────────── */}
          <GestureDetector gesture={swipe}>
          <Card padded={false}>
            <View style={styles.stepper}>
              <TouchableOpacity
                onPress={() => goTo(shiftDay(st.date, -1))}
                style={styles.arrow}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Previous day"
              >
                <Feather name="chevron-left" size={20} color={colors.primary} />
              </TouchableOpacity>
              <View style={styles.dayCol}>
                <Text style={styles.dayName}>{relativeDayName(st.date, today)}</Text>
                <DateField value={st.date} onChange={goTo} maximumDate={new Date()} style={styles.dateField} />
              </View>
              <TouchableOpacity
                onPress={() => goTo(shiftDay(st.date, 1))}
                style={[styles.arrow, atLatest && styles.arrowOff]}
                disabled={atLatest}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Next day"
                accessibilityState={{ disabled: atLatest }}
              >
                <Feather name="chevron-right" size={20} color={atLatest ? colors.textDisabled : colors.primary} />
              </TouchableOpacity>
            </View>
            {!atLatest ? (
              <TouchableOpacity onPress={() => goTo(today)} style={styles.todayLink} accessibilityRole="button">
                <Feather name="corner-up-right" size={13} color={colors.primary} />
                <Text style={styles.todayText}>Back to today</Text>
              </TouchableOpacity>
            ) : null}
          </Card>
          </GestureDetector>

          <Segmented
            accessibilityLabel="Compare with"
            options={['vs day before', 'vs last week']}
            activeIndex={COMPARE_KEYS.indexOf(st.compare)}
            onChange={i => dispatch(setDayCompare(COMPARE_KEYS[i]))}
          />

          {/* An owner's people row: its room is kept while the day loads, so the
              screen does not jump when it arrives. */}
          {isOwner && !s && st.isLoading ? <View style={styles.peoplePlaceholder} /> : null}
          {isOwner && s?.members && s.members.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
              <FilterChip label="Everyone" icon="users" active={!st.createdBy} onPress={() => dispatch(setDayCreatedBy(null))} />
              {s.members.map(m => (
                <FilterChip
                  key={m.id}
                  label={m.role === 'admin' ? `${m.name} (owner)` : m.name}
                  active={st.createdBy === m.id}
                  onPress={() => dispatch(setDayCreatedBy(st.createdBy === m.id ? null : m.id))}
                />
              ))}
            </ScrollView>
          ) : null}

          {!s && st.isLoading ? <ReportSkeleton variant="kpis" /> : null}
          {!s && !!st.error ? <ErrorBlock message={st.error} onRetry={load} /> : null}

          {s ? (
            <View style={[styles.body, st.isLoading && styles.busy]}>
              {refreshFailed ? (
                <View style={styles.refreshFailed} accessibilityRole="alert">
                  <Text style={styles.refreshText}>Couldn’t refresh — these figures may be out of date.</Text>
                  <TouchableOpacity onPress={load} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.retry}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {s.isEmpty ? (
                <Card>
                  <EmptyBlock
                    icon="calendar"
                    title={`Nothing recorded on ${dayLabel(st.date)}`}
                    hint={`No invoices, orders, receipts${kinds.has('purchase_order') ? ', purchase orders' : ''} or bills are dated this day${ownOnly ? ' under your name' : ''}, and nothing was entered for an earlier day.`}
                    actionLabel={st.date === today ? 'New invoice' : 'Previous day'}
                    onAction={
                      st.date === today ? () => navigation.navigate('InvoiceForm') : () => goTo(shiftDay(st.date, -1))
                    }
                  />
                </Card>
              ) : null}

              <DayHeadline summary={s} compare={st.compare} />
              {/* An empty day is one message, not a wall of empty cards. */}
              {s.isEmpty ? null : (
                <>
              <AttentionCard
                summary={s}
                active={st.filter}
                onSelect={filterAndShow}
                onOpenPurchaseOrders={openPurchaseOrders}
              />
              {st.items?.reorder ? (
                <ReorderCard
                  reorder={st.items.reorder}
                  period={reorderPeriod}
                  onOpen={id => navigation.navigate('InventoryDetail', { itemId: id })}
                  onMore={() =>
                    (navigation as unknown as { navigate: (n: string, p?: object) => void }).navigate('InventoryStack')
                  }
                />
              ) : null}
              <HourlyActivity hourly={s.hourly} />
              <DocumentGrid summary={s} active={st.filter} onSelect={filterAndShow} />
              <MoneyCard summary={s} />
              <PurchasingCard
                summary={s}
                onVendor={id => navigation.navigate('VendorDetail', { vendorId: id })}
                onOpenPurchaseOrders={isOwner ? openPurchaseOrders : undefined}
              />
              {s.profit ? <ProfitCard profit={s.profit} /> : null}
                </>
              )}

              {st.itemsUnavailable || (s.isEmpty && st.sheetMode !== 'range') ? null : (
              <ItemSalesCard
                sheet={st.items}
                loading={st.itemsLoading}
                error={st.itemsError}
                onRetry={loadItems}
                mode={st.sheetMode}
                onMode={m => dispatch(setSheetMode(m))}
                from={sheetFrom}
                to={sheetTo}
                onRange={(from, to) => dispatch(setSheetRange({ from, to }))}
                groupBy={st.itemGroupBy}
                onGroupBy={g => dispatch(setItemGroupBy(g))}
                sort={st.itemSort}
                onSort={o => dispatch(setItemSort(o))}
                query={st.itemQuery}
                onSearch={q => dispatch(setItemQuery(q))}
                compareLabel={
                  st.sheetMode === 'range'
                    ? st.compare === 'yesterday'
                      ? 'vs the period before'
                      : 'vs a week earlier'
                    : compareLabel(st.compare)
                }
                onOpenItem={id => navigation.navigate('InventoryDetail', { itemId: id })}
                onSharePdf={() =>
                  pdf.share(
                    st.items
                      ? itemSheetDoc(st.items, { groupBy: st.itemGroupBy, sort: st.itemSort, q: st.itemQuery }, company.name)
                      : null,
                  )
                }
                sharing={pdf.busy}
              />
              )}

              {s.isEmpty ? null : (
                <>
              <SectionCard title="Top customers" icon="award">
                <RankedBars
                  points={s.topCustomers.map(c => ({
                    key: c.id,
                    label: c.name,
                    value: c.total,
                    hint: `${c.count} ${c.count === 1 ? 'invoice' : 'invoices'}`,
                  }))}
                  format={compactMoney}
                  emptyLabel="No sales on this day."
                  onSelect={id => navigation.navigate('CustomerDetail', { customerId: id })}
                  navigates
                />
              </SectionCard>

              <SectionCard title="Best sellers" icon="package">
                <RankedBars
                  points={s.topItems.map((i, n) => ({
                    key: i.itemId ?? `line-${n}`,
                    label: i.name,
                    value: i.total,
                    hint: `${i.quantity.toLocaleString('en-US')} net units`,
                  }))}
                  format={compactMoney}
                  emptyLabel="No items sold on this day."
                  canSelect={key => !key.startsWith('line-')}
                  onSelect={id => navigation.navigate('InventoryDetail', { itemId: id })}
                  navigates
                />
              </SectionCard>

              {s.team ? (
                <TeamCard
                  team={s.team}
                  showOrders={kinds.has('sales_order')}
                  showPurchaseOrders={kinds.has('purchase_order')}
                  onSelect={id => dispatch(setDayCreatedBy(id))}
                />
              ) : null}

              <View onLayout={e => (bookY.current = e.nativeEvent.layout.y)}>
              <DayBookList
                summary={s}
                filter={st.filter}
                onFilter={setFilter}
                entries={st.entries}
                total={st.entriesTotal}
                loading={st.entriesLoading}
                loadingMore={st.entriesLoadingMore}
                error={st.entriesError}
                moreError={st.entriesMoreError}
                query={st.query}
                onSearch={onSearch}
                counted={st.entriesCounted}
                excluded={st.entriesExcluded}
                onRetry={() =>
                  dispatch(fetchDayEntries({ date: st.date, createdBy, filter: st.filter, query: st.query, page: 1 }))
                }
                onMore={loadMore}
                showBy={!ownOnly}
                onOpen={open}
              />
              </View>
                </>
              )}

              <Text style={styles.footnote}>
                Documents count on the day they are dated, so these figures agree with the P&L. Drafts, voids,
                cancelled sales orders and withdrawn purchase orders are listed but not counted. Times are{' '}
                {zoneLabel(s.timezone)}. Swipe the date to change the day.
              </Text>
            </View>
          ) : null}
      </ScrollView>

      {isOwner ? (
        <DigestSheet
          visible={digestOpen}
          onClose={() => setDigestOpen(false)}
          schedule={st.schedule}
          loadError={st.scheduleLoadError}
          onReload={() => dispatch(fetchDaySchedule())}
          saving={st.scheduleSaving}
          error={st.scheduleError}
          onSave={async next => {
            const r = await dispatch(saveDaySchedule(next));
            if (saveDaySchedule.fulfilled.match(r)) setDigestOpen(false);
          }}
        />
      ) : null}
    </ReportContainer>
  );
};

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowOff: { backgroundColor: colors.neutral100 },
  dayCol: { flex: 1, alignItems: 'center', marginHorizontal: spacing.sm },
  dayName: { ...typography.h4, color: colors.textPrimary },
  dateField: { alignSelf: 'stretch', marginTop: spacing.xxs },
  todayLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingBottom: spacing.sm,
  },
  todayText: { ...typography.labelMd, color: colors.primary },
  people: { gap: spacing.xs, paddingVertical: 2 },
  peoplePlaceholder: { height: 36 },
  refreshFailed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.warningLighter,
  },
  refreshText: { ...typography.caption, color: colors.textPrimary, flex: 1 },
  retry: { ...typography.labelMd, color: colors.primary },
  body: { gap: spacing.md },
  busy: { opacity: 0.6 },
  footnote: { ...typography.caption, color: colors.textTertiary },
});

export default DaySummaryScreen;
