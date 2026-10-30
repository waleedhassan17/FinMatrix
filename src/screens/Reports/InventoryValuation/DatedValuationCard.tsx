// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory valuation as of a past date
// ═══════════════════════════════════════════════════════
// Stock on an earlier day, read from the dated movement record: quantity and
// value per item as the movements up to that day leave them. Nothing is
// estimated — an item whose record has an unvalued movement shows no value,
// and the coverage line says how much of the record is valued. The total
// stands beside Inventory 1200 on the same day (1250 Goods in Transit is not
// part of it).

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import {
  SectionCard,
  ReportSkeleton,
  TieOutBadge,
  NoticeBanner,
  SummaryLine,
  parenNegative,
} from '../../../components/reports/ReportUI';
import { ledgerTies, type DatedValuation } from '../../../models/inventoryHealthModel';
import type { Remote } from '../../../models/remoteModel';

const { colors, spacing, typography } = THEME;

const rs = (n: number) => parenNegative(n, 'Rs ');
const qty = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
const PAGE = 25;

const DatedValuationCard: React.FC<{
  state: Remote<DatedValuation>;
  asOfDate: string;
  onRetry: () => void;
  onOpenItem: (itemId: string, name: string) => void;
}> = ({ state, asOfDate, onRetry, onOpenItem }) => {
  const [shown, setShown] = useState(PAGE);
  const d = state.data;
  const day = dayjs(asOfDate).format('D MMM YYYY');

  if (state.notFound) {
    return <NoticeBanner message="This server cannot value stock at a past date yet. Showing today's stock." />;
  }
  if (!d) {
    return state.status === 'failed' ? (
      <View style={styles.failed}>
        <Text style={styles.error}>{state.error}</Text>
        <TouchableOpacity onPress={onRetry} accessibilityRole="button" style={styles.more}>
          <Text style={styles.link}>Try again</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <ReportSkeleton variant="list" rows={5} />
    );
  }

  const ties = ledgerTies(d.ledgerTie);
  const partial = d.coverage && d.coverage.pct < 100;
  const rows = d.rows.filter(r => r.qty !== 0 || (r.value ?? 0) !== 0);

  return (
    <SectionCard title={`Stock as of ${day}`} subtitle="From the dated movement record" icon="calendar">
      <SummaryLine label="Stock value" value={rs(d.totalValue)} strong />
      {d.ledgerTie ? (
        <>
          <SummaryLine label="Inventory account 1200" value={rs(d.ledgerTie.gl1200)} />
          <View style={styles.badge}>
            <TieOutBadge
              state={ties ? 'ties' : 'gap'}
              label={ties ? 'Ties to Inventory 1200' : 'Stock and Inventory 1200'}
              gap={ties ? null : d.ledgerTie.gap}
            />
          </View>
        </>
      ) : null}
      {partial ? (
        <View style={styles.badge}>
          <NoticeBanner
            message={`${d.coverage!.pct.toFixed(1)}% of the movement record carries a value; ${d.coverage!.unvaluedItems} item${
              d.coverage!.unvaluedItems === 1 ? ' has' : 's have'
            } no value at this date rather than an estimated one.`}
          />
        </View>
      ) : null}

      {rows.slice(0, shown).map((r, i) => (
        <TouchableOpacity
          key={r.itemId}
          style={[styles.row, i === 0 ? styles.first : styles.rule]}
          onPress={() => onOpenItem(r.itemId, r.itemName)}
          accessibilityRole="button"
          accessibilityLabel={`${r.itemName}, ${qty(r.qty)} on hand, ${r.value === null ? 'value unknown' : rs(r.value)}. Explore`}
        >
          <View style={styles.main}>
            <Text style={styles.name} numberOfLines={1}>{r.itemName}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[r.sku, `${qty(r.qty)} on hand`].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text style={[styles.value, r.value === null && styles.unknown]}>{r.value === null ? 'No value' : rs(r.value)}</Text>
          <Feather name="chevron-right" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}
      {rows.length > shown ? (
        <TouchableOpacity style={styles.more} onPress={() => setShown(s => s + PAGE)} accessibilityRole="button">
          <Text style={styles.link}>Show more ({shown} of {rows.length})</Text>
        </TouchableOpacity>
      ) : null}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  failed: { gap: spacing.xxs },
  error: { ...typography.bodySm, color: colors.danger },
  link: { ...typography.labelSm, color: colors.primary },
  more: { minHeight: 44, justifyContent: 'center' },
  badge: { marginTop: spacing.xs, alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 52, paddingVertical: spacing.xs },
  first: { marginTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  main: { flex: 1 },
  name: { ...typography.labelMd, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textTertiary },
  value: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  unknown: { color: colors.textTertiary },
});

export default DatedValuationCard;
