// ═══════════════════════════════════════════════════════
// FinMatrix — The whole book in one bar
// ═══════════════════════════════════════════════════════
// Each age bucket's share of what is outstanding, youngest to oldest on the
// navy ramp the aging charts use — a bar that ends in a long dark run is a
// book of old money. The website's AgingAgeBar.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { THEME } from '../../../theme';
import { AGING_RAMP, rampSteps } from '../../../theme/theme';
import type { AgingBucketDef } from '../../../models/arAgingModel';

const { colors, typography } = THEME;

const AgingAgeBar: React.FC<{ buckets: AgingBucketDef[]; amounts: Record<string, number>; total: number }> = ({
  buckets,
  amounts,
  total,
}) => {
  if (total <= 0) return null;
  const ramp = rampSteps(buckets.length, AGING_RAMP);
  const shares = buckets.map((b, i) => ({ ...b, share: (amounts[b.key] ?? 0) / total, color: ramp[i] }));
  const pct = (s: number) => `${s < 0.005 && s > 0 ? '<1' : Math.round(s * 100)}%`;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`By age: ${shares.map(s => `${s.label} ${pct(s.share)}`).join(', ')}`}
    >
      <View style={styles.bar}>
        {shares.map(s =>
          s.share > 0 ? <View key={s.key} style={{ width: `${s.share * 100}%`, backgroundColor: s.color }} /> : null,
        )}
      </View>
      <View style={styles.ends}>
        <Text style={styles.end}>{buckets[0]?.label}</Text>
        <Text style={styles.end}>{buckets[buckets.length - 1]?.label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2, backgroundColor: colors.surface },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  end: { ...typography.caption, color: colors.textTertiary },
});

export default AgingAgeBar;
