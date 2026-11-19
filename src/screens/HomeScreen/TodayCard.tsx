// ═══════════════════════════════════════════════════════
// FinMatrix — Dashboard · Today
// ═══════════════════════════════════════════════════════
// The day so far in three figures — sales, money received, and orders booked
// (or purchases, on a plan without sales orders) — plus a line when something
// needs a look. The whole card opens the Day Summary. Staff see their own day.
// Own file so it is tested without the whole dashboard.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../theme';
import { compactMoney } from '../../models/itemExplorerModel';
import { attentionItems, countLabel, type DaySummary } from '../../models/daySummaryModel';

const { colors, radius, shadows, spacing, typography } = THEME;

const TodayCard: React.FC<{
  summary: DaySummary | null;
  loading: boolean;
  failed: boolean;
  onOpen: () => void;
}> = ({ summary: s, loading, failed, onOpen }) => {
  const h = s?.headline;
  const third = h?.orders
    ? { label: 'Orders booked', value: h.orders.total, caption: countLabel(h.orders.count, 'sales_order') }
    : { label: 'Purchases', value: h?.purchases.total ?? 0, caption: countLabel(h?.purchases.count ?? 0, 'bill') };
  const cells = [
    { label: 'Sales', value: h?.sales.total ?? 0, caption: countLabel(h?.sales.count ?? 0, 'invoice') },
    { label: 'Received', value: h?.received.total ?? 0, caption: countLabel(h?.received.count ?? 0, 'receipt') },
    third,
  ];
  const flags = s ? attentionItems(s) : [];

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel="Open the day summary"
    >
      <View style={styles.row}>
        {cells.map((c, i) => (
          <View key={c.label} style={[styles.cell, i > 0 && styles.cellDivider]}>
            <Text style={styles.label} numberOfLines={1}>
              {c.label}
            </Text>
            <Text style={[styles.value, failed && !s && styles.valueMuted]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {loading && !s ? '…' : failed && !s ? '—' : compactMoney(c.value)}
            </Text>
            <Text style={styles.caption} numberOfLines={1}>
              {s ? c.caption : ' '}
            </Text>
          </View>
        ))}
      </View>
      {flags.length > 0 ? (
        <View style={styles.flag}>
          <Feather name="alert-triangle" size={13} color={colors.warning} />
          <Text style={styles.flagText} numberOfLines={1}>
            {flags.map(f => f.label).join(' · ')}
          </Text>
        </View>
      ) : null}
      <View style={styles.foot}>
        <Text style={styles.footText}>{s?.isEmpty ? 'Nothing recorded yet today' : 'See the whole day'}</Text>
        <Feather name="chevron-right" size={15} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.card, overflow: 'hidden' },
  row: { flexDirection: 'row', paddingVertical: spacing.sm },
  cell: { flex: 1, paddingHorizontal: spacing.sm },
  cellDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.borderLight },
  label: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.h3, color: colors.textPrimary, marginTop: 2 },
  valueMuted: { color: colors.textTertiary },
  caption: { ...typography.caption, color: colors.textTertiary },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningLighter,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  flagText: { ...typography.caption, color: colors.textPrimary, flex: 1 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  footText: { ...typography.labelMd, color: colors.primary },
});

export default TodayCard;
