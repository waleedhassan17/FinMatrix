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

import React, { useCallback, useEffect, useState } from 'react';
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
import {
  COMPARE_KEYS,
  dayLabel,
  dayReportDoc,
  dayShareText,
  relativeDayName,
  shiftDay,
  type DayEntryFilter,
  type DayEntryTarget,
} from '../../../models/daySummaryModel';
import {
  fetchDayEntries,
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
} from './daySummarySlice';
import DayHeadline from './DayHeadline';
import { AttentionCard, DocumentGrid, MoneyCard, ProfitStrip, TeamCard } from './DayPanels';
import DayBookList from './DayBookList';
import HourlyActivity from './HourlyActivity';
import DigestSheet from './DigestSheet';

const { colors, radius, spacing, typography } = THEME;

type Params = { DaySummary: { date?: string } | undefined };
type Nav = NativeStackNavigationProp<Record<string, object | undefined>>;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

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
  const load = useCallback(
    () =>
      Promise.all([
        dispatch(fetchDaySummary({ date: st.date, createdBy })),
        dispatch(fetchDayEntries({ date: st.date, createdBy, filter: st.filter, query: st.query, page: 1 })),
      ]),
    [dispatch, st.date, st.filter, st.query, createdBy],
  );

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
  const open = (t: DayEntryTarget) => navigation.navigate(t.screen, t.params);

  const shareText = async () => {
    if (!s) return;
    const message = dayShareText(s, company.name);
    if (Platform.OS === 'web') {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
      return;
    }
    try {
      await Share.share({ message });
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : 'The summary could not be shared.');
    }
  };

  const ownOnly = s?.scope.ownOnly ?? !isOwner;
  const who = s?.scope.createdBy;
  const title = ownOnly ? 'My day' : 'Day Summary';
  const kinds = new Set(s?.kinds ?? []);

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
              onPress={() => pdf.share(s ? dayReportDoc(s, st.entries) : null)}
              disabled={!s || pdf.busy}
            />
            {isOwner ? (
              <HeaderIconButton icon="bell" accessibilityLabel="Daily summary settings" onPress={() => setDigestOpen(true)} />
            ) : null}
          </View>
        }
      />

      <GestureDetector gesture={swipe}>
        <ScrollView
          contentContainerStyle={reportContentStyle}
          showsVerticalScrollIndicator={false}
          onScroll={nearEnd(loadMore)}
          scrollEventThrottle={250}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
        >
          {/* ── The day ─────────────────────────────── */}
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

          <Segmented
            options={['vs day before', 'vs last week']}
            activeIndex={COMPARE_KEYS.indexOf(st.compare)}
            onChange={i => dispatch(setDayCompare(COMPARE_KEYS[i]))}
          />

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
              {s.isEmpty ? (
                <Card>
                  <EmptyBlock
                    icon="calendar"
                    title={`Nothing recorded on ${dayLabel(st.date)}`}
                    hint={`No invoices, orders, receipts or bills are dated this day${ownOnly ? ' under your name' : ''}.`}
                    actionLabel={st.date === today ? 'New invoice' : undefined}
                    onAction={st.date === today ? () => navigation.navigate('InvoiceForm') : undefined}
                  />
                </Card>
              ) : null}

              <DayHeadline summary={s} compare={st.compare} />
              <AttentionCard summary={s} active={st.filter} onSelect={setFilter} />
              <HourlyActivity hourly={s.hourly} />
              <DocumentGrid summary={s} active={st.filter} onSelect={setFilter} />
              <MoneyCard summary={s} />
              {s.profit ? <ProfitStrip profit={s.profit} /> : null}

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
                    hint: `${i.quantity.toLocaleString('en-US')} sold`,
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
                  onSelect={id => dispatch(setDayCreatedBy(id))}
                />
              ) : null}

              <DayBookList
                summary={s}
                filter={st.filter}
                onFilter={setFilter}
                entries={st.entries}
                total={st.entriesTotal}
                loading={st.entriesLoading}
                loadingMore={st.entriesLoadingMore}
                error={st.entriesError}
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

              <Text style={styles.footnote}>
                Documents count on the day they are dated, so these figures agree with the P&L. Drafts, voids and
                cancelled orders are listed but not counted. Swipe left or right to change the day.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </GestureDetector>

      {isOwner ? (
        <DigestSheet
          visible={digestOpen}
          onClose={() => setDigestOpen(false)}
          schedule={st.schedule}
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
  body: { gap: spacing.md },
  busy: { opacity: 0.6 },
  footnote: { ...typography.caption, color: colors.textTertiary },
});

export default DaySummaryScreen;
