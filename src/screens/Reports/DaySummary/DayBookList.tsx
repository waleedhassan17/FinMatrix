// ═══════════════════════════════════════════════════════
// FinMatrix — Day Summary · Day Book
// ═══════════════════════════════════════════════════════
// Every document of the day, newest first. A row the totals leave out (a
// draft, a void, a cancelled order) says so instead of disappearing: the
// reader sees everything entered, and which of it counts.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME, statusStyle } from '../../../theme';
import { SectionCard, LoadMoreFooter, ErrorBlock, ReportSkeleton } from '../../../components/reports/ReportUI';
import {
  KIND_META,
  dayMoney,
  dayShortLabel,
  entryTarget,
  entryTime,
  filterLabel,
  type DayEntry,
  type DayEntryFilter,
  type DayEntryTarget,
  type DaySummary,
  dayBookChips,
} from '../../../models/daySummaryModel';

const { colors, radius, spacing, typography } = THEME;

const statusText = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

export const DayBookRow: React.FC<{
  entry: DayEntry;
  showBy: boolean;
  voids: boolean;
  /** The company's zone: entry times are on its clock, not the phone's. */
  timeZone?: string;
  onOpen: (target: DayEntryTarget) => void;
}> = ({ entry: e, showBy, voids, timeZone, onOpen }) => {
  const target = entryTarget(e);
  const struck = !e.counted && !voids;
  const tone = e.status ? statusStyle(e.status) : null;
  return (
    <TouchableOpacity
      style={styles.row}
      disabled={!target}
      onPress={() => target && onOpen(target)}
      activeOpacity={0.7}
      accessibilityRole={target ? 'button' : undefined}
      accessibilityLabel={`${KIND_META[e.kind].one} ${e.number ?? ''}, ${e.partyName ?? ''}, ${dayMoney(e.amount)}${
        e.status ? `, ${statusText(e.status)}` : ''
      }`}
    >
      <View style={styles.icon}>
        <Feather name={KIND_META[e.kind].icon as keyof typeof Feather.glyphMap} size={15} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <View style={styles.line}>
          <Text style={[styles.number, !target && styles.numberPlain]} numberOfLines={1}>
            {e.number ?? KIND_META[e.kind].one}
          </Text>
          <Text style={[styles.amount, struck && styles.struck]} numberOfLines={1}>
            {dayMoney(e.amount)}
          </Text>
        </View>
        <Text style={styles.party} numberOfLines={1}>
          {KIND_META[e.kind].label} · {e.partyName ?? '—'}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {entryTime(e.createdAt, timeZone)}
            {showBy && e.createdBy ? ` · ${e.createdBy.name}` : ''}
          </Text>
          {e.backdated ? <Text style={styles.backdated}>dated {dayShortLabel(e.date)}</Text> : null}
          {e.status && tone ? (
            <View style={[styles.badge, { backgroundColor: tone.bg }]}>
              <Text style={[styles.badgeText, { color: tone.fg }]}>{statusText(e.status)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

/** How long typing pauses before the search runs. */
const SEARCH_DELAY_MS = 300;

/**
 * The Day Book's search: typing is local, and the search runs once it
 * pauses. A search changed elsewhere (a new day) replaces what is typed.
 */
const DayBookSearch: React.FC<{ query: string; onSearch: (q: string) => void }> = ({ query, onSearch }) => {
  const [draft, setDraft] = useState(query);
  const [seen, setSeen] = useState(query);
  if (query !== seen) {
    setSeen(query);
    if (query !== draft.trim()) setDraft(query);
  }
  useEffect(() => {
    const next = draft.trim();
    if (next === query) return undefined;
    const t = setTimeout(() => onSearch(next), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [draft, query, onSearch]);
  return (
    <View style={styles.search}>
      <Feather name="search" size={15} color={colors.textTertiary} />
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Search number or party"
        placeholderTextColor={colors.textTertiary}
        style={styles.searchInput}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Search the Day Book by document number or party"
      />
      {draft ? (
        <TouchableOpacity onPress={() => setDraft('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Clear search">
          <Feather name="x-circle" size={15} color={colors.textTertiary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const DayBookList: React.FC<{
  summary: DaySummary;
  filter: DayEntryFilter;
  onFilter: (f: DayEntryFilter) => void;
  query: string;
  onSearch: (q: string) => void;
  /** What every matching row counts, and leaves out — not just those loaded. */
  counted: number;
  excluded: number;
  entries: DayEntry[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  /** The next page failed; the rows already shown stay. */
  moreError?: string;
  onRetry: () => void;
  onMore: () => void;
  showBy: boolean;
  onOpen: (target: DayEntryTarget) => void;
}> = ({
  summary,
  filter,
  onFilter,
  query,
  onSearch,
  counted,
  excluded,
  entries,
  total,
  loading,
  loadingMore,
  error,
  moreError = '',
  onRetry,
  onMore,
  showBy,
  onOpen,
}) => (
  <SectionCard
    title="Day Book"
    icon="book-open"
    subtitle={`${filterLabel(filter)}${query ? ` matching “${query}”` : ''} · ${
      loading ? '…' : `${total.toLocaleString('en-US')} ${total === 1 ? 'entry' : 'entries'}`
    } · newest first`}
  >
    <DayBookSearch query={query} onSearch={onSearch} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {dayBookChips(summary, filter).map(c => {
        const on = c.filter === filter;
        return (
          <TouchableOpacity
            key={c.filter}
            onPress={() => onFilter(c.filter)}
            style={[styles.chip, c.warn && styles.chipWarn, on && (c.warn ? styles.chipWarnOn : styles.chipOn)]}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityHint="Filters the Day Book"
            accessibilityLabel={`${c.label}${c.count !== null ? `, ${c.count}` : ''}`}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
            {c.count !== null ? (
              <Text style={[styles.chipCount, on && styles.chipTextOn]}>{c.count.toLocaleString('en-US')}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
    {loading ? (
      <ReportSkeleton variant="inline" rows={4} />
    ) : error ? (
      <ErrorBlock message={error} onRetry={onRetry} />
    ) : entries.length === 0 ? (
      <Text style={styles.empty}>{query ? `No entries match “${query}”.` : 'Nothing here for this day.'}</Text>
    ) : (
      <>
        <Text style={styles.totals}>
          {filter === 'voided' ? (
            `${dayMoney(excluded)} voided or deleted`
          ) : (
            <>
              <Text style={styles.totalsStrong}>{dayMoney(counted)}</Text> counted
              {excluded > 0 ? ` · ${dayMoney(excluded)} not counted` : ''}
            </>
          )}
        </Text>
        {entries.map(e => (
          <DayBookRow
            key={`${e.kind}-${e.id}-${e.createdAt}`}
            entry={e}
            showBy={showBy}
            voids={filter === 'voided'}
            timeZone={summary.timezone}
            onOpen={onOpen}
          />
        ))}
        {moreError && !loadingMore ? (
          <View style={styles.moreError}>
            <Text style={styles.moreErrorText}>{moreError}</Text>
            <TouchableOpacity onPress={onMore} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.retry}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <LoadMoreFooter shown={entries.length} total={total} hasMore={entries.length < total} loading={loadingMore} onMore={onMore} />
        )}
      </>
    )}
  </SectionCard>
);

const styles = StyleSheet.create({
  moreError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  moreErrorText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  retry: { ...typography.labelMd, color: colors.primary },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  number: { ...typography.labelMd, color: colors.primary, flex: 1 },
  numberPlain: { color: colors.textPrimary },
  amount: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  struck: { textDecorationLine: 'line-through', color: colors.textTertiary },
  party: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs },
  metaText: { ...typography.caption, color: colors.textTertiary },
  backdated: { ...typography.caption, color: colors.warning },
  badge: { borderRadius: radius.sm, paddingHorizontal: spacing.xs, paddingVertical: 2, marginLeft: 'auto' },
  badgeText: { ...typography.labelSm },
  empty: { ...typography.bodySm, color: colors.textTertiary, paddingVertical: spacing.sm, textAlign: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 40,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.textPrimary, paddingVertical: 0 },
  totals: { ...typography.caption, color: colors.textSecondary, paddingTop: spacing.xs },
  totalsStrong: { ...typography.labelSm, color: colors.textPrimary },
  chips: { gap: spacing.xs, paddingBottom: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipWarn: { backgroundColor: colors.warningLighter, borderColor: colors.warningLight },
  chipWarnOn: { backgroundColor: colors.warning, borderColor: colors.warning },
  chipText: { ...typography.labelSm, color: colors.textPrimary },
  chipCount: { ...typography.labelSm, color: colors.textTertiary },
  chipTextOn: { color: colors.textInverse },
});

export default DayBookList;
