// ═══════════════════════════════════════════════════════
// FinMatrix — Top parties by age
// ═══════════════════════════════════════════════════════
// Who holds the most, and how old it is — the web's "Top customers" chart,
// laid out for a phone: name and amount on one line, the bar beneath, stacked
// by bucket in the same sequential ramp as the period chart above it. A bar
// that ends dark is a party whose money is old.
//
// With a period selected the ranking follows it and each bar is that period's
// amount alone, so the chart agrees with the filtered list instead of arguing.
// Tapping a party opens it in the list below, documents and all.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { SectionCard } from '../../../components/reports/ReportUI';
import {
  topAgingParties,
  type AgingBucketDef,
  type ARAgingRow,
  type TopAgingParty,
} from '../../../models/arAgingModel';
import { THEME, AGING_RAMP, rampSteps } from '../../../theme';
import { formatCurrency } from '../../../utils/formatters';

const { colors, spacing, typography } = THEME;

/** A phone shows five; the list below has everyone. */
const PARTY_LIMIT = 5;

interface Props {
  buckets: AgingBucketDef[];
  rows: ARAgingRow[];
  selectedBucket: string | null;
  /** 'customer' or 'vendor'. */
  partyNoun: string;
  onFindParty: (party: TopAgingParty) => void;
}

const rs = (n: number) => formatCurrency(n, 'Rs ');

const AgingTopParties: React.FC<Props> = ({
  buckets,
  rows,
  selectedBucket,
  partyNoun,
  onFindParty,
}) => {
  const top = useMemo(
    () => topAgingParties({ rows, buckets, selectedBucket, limit: PARTY_LIMIT }),
    [rows, buckets, selectedBucket],
  );

  const ramp = rampSteps(buckets.length, AGING_RAMP);
  const colourOf = new Map(buckets.map((b, i) => [b.key, ramp[i]]));
  const selectedLabel = buckets.find(b => b.key === selectedBucket)?.label;
  const plural = `${partyNoun}s`;

  // One scale for every bar: the longest is the largest party's drawn length.
  const extent = (p: TopAgingParty) => p.segments.reduce((t, s) => t + s.amount, 0);
  const scale = Math.max(0, ...top.parties.map(extent));

  const title = `Top ${plural}${selectedLabel ? ` · ${selectedLabel}` : ''}`;

  return (
    <SectionCard
      title={title.charAt(0).toUpperCase() + title.slice(1)}
      subtitle={
        selectedLabel ? `Largest amounts in ${selectedLabel}` : 'Largest balances, split by age'
      }
      icon="award"
    >
      {top.parties.length === 0 ? (
        <Text style={styles.empty}>
          No {partyNoun} has anything in {selectedLabel ?? 'this report'}.
        </Text>
      ) : (
        <View style={styles.list}>
          {top.parties.map(p => (
            <TouchableOpacity
              key={p.id || p.name}
              activeOpacity={0.6}
              onPress={() => onFindParty(p)}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}, ${rs(p.amount)}. Show in the list`}
            >
              <View style={styles.head}>
                <Text style={styles.name} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.amount}>{rs(p.amount)}</Text>
              </View>
              <View style={styles.bar}>
                {p.segments.map((s, i) => (
                  <View
                    key={s.key}
                    style={[
                      styles.segment,
                      i === 0 && styles.segmentFirst,
                      i === p.segments.length - 1 && styles.segmentLast,
                      {
                        width: `${scale > 0 ? (s.amount / scale) * 100 : 0}%`,
                        backgroundColor: colourOf.get(s.key),
                      },
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.foot}>
        <Text style={styles.footText}>
          {top.moreCount > 0
            ? `+${top.moreCount} more · ${rs(top.moreAmount)}`
            : top.parties.length > 0
              ? `${top.parties.length} ${top.parties.length === 1 ? partyNoun : plural}${
                  selectedLabel ? ` in ${selectedLabel}` : ' with a balance'
                }`
              : ''}
        </Text>
        {/* The key: the ramp runs newest to oldest. */}
        {buckets.length > 1 && (
          <View style={styles.key}>
            <Text style={styles.footText}>{buckets[0].label}</Text>
            <View style={styles.keyRamp}>
              {ramp.map((c, i) => (
                <View key={i} style={[styles.keyStep, { backgroundColor: c }]} />
              ))}
            </View>
            <Text style={styles.footText}>{buckets[buckets.length - 1].label}</Text>
          </View>
        )}
      </View>
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  list: { gap: spacing.sm + 2 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  name: { ...typography.bodySm, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  amount: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  bar: { flexDirection: 'row', height: 8, marginTop: 5 },
  // A hairline in the card colour between segments, so neighbouring ramp
  // steps still read as two.
  segment: { height: '100%', minWidth: 2, borderRightWidth: 1, borderRightColor: colors.surface },
  segmentFirst: { borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
  segmentLast: { borderTopRightRadius: 2, borderBottomRightRadius: 2, borderRightWidth: 0 },
  empty: { ...typography.bodySm, color: colors.textTertiary },
  foot: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    gap: spacing.xs,
  },
  footText: { ...typography.caption, color: colors.textTertiary },
  key: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  keyRamp: { flexDirection: 'row', width: 56, height: 6, borderRadius: 3, overflow: 'hidden' },
  keyStep: { flex: 1, height: '100%' },
});

export default AgingTopParties;
