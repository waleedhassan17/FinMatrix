// ═══════════════════════════════════════════════════════
// FinMatrix — Where one item's revenue came from
// ═══════════════════════════════════════════════════════
// The pie on the item explorer, built the way the inventory report's stock
// composition is: a ring by default, bars on request — and the same card as
// the website's.
//
// By customer it answers "how much do I depend on one buyer": the server's
// top five and everyone else as Other, each row opening the customer. By
// channel — offered only when the item went out both ways — it splits what
// was invoiced over the counter from what went out on deliveries. Returns are
// not a slice of what went out; they are stated under the chart. A customer
// who returned more than they bought has no slice, so the view falls back to
// bars, which can hang below zero, and says why.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { THEME } from '../../../theme';
import { CATEGORY_PALETTE } from '../../../theme/theme';
import { Segmented } from '../../../components/reports/ReportUI';
import { OTHER_KEY, sliceShare } from '../../../models/chartSlicesModel';
import {
  hasChannelBreakdown,
  returnsText,
  revenueBreakdown,
  unitsText,
  type BreakdownDimension,
} from '../../../models/itemExplorerModel';
import type { ItemPerformance } from '../../../models/inventoryValuationModel';
import { formatCurrency } from '../../../utils/formatters';
import DonutChart from '../shared/DonutChart';
import RankedBars from '../shared/RankedBars';

const { colors, radius, spacing, typography } = THEME;

export type BreakdownView = 'pie' | 'bar';

const DIMENSIONS: { key: BreakdownDimension; label: string }[] = [
  { key: 'customer', label: 'Customer' },
  { key: 'channel', label: 'Channel' },
];
const VIEWS: { key: BreakdownView; label: string }[] = [
  { key: 'pie', label: 'Pie' },
  { key: 'bar', label: 'Bar' },
];

const rs = (n: number) => formatCurrency(n, 'Rs ');

interface Props {
  perf: ItemPerformance;
  dimension: BreakdownDimension;
  view: BreakdownView;
  onDimension: (d: BreakdownDimension) => void;
  onView: (v: BreakdownView) => void;
  /** "Jan 1 – Oct 28, 2026". */
  windowLabel: string;
  unitOfMeasure?: string;
  /** Opens a customer's record; absent where the screen cannot. */
  onCustomer?: (customerId: string) => void;
}

const ItemRevenueBreakdown: React.FC<Props> = ({
  perf,
  dimension: asked,
  view,
  onDimension,
  onView,
  windowLabel,
  unitOfMeasure = 'unit',
  onCustomer,
}) => {
  const channelOffered = hasChannelBreakdown(perf);
  const dimension: BreakdownDimension = channelOffered ? asked : 'customer';
  const breakdown = revenueBreakdown(perf, dimension);
  const sold = perf.totals.revenue !== 0 || perf.totals.unitsSold !== 0 || breakdown.slices.length > 0;
  const ring = view === 'pie' && breakdown.donut;
  const returns = returnsText(perf.returns, unitOfMeasure);
  const units = (n: number) => unitsText(n, unitOfMeasure);
  const subject = dimension === 'customer' ? 'customer' : 'channel';
  const opens = dimension === 'customer' && !!onCustomer;
  const canOpen = (key: string) => key !== OTHER_KEY && !key.startsWith('none-');
  const shownView: BreakdownView = breakdown.donut ? view : 'bar';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Revenue by {subject}</Text>
      <Text style={styles.sub}>{windowLabel}</Text>

      {sold ? (
        <View style={styles.controls}>
          {channelOffered ? (
            <Segmented
              options={DIMENSIONS.map(d => d.label)}
              activeIndex={DIMENSIONS.findIndex(d => d.key === dimension)}
              onChange={i => onDimension(DIMENSIONS[i].key)}
            />
          ) : null}
          <Segmented
            options={VIEWS.map(v => v.label)}
            activeIndex={VIEWS.findIndex(v => v.key === shownView)}
            // A ring cannot draw a part below zero: Pie stays off until it can.
            onChange={i => (VIEWS[i].key === 'pie' && !breakdown.donut ? undefined : onView(VIEWS[i].key))}
          />
        </View>
      ) : null}

      {!sold ? (
        <Text style={styles.empty}>Not sold in this window, so there is no revenue to break down.</Text>
      ) : ring ? (
        <DonutChart
          title={`Revenue by ${subject}`}
          slices={breakdown.slices}
          palette={CATEGORY_PALETTE}
          total={breakdown.total}
          centerLabel={dimension === 'channel' && returns ? 'Before returns' : 'Revenue'}
          labelHeader={dimension === 'customer' ? 'Customer' : 'Channel'}
          valueHeader="Revenue"
          countLabel={units}
          onOpen={opens ? key => onCustomer?.(key) : undefined}
          canOpen={canOpen}
        />
      ) : (
        <>
          {view === 'pie' && !breakdown.donut ? (
            <Text style={styles.note}>
              {dimension === 'customer'
                ? 'A customer returned more than they bought, so this shows as bars.'
                : 'Returns outweigh a channel, so this shows as bars.'}
            </Text>
          ) : null}
          <RankedBars
            points={[
              ...breakdown.slices.map(s => {
                const share = breakdown.donut ? sliceShare(s, breakdown.total) : null;
                return {
                  key: s.key,
                  label: s.label,
                  value: s.value,
                  hint: [s.count !== undefined ? units(s.count) : null, share !== null ? `${share.toFixed(1)}% of revenue` : null]
                    .filter(Boolean)
                    .join(' · '),
                };
              }),
              // By channel, what came back hangs below the channels it came from.
              ...(dimension === 'channel' && perf.returns && perf.returns.revenue !== 0
                ? [{ key: 'returns', label: 'Returns', value: perf.returns.revenue, hint: units(Math.abs(perf.returns.unitsSold)) }]
                : []),
            ]}
            limit={breakdown.slices.length + 1}
            format={rs}
            onSelect={opens ? key => onCustomer?.(key) : undefined}
            canSelect={canOpen}
            navigates={opens}
            emptyLabel="Nobody bought it in this window."
          />
        </>
      )}

      {sold && returns && (dimension === 'customer' || ring) ? <Text style={styles.returns}>{returns}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: { ...typography.h5, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textTertiary },
  controls: { gap: spacing.xs, marginTop: spacing.xxs },
  empty: { ...typography.bodySm, color: colors.textTertiary, paddingVertical: spacing.lg, textAlign: 'center' },
  note: { ...typography.caption, color: colors.textTertiary },
  returns: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
});

export default ItemRevenueBreakdown;
