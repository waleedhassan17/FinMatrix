// ═══════════════════════════════════════════════════════
// FinMatrix — What a unit sells for, against what it costs
// ═══════════════════════════════════════════════════════
// The list price, the average cost, the margin between them, and — from the
// window's own sales — what a unit actually went for after discounts. One bar
// splits the price into cost and margin, navy and teal like the analytics
// charts, named under it so colour is never the only key. An item priced
// below its cost has no margin to draw: the bar is all cost, and the
// shortfall is said in words. The website's Price and margin.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { THEME } from '../../../theme';
import { CATEGORY_PALETTE } from '../../../theme/theme';
import { SectionCard } from '../../../components/reports/ReportUI';
import { priceAndMargin, vsListText } from '../../../models/itemExplorerModel';
import type { ItemFacts } from '../../../models/inventoryValuationModel';
import { formatCurrency } from '../../../utils/formatters';
import { FactRow } from './FactRow';

const { colors, radius, spacing, typography } = THEME;

const COST_COLOR = CATEGORY_PALETTE[0];
const MARGIN_COLOR = CATEGORY_PALETTE[1];
const rs = (n: number) => formatCurrency(n, 'Rs ');

interface Props {
  facts: ItemFacts;
  totals: { revenue: number; unitsSold: number } | null | undefined;
}

const ItemPriceMargin: React.FC<Props> = ({ facts, totals }) => {
  const p = priceAndMargin(facts, totals);
  if (p.price <= 0) return null;
  const below = p.margin < 0;
  const vsList = vsListText(p.vsListPct);

  return (
    <SectionCard title="Price and margin" icon="tag">
      {p.costShare !== null ? (
        <View style={styles.barBox}>
          <View
            style={styles.bar}
            accessible
            accessibilityRole="image"
            accessibilityLabel={
              below
                ? `Sells ${rs(-p.margin)} below its cost`
                : `Of the price, ${p.costShare.toFixed(1)}% is cost and ${(100 - p.costShare).toFixed(1)}% margin`
            }
          >
            <View style={[styles.part, { width: `${p.costShare}%`, backgroundColor: COST_COLOR }]} />
            {!below && p.costShare < 100 ? (
              <View style={[styles.part, styles.rest, { backgroundColor: MARGIN_COLOR }]} />
            ) : null}
          </View>
          <View style={styles.legend} importantForAccessibility="no-hide-descendants">
            <View style={styles.key}>
              <View style={[styles.swatch, { backgroundColor: COST_COLOR }]} />
              <Text style={styles.keyText}>Cost {p.costShare.toFixed(1)}%</Text>
            </View>
            {!below ? (
              <View style={styles.key}>
                <View style={[styles.swatch, { backgroundColor: MARGIN_COLOR }]} />
                <Text style={styles.keyText}>Margin {(100 - p.costShare).toFixed(1)}%</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
      <FactRow label="Selling price" value={rs(p.price)} />
      <FactRow label="Average cost" value={rs(p.cost)} />
      <FactRow
        label="Margin per unit"
        value={below ? `(${rs(-p.margin)})` : rs(p.margin)}
        detail={p.marginPct === null ? undefined : below ? 'Below cost' : `${p.marginPct.toFixed(1)}% of the price`}
        strong
        danger={below}
      />
      {p.realised !== null ? <FactRow label="Sold for" value={rs(p.realised)} detail={vsList ?? undefined} /> : null}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  barBox: { marginBottom: spacing.xs },
  bar: { flexDirection: 'row', gap: 2, height: 10, borderRadius: radius.full, overflow: 'hidden', backgroundColor: colors.neutral100 },
  part: { height: 10 },
  rest: { flex: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  key: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  keyText: { ...typography.caption, color: colors.textSecondary },
});

export default ItemPriceMargin;
