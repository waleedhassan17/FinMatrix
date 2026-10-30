// ═══════════════════════════════════════════════════════
// FinMatrix — Where the item's stock stands today
// ═══════════════════════════════════════════════════════
// The quantity and what it is carried at; a bar of on hand against the
// reorder point, with what the reorder list would order when it is due; and
// how long the stock lasts at the window's selling rate, with the server's
// verdict on it — a week from running out and a year on the shelf are both
// problems, and the pill says which this is. The website's Stock position.
//
// The bar is drawn in the brand colour whatever the state: the state is the
// badge's and the pill's to say, in words.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';

import { THEME } from '../../../theme';
import { SectionCard } from '../../../components/reports/ReportUI';
import AssessmentPill from '../../../components/reports/AssessmentPill';
import { coverText, stockMeter, unitsText } from '../../../models/itemExplorerModel';
import type { ItemFacts } from '../../../models/inventoryValuationModel';
import type { KpiAssessment } from '../../../models/kpiModel';
import { formatCurrency } from '../../../utils/formatters';
import { FactRow } from './FactRow';

const { colors, radius, spacing, typography } = THEME;

interface Props {
  /** Null from a server before the explorer's facts: on hand only. */
  facts: ItemFacts | null;
  onHand: number | null;
  cover: { days: number | null; assessment: KpiAssessment | null } | null;
  sinceSold: number | null;
}

const ItemStockPosition: React.FC<Props> = ({ facts, onHand, cover, sinceSold }) => {
  const [showGuide, setShowGuide] = useState(false);
  const uom = facts?.unitOfMeasure ?? 'unit';
  const meter = facts && onHand !== null ? stockMeter(onHand, facts.reorderPoint) : null;
  const point = facts?.reorderPoint ?? 0;
  // Ordering more of something that has not moved in six months is the wrong advice.
  const suggestion = facts && !facts.deadStock ? facts.suggestedOrderQty : null;
  const guide = cover?.assessment?.guide;

  return (
    <SectionCard title="Stock position" icon="package" right={<AssessmentPill assessment={cover?.assessment ?? null} />}>
      <Text style={styles.onHand}>{onHand === null ? '—' : unitsText(onHand, uom)}</Text>
      {facts ? <Text style={styles.sub}>{formatCurrency(facts.stockValue, 'Rs ')} at average cost</Text> : null}

      {meter && onHand !== null ? (
        <View style={styles.meterBox}>
          <View
            style={styles.track}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${unitsText(onHand, uom)} on hand; the reorder point is ${unitsText(point, uom)}`}
          >
            <View style={[styles.fill, { width: `${meter.fillPct}%` }]} />
            <View style={[styles.tick, { left: `${meter.tickPct}%` }]} />
          </View>
          <Text style={[styles.tickLabel, { marginLeft: `${Math.min(55, Math.max(0, meter.tickPct - 15))}%` }]}>
            Reorder at {unitsText(point, uom)}
          </Text>
          <Text style={[styles.headroom, meter.headroom < 0 && styles.headroomBelow]}>
            {meter.headroom > 0
              ? `${unitsText(meter.headroom, uom)} above the reorder point`
              : meter.headroom === 0
                ? 'At the reorder point'
                : `${unitsText(-meter.headroom, uom)} below the reorder point`}
            {suggestion !== null && suggestion > 0 ? (
              <Text style={styles.suggest}> · Suggested order {unitsText(suggestion, uom)}</Text>
            ) : null}
          </Text>
        </View>
      ) : null}

      {facts ? (
        <View style={styles.facts}>
          <FactRow
            label="Days of cover"
            value={coverText(cover?.days ?? null)}
            muted={cover?.days === null}
            labelAccessory={
              guide ? (
                <Pressable
                  onPress={() => setShowGuide(v => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="How days of cover is read"
                  accessibilityState={{ expanded: showGuide }}
                >
                  <Feather name="info" size={13} color={colors.textTertiary} />
                </Pressable>
              ) : null
            }
          />
          {showGuide && guide ? (
            <Text style={styles.guide}>
              {guide} Stock on hand ÷ the units sold a day in this window, counting only the days that have passed.
            </Text>
          ) : null}
          {facts.location ? <FactRow label="Location" value={facts.location} /> : null}
          <FactRow
            label="Last sold"
            value={facts.lastSoldDate ? dayjs(facts.lastSoldDate).format('MMM D, YYYY') : 'Never'}
            detail={
              facts.lastSoldDate && sinceSold !== null
                ? sinceSold === 0
                  ? 'Today'
                  : `${sinceSold} day${sinceSold === 1 ? '' : 's'} ago`
                : undefined
            }
          />
        </View>
      ) : null}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  onHand: { ...typography.h3, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  meterBox: { marginTop: spacing.md },
  track: { height: 8, borderRadius: radius.full, backgroundColor: colors.neutral100 },
  fill: { height: 8, borderRadius: radius.full, backgroundColor: colors.primary },
  tick: { position: 'absolute', top: -3, width: 2, height: 14, marginLeft: -1, borderRadius: 1, backgroundColor: colors.textPrimary },
  tickLabel: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xxs },
  headroom: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  headroomBelow: { color: colors.textPrimary },
  suggest: { ...typography.labelSm, color: colors.textPrimary },
  facts: {
    marginTop: spacing.md,
    paddingTop: spacing.xxs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  guide: { ...typography.caption, color: colors.textSecondary, paddingBottom: spacing.xs },
});

export default ItemStockPosition;
