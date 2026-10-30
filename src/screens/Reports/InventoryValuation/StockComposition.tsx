// ═══════════════════════════════════════════════════════
// FinMatrix — What the stock is made of
// ═══════════════════════════════════════════════════════
// The inventory report's hero, as on the website: a ring by default (the
// share each part holds is the question), bars to compare the parts by
// length, and a line for how the total has moved. The ring and the bars cut
// the same stock three ways — by category (from the valuation itself), by
// location and by how long it has been on hand (both from inventory health).
// Ages are ordered, so they take the navy ramp, not the categorical palette;
// a category or location past the top six folds into a grey Other.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { THEME } from '../../../theme';
import { AGING_RAMP, CATEGORY_PALETTE, rampSteps } from '../../../theme/theme';
import { Segmented, ReportSkeleton } from '../../../components/reports/ReportUI';
import { foldSlices, formatSliceShare, OTHER_KEY, sliceShare, type SlicePoint } from '../../../models/chartSlicesModel';
import type { CategoryShare } from '../../../models/inventoryValuationModel';
import type { InventoryHealth } from '../../../models/inventoryHealthModel';
import type { Remote } from '../../../models/remoteModel';
import DonutChart from '../shared/DonutChart';
import MetricChart, { type MetricChartPoint } from '../shared/MetricChart';
import RankedBars from '../shared/RankedBars';

const { colors, radius, spacing, typography } = THEME;

export type CompositionView = 'pie' | 'bar' | 'line';
export type CompositionDimension = 'category' | 'location' | 'age';

const VIEWS: { key: CompositionView; label: string }[] = [
  { key: 'pie', label: 'Pie' },
  { key: 'bar', label: 'Bar' },
  { key: 'line', label: 'Line' },
];
const DIMENSIONS: { key: CompositionDimension; label: string }[] = [
  { key: 'category', label: 'Category' },
  { key: 'location', label: 'Location' },
  { key: 'age', label: 'Age' },
];

const items = (n: number) => `${n.toLocaleString('en-US')} item${n === 1 ? '' : 's'}`;

interface Props {
  view: CompositionView;
  dimension: CompositionDimension;
  onView: (v: CompositionView) => void;
  onDimension: (d: CompositionDimension) => void;
  categories: CategoryShare[];
  health: Remote<InventoryHealth>;
  onRetryHealth: () => void;
  trend: MetricChartPoint[];
  /** "As of today" / "As of 30 Sep 2026". */
  asOfLabel: string;
  selectedCategory: string;
  onCategory: (category: string) => void;
  /** Back to every category — the way out of a drill-in, always in sight. */
  onClearCategory: () => void;
  /** Location and age have their own lists in the Health tab. */
  onHealth: () => void;
  format: (v: number) => string;
}

const StockComposition: React.FC<Props> = ({
  view,
  dimension,
  onView,
  onDimension,
  categories,
  health,
  onRetryHealth,
  trend,
  asOfLabel,
  selectedCategory,
  onCategory,
  onClearCategory,
  onHealth,
  format,
}) => {
  const fromHealth = dimension !== 'category';
  const h = health.data;
  let slices: SlicePoint[] = [];
  let palette: readonly string[] = CATEGORY_PALETTE;
  if (dimension === 'category') {
    slices = foldSlices(categories.map(c => ({ key: c.category, label: c.category || 'Uncategorised', value: c.value, count: c.items })));
  } else if (dimension === 'location' && h) {
    slices = foldSlices(h.byLocation.map(l => ({ key: l.location, label: l.location, value: l.value })));
  } else if (dimension === 'age' && h) {
    // In age order, never by size; stock with no recorded movement has no age.
    slices = h.aging.byLastInbound.map(b => ({
      key: b.key === 'noMovement' ? OTHER_KEY : b.key,
      label: b.label,
      value: b.value,
      count: b.count,
    }));
    palette = rampSteps(slices.filter(s => s.key !== OTHER_KEY).length, AGING_RAMP);
  }
  const subject = dimension === 'category' ? 'category' : dimension === 'location' ? 'location' : 'time since it last came in';
  const whole = slices.reduce((t, s) => t + s.value, 0);
  const select = (key: string) => (dimension === 'category' ? onCategory(key) : onHealth());

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Stock composition</Text>
      <Text style={styles.sub}>
        {view === 'line' ? 'Inventory account 1200 at each month end, over twelve months' : `Stock value by ${subject} · ${asOfLabel}`}
      </Text>
      <View style={styles.controls}>
        <Segmented options={VIEWS.map(v => v.label)} activeIndex={VIEWS.findIndex(v => v.key === view)} onChange={i => onView(VIEWS[i].key)} />
        {view !== 'line' ? (
          <Segmented
            options={DIMENSIONS.map(d => d.label)}
            activeIndex={DIMENSIONS.findIndex(d => d.key === dimension)}
            onChange={i => onDimension(DIMENSIONS[i].key)}
          />
        ) : null}
      </View>

      {selectedCategory ? (
        // Says what the ring's choice did, and how to undo it, where it was made.
        <View style={styles.filtered} accessibilityLiveRegion="polite">
          <Text style={styles.filteredText} numberOfLines={2}>
            The items list is filtered to <Text style={styles.filteredName}>{selectedCategory}</Text>
            {(() => {
              const c = categories.find(x => x.category === selectedCategory);
              return c ? ` · ${items(c.items)}` : '';
            })()}
          </Text>
          <TouchableOpacity
            onPress={onClearCategory}
            accessibilityRole="button"
            accessibilityLabel="Show all categories"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.link}>Show all</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {view === 'line' ? (
        trend.length > 0 ? (
          <MetricChart metric="closingValue" type="line" points={trend} />
        ) : (
          <Text style={styles.empty}>The month-end history is not available.</Text>
        )
      ) : fromHealth && (health.status === 'loading' || health.status === 'idle') && !h ? (
        <ReportSkeleton variant="inline" />
      ) : fromHealth && !h ? (
        <View style={styles.failed}>
          <Text style={styles.empty}>Stock by {dimension} could not be loaded.</Text>
          <TouchableOpacity onPress={onRetryHealth} accessibilityRole="button">
            <Text style={styles.link}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : view === 'pie' ? (
        <DonutChart
          title={`Stock value by ${subject}`}
          slices={slices}
          palette={palette}
          centerLabel="Stock value"
          labelHeader={DIMENSIONS.find(d => d.key === dimension)!.label}
          format={format}
          countLabel={items}
          selectedKey={dimension === 'category' ? selectedCategory || null : null}
          onSelect={select}
          selectVerb={dimension === 'category' ? 'List the items in' : 'Open the stock health list for'}
        />
      ) : (
        <RankedBars
          points={slices.map(s => ({
            key: s.key,
            label: s.label,
            value: s.value,
            hint: [s.count !== undefined ? items(s.count) : null, `${formatSliceShare(sliceShare(s, whole))} of stock`]
              .filter(Boolean)
              .join(' · '),
          }))}
          limit={slices.length || 1}
          format={format}
          onSelect={key => key !== OTHER_KEY && select(key)}
          activeKey={dimension === 'category' ? selectedCategory || null : null}
          emptyLabel="No stock to break down."
        />
      )}
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
  empty: { ...typography.bodySm, color: colors.textTertiary, paddingVertical: spacing.sm },
  failed: { alignItems: 'flex-start', gap: spacing.xxs },
  link: { ...typography.labelMd, color: colors.primary },
  filtered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.primaryTint,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filteredText: { ...typography.bodySm, color: colors.textPrimary, flex: 1 },
  filteredName: { ...typography.labelMd, color: colors.textPrimary },
});

export default StockComposition;
