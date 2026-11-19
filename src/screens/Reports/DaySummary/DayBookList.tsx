// ═══════════════════════════════════════════════════════
// FinMatrix — Day Summary · Day Book
// ═══════════════════════════════════════════════════════
// Every document of the day, newest first. A row the totals leave out (a
// draft, a void, a cancelled order) says so instead of disappearing: the
// reader sees everything entered, and which of it counts.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME, statusStyle } from '../../../theme';
import { SectionCard, LoadMoreFooter, ErrorBlock, ReportSkeleton } from '../../../components/reports/ReportUI';
import { formatCurrency } from '../../../utils/formatters';
import {
  KIND_META,
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
  onOpen: (target: DayEntryTarget) => void;
}> = ({ entry: e, showBy, voids, onOpen }) => {
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
      accessibilityLabel={`${KIND_META[e.kind].label} ${e.number ?? ''}, ${e.partyName ?? ''}, ${formatCurrency(e.amount)}`}
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
            {formatCurrency(e.amount)}
          </Text>
        </View>
        <Text style={styles.party} numberOfLines={1}>
          {KIND_META[e.kind].label} · {e.partyName ?? '—'}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {entryTime(e.createdAt)}
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

const DayBookList: React.FC<{
  summary: DaySummary;
  filter: DayEntryFilter;
  onFilter: (f: DayEntryFilter) => void;
  entries: DayEntry[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  onRetry: () => void;
  onMore: () => void;
  showBy: boolean;
  onOpen: (target: DayEntryTarget) => void;
}> = ({ summary, filter, onFilter, entries, total, loading, loadingMore, error, onRetry, onMore, showBy, onOpen }) => (
  <SectionCard
    title="Day Book"
    icon="book-open"
    subtitle={`${filterLabel(filter)} · ${loading ? '…' : `${total} ${total === 1 ? 'entry' : 'entries'}`} · newest first`}
  >
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {dayBookChips(summary, filter).map(c => {
        const on = c.filter === filter;
        return (
          <TouchableOpacity
            key={c.filter}
            onPress={() => onFilter(c.filter)}
            style={[styles.chip, c.warn && styles.chipWarn, on && (c.warn ? styles.chipWarnOn : styles.chipOn)]}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${c.label}${c.count !== null ? `, ${c.count}` : ''}`}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
            {c.count !== null ? (
              <Text style={[styles.chipCount, on && styles.chipTextOn]}>{c.count}</Text>
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
      <Text style={styles.empty}>Nothing here for this day.</Text>
    ) : (
      <>
        {entries.map(e => (
          <DayBookRow key={`${e.kind}-${e.id}-${e.createdAt}`} entry={e} showBy={showBy} voids={filter === 'voided'} onOpen={onOpen} />
        ))}
        <LoadMoreFooter shown={entries.length} total={total} hasMore={entries.length < total} loading={loadingMore} onMore={onMore} />
      </>
    )}
  </SectionCard>
);

const styles = StyleSheet.create({
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
