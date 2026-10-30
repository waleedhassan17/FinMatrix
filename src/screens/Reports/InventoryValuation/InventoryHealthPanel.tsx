// ═══════════════════════════════════════════════════════
// FinMatrix — Inventory Valuation · Health tab
// ═══════════════════════════════════════════════════════
// The stock that needs a decision: what to reorder and how much, how long
// stock has sat, what has stopped selling and what it ties up, how fast stock
// turns, and where the value sits. Every list, bucket and KPI is the server's
// (/reports/inventory-health); this panel lists and draws them.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import {
  Card,
  SectionCard,
  Segmented,
  ReportSkeleton,
  EmptyBlock,
  parenNegative,
} from '../../../components/reports/ReportUI';
import {
  AGE_BASIS_OPTIONS,
  type InventoryHealth,
  type StockAgeBasis,
} from '../../../models/inventoryHealthModel';
import type { Remote } from '../../../models/remoteModel';
import KpiCards from '../shared/KpiCards';
import RankedBars from '../shared/RankedBars';

const { colors, radius, spacing, typography } = THEME;

const rs = (n: number) => parenNegative(n, 'Rs ');
const qty = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
const valueOrDash = (v: number | null) => (v === null ? '—' : rs(v));

/** Rows before "Show more": a warehouse can hold hundreds of items. */
const PAGE = 25;

interface Props {
  state: Remote<InventoryHealth>;
  onRetry: () => void;
  onOpenItem: (itemId: string, name: string) => void;
}

const InventoryHealthPanel: React.FC<Props> = ({ state, onRetry, onOpenItem }) => {
  const [basis, setBasis] = useState<StockAgeBasis>('byLastInbound');
  const [reorderShown, setReorderShown] = useState(PAGE);
  const [deadShown, setDeadShown] = useState(PAGE);
  const h = state.data;

  if (state.notFound) {
    return (
      <Card>
        <EmptyBlock icon="activity" title="Stock health is not available" hint="This server predates the stock-health report." />
      </Card>
    );
  }
  if (!h && state.status !== 'failed') return <ReportSkeleton variant="list" rows={6} />;
  if (!h) {
    return (
      <Card>
        <Text style={styles.error}>{state.error}</Text>
        <TouchableOpacity onPress={onRetry} accessibilityRole="button" style={styles.more}>
          <Text style={styles.link}>Try again</Text>
        </TouchableOpacity>
      </Card>
    );
  }

  const kpis = [h.turnover, h.dio].filter((k): k is NonNullable<typeof k> => !!k);
  const buckets = h.aging[basis];
  const asOf = dayjs(h.asOfDate).format('D MMM YYYY');

  return (
    <>
      {kpis.length > 0 ? (
        <KpiCards state={state} kpis={kpis} onRetry={onRetry} skeletonCount={2} />
      ) : null}

      <SectionCard
        title="Below reorder point"
        subtitle={h.belowReorder.length ? `${h.belowReorder.length} item${h.belowReorder.length === 1 ? '' : 's'} · as of ${asOf}` : `As of ${asOf}`}
        icon="shopping-cart"
      >
        {h.belowReorder.length === 0 ? (
          <Text style={styles.none}>Nothing is at or below its reorder point.</Text>
        ) : (
          <>
            {h.belowReorder.slice(0, reorderShown).map((x, i) => (
              <TouchableOpacity
                key={x.itemId}
                style={[styles.row, i > 0 && styles.rule]}
                onPress={() => onOpenItem(x.itemId, x.name)}
                accessibilityRole="button"
                accessibilityLabel={`${x.name}, ${qty(x.qtyOnHand)} on hand, reorder point ${qty(x.reorderPoint)}. Suggested order ${qty(x.suggestedOrderQty)}. Explore`}
              >
                <View style={styles.main}>
                  <Text style={styles.name} numberOfLines={1}>{x.name}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[x.sku, `${qty(x.qtyOnHand)} on hand`, `reorder at ${qty(x.reorderPoint)}`].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={styles.order}>
                  <Text style={styles.orderText}>Order {qty(x.suggestedOrderQty)}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
            {h.belowReorder.length > reorderShown ? (
              <TouchableOpacity style={styles.more} onPress={() => setReorderShown(s => s + PAGE)} accessibilityRole="button">
                <Text style={styles.link}>Show more ({reorderShown} of {h.belowReorder.length})</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </SectionCard>

      <SectionCard title="Stock aging" subtitle="Value on hand by how long since it moved" icon="clock">
        <Segmented
          options={AGE_BASIS_OPTIONS.map(o => o.label)}
          activeIndex={AGE_BASIS_OPTIONS.findIndex(o => o.key === basis)}
          onChange={i => setBasis(AGE_BASIS_OPTIONS[i].key)}
        />
        <View style={styles.gapTop}>
          <RankedBars
            points={buckets
              .filter(b => b.count > 0 || b.key !== 'noMovement')
              .map(b => ({ key: b.key, label: b.label, value: b.value, hint: `${b.count} item${b.count === 1 ? '' : 's'}` }))}
            // Every bucket the server sent, in its order — nothing folded.
            limit={Math.max(1, buckets.length)}
            format={rs}
            emptyLabel="Nothing on hand."
          />
        </View>
      </SectionCard>

      <SectionCard
        title="Dead stock"
        subtitle={`Nothing out in ${h.deadStock.thresholdDays} days · ${rs(h.deadStock.totalValue)} tied up`}
        icon="archive"
      >
        {h.deadStock.items.length === 0 ? (
          <Text style={styles.none}>Everything on hand has moved out in the last {h.deadStock.thresholdDays} days.</Text>
        ) : (
          <>
            {h.deadStock.items.slice(0, deadShown).map((x, i) => (
              <TouchableOpacity
                key={x.itemId}
                style={[styles.row, i > 0 && styles.rule]}
                onPress={() => onOpenItem(x.itemId, x.name)}
                accessibilityRole="button"
                accessibilityLabel={`${x.name}, ${valueOrDash(x.stockValue)}, ${x.lastOutboundDate ? `last out ${dayjs(x.lastOutboundDate).format('D MMM YYYY')}` : 'never sold'}. Explore`}
              >
                <View style={styles.main}>
                  <Text style={styles.name} numberOfLines={1}>{x.name}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {qty(x.qtyOnHand)} on hand ·{' '}
                    {x.lastOutboundDate
                      ? `last out ${dayjs(x.lastOutboundDate).format('D MMM YYYY')}${x.daysSinceOutbound !== null ? ` (${x.daysSinceOutbound} days)` : ''}`
                      : 'never moved out'}
                  </Text>
                </View>
                <Text style={styles.value}>{valueOrDash(x.stockValue)}</Text>
                <Feather name="chevron-right" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
            {h.deadStock.items.length > deadShown ? (
              <TouchableOpacity style={styles.more} onPress={() => setDeadShown(s => s + PAGE)} accessibilityRole="button">
                <Text style={styles.link}>Show more ({deadShown} of {h.deadStock.items.length})</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </SectionCard>

      {h.byLocation.length > 0 ? (
        <SectionCard title="Value by location" icon="map-pin">
          <RankedBars
            points={h.byLocation.map(l => ({ key: l.location, label: l.location, value: l.value }))}
            limit={Math.max(1, h.byLocation.length)}
            format={rs}
          />
        </SectionCard>
      ) : null}

      {h.totals ? (
        <Text style={styles.note}>
          {h.totals.itemsOnHand} of {h.totals.itemCount} items on hand ·{' '}
          {h.basis === 'movementRecord' ? 'valued from the dated movement record' : 'quantity on hand at average cost'}.
        </Text>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  gapTop: { marginTop: spacing.sm },
  none: { ...typography.bodySm, color: colors.textTertiary },
  error: { ...typography.bodySm, color: colors.danger },
  link: { ...typography.labelSm, color: colors.primary },
  more: { minHeight: 44, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 52, paddingVertical: spacing.xs },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  main: { flex: 1 },
  name: { ...typography.labelMd, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textTertiary },
  value: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  order: { backgroundColor: colors.warningLighter, borderRadius: radius.full, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  orderText: { ...typography.labelSm, color: colors.warning, fontVariant: ['tabular-nums'] },
  note: { ...typography.caption, color: colors.textTertiary, paddingHorizontal: spacing.xxs },
});

export default InventoryHealthPanel;
