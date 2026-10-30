// ═══════════════════════════════════════════════════════
// FinMatrix — How long cash is tied up
// ═══════════════════════════════════════════════════════
// Days to collect plus days stock sits, less the days taken to pay: two bars
// on one scale — what ties cash up (DSO + DIO) above, what offsets it (DPO)
// with the cycle that is left — so the sum reads off the lengths. Every
// figure is the server's; the website draws the same card.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { THEME } from '../../../theme';
import { CATEGORY_PALETTE } from '../../../theme/theme';
import { STATUS_CAPTION, formatKpiValue, type Kpi } from '../../../models/kpiModel';
import AssessmentPill from '../../../components/reports/AssessmentPill';

const { colors, spacing, typography } = THEME;

const ROWS = [
  { key: 'dso', sentence: 'Days to collect from customers', color: CATEGORY_PALETTE[0] },
  { key: 'dio', sentence: 'Days stock waits to be sold', color: CATEGORY_PALETTE[1] },
  { key: 'dpo', sentence: 'Days taken to pay suppliers', color: CATEGORY_PALETTE[2] },
] as const;

const CashCycle: React.FC<{ kpis: Partial<Record<'dso' | 'dio' | 'dpo' | 'ccc', Kpi>> }> = ({ kpis }) => {
  const v = (k?: Kpi) => k?.value ?? null;
  const [dso, dio, dpo, ccc] = [v(kpis.dso), v(kpis.dio), v(kpis.dpo), v(kpis.ccc)];
  const drawable = dso !== null && dio !== null && dpo !== null && ccc !== null && ccc >= 0 && dso >= 0 && dio >= 0 && dpo >= 0;
  const scale = drawable ? Math.max(dso! + dio!, 1) : 1;
  const pct = (n: number): `${number}%` => `${Math.max(0, (n / scale) * 100)}%`;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.value}>{formatKpiValue(ccc, 'days')}</Text>
          <View style={styles.captionRow}>
            {drawable ? <View style={[styles.swatch, { backgroundColor: colors.neutral500 }]} /> : null}
            <Text style={styles.caption}>
              {ccc === null ? STATUS_CAPTION[kpis.ccc?.status ?? 'no_denominator'] : 'Cash conversion cycle · CCC'}
            </Text>
          </View>
        </View>
        <AssessmentPill assessment={kpis.ccc?.assessment} />
      </View>

      {drawable ? (
        <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.track}>
            <View style={{ width: pct(dso!), backgroundColor: ROWS[0].color }} />
            <View style={[styles.gap, { width: pct(dio!), backgroundColor: ROWS[1].color }]} />
          </View>
          <View style={styles.track}>
            <View style={{ width: pct(dpo!), backgroundColor: ROWS[2].color }} />
            <View style={[styles.gap, { width: pct(ccc!), backgroundColor: colors.neutral500 }]} />
          </View>
        </View>
      ) : null}

      {ROWS.map(row => {
        const k = kpis[row.key];
        return (
          <View key={row.key} style={styles.row} accessible accessibilityLabel={`${row.sentence}, ${formatKpiValue(v(k), 'days')}`}>
            <View style={styles.captionRow}>
              <View style={[styles.swatch, { backgroundColor: row.color }]} />
              <Text style={styles.caption}>
                {row.sentence} · {row.key.toUpperCase()}
              </Text>
            </View>
            <View style={styles.rowValue}>
              <Text style={styles.days}>{formatKpiValue(v(k), 'days')}</Text>
              <AssessmentPill assessment={k?.assessment} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  value: { ...typography.h3, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  caption: { ...typography.caption, color: colors.textTertiary, flexShrink: 1 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  bars: { gap: 6 },
  track: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.neutral100 },
  gap: { borderLeftWidth: 2, borderLeftColor: colors.surface },
  row: {
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    gap: 2,
  },
  rowValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16 },
  days: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
});

export default CashCycle;
