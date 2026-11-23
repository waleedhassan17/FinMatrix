// ═══════════════════════════════════════════════════════
// FinMatrix — Day Summary · panels
// ═══════════════════════════════════════════════════════
// Documents created (each tile a Day Book filter), money in and out by
// method, what needs a look, the team (owner), and the day's P&L (owner).

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../../theme';
import { SectionCard, FigureStrip } from '../../../components/reports/ReportUI';
import { formatCurrency, formatQty } from '../../../utils/formatters';
import type { DayReorderRow } from '../../../models/dayItemSheetModel';
import { compactMoney } from '../../../models/itemExplorerModel';
import {
  KIND_META,
  attentionItems,
  methodLabel,
  type DayEntryFilter,
  type DaySummary,
  type DayUserRow,
} from '../../../models/daySummaryModel';

const { colors, radius, spacing, typography } = THEME;

/** One tile per document type; choosing one narrows the Day Book below. */
export const DocumentGrid: React.FC<{
  summary: DaySummary;
  active: DayEntryFilter;
  onSelect: (f: DayEntryFilter) => void;
}> = ({ summary, active, onSelect }) => (
  <SectionCard title="Documents created" icon="layers" subtitle="Tap one to list it below">
    <View style={styles.docGrid}>
      {/* Only types with something in them (or the one chosen): a grid of
          zeros is noise. The rest are named in one line underneath. */}
      {summary.documents.filter(d => d.count > 0 || d.kind === active).map(d => {
        const on = active === d.kind;
        return (
          <TouchableOpacity
            key={d.kind}
            style={[styles.docTile, on && styles.docTileOn, d.count === 0 && !on && styles.docTileQuiet]}
            onPress={() => onSelect(on ? 'all' : d.kind)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${KIND_META[d.kind].label}: ${d.count}, ${formatCurrency(d.total)}`}
          >
            {/* Two lines, no icon: at a third of a phone's width "Vendor
                payments" would otherwise be cut to "Vendor p…". */}
            <Text style={[styles.docLabel, on && styles.docLabelOn]} numberOfLines={2}>
              {KIND_META[d.kind].label}
            </Text>
            <Text style={styles.docCount}>{d.count.toLocaleString('en-US')}</Text>
            <Text style={styles.docTotal} numberOfLines={1}>
              {d.count > 0 ? compactMoney(d.total) : '—'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
    {summary.documents.every(d => d.count === 0) ? (
      <Text style={styles.muted}>Nothing was created on this day.</Text>
    ) : null}
    {summary.documents.some(d => d.count === 0 && d.kind !== active) ? (
      <Text style={styles.none}>
        None:{' '}
        {summary.documents
          .filter(d => d.count === 0 && d.kind !== active)
          .map(d => KIND_META[d.kind].label.toLowerCase())
          .join(', ')}
        .
      </Text>
    ) : null}
  </SectionCard>
);

/** Receipts in, vendor payments out, by method; and what is still unpaid. */
export const MoneyCard: React.FC<{ summary: DaySummary }> = ({ summary }) => {
  const { cash, sales } = summary;
  return (
    <SectionCard title="Money in and out" icon="dollar-sign">
      {cash.methods.length === 0 ? (
        <Text style={styles.muted}>No receipts or vendor payments on this day.</Text>
      ) : (
        <>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.flex2]}>Method</Text>
            <Text style={[styles.th, styles.right]}>In</Text>
            <Text style={[styles.th, styles.right]}>Out</Text>
          </View>
          {cash.methods.map(m => (
            <View key={m.method} style={styles.tr}>
              <Text style={[styles.td, styles.flex2]}>{methodLabel(m.method)}</Text>
              <Text style={[styles.tdMoney, styles.right]}>{m.received ? compactMoney(m.received) : '—'}</Text>
              <Text style={[styles.tdMoney, styles.right]}>{m.paid ? compactMoney(m.paid) : '—'}</Text>
            </View>
          ))}
          <View style={[styles.tr, styles.trTotal]}>
            <Text style={[styles.tdStrong, styles.flex2]}>Net</Text>
            <Text style={[styles.tdStrong, styles.right, cash.net < 0 && { color: colors.danger }]}>
              {formatCurrency(cash.net)}
            </Text>
          </View>
        </>
      )}
      {sales.returns > 0 ? (
        <View style={styles.afterReturns} accessibilityLabel="Sales after returns">
          <Text style={styles.th}>Sales after returns</Text>
          <View style={styles.tr}>
            <Text style={[styles.td, styles.flex2]}>Sales</Text>
            <Text style={[styles.tdMoney, styles.right]}>{formatCurrency(sales.total)}</Text>
          </View>
          <View style={styles.tr}>
            <Text style={[styles.td, styles.flex2]}>Returns</Text>
            <Text style={[styles.tdMoney, styles.right, { color: colors.danger }]}>−{formatCurrency(sales.returns)}</Text>
          </View>
          <View style={[styles.tr, styles.trTotal]}>
            <Text style={[styles.tdStrong, styles.flex2]}>Net sales</Text>
            <Text style={[styles.tdStrong, styles.right]}>{formatCurrency(sales.net)}</Text>
          </View>
        </View>
      ) : null}
      {sales.unpaid > 0 ? (
        <Text style={styles.note}>
          <Text style={styles.noteStrong}>{formatCurrency(sales.unpaid)}</Text> of this day’s sales is still unpaid.
        </Text>
      ) : null}
    </SectionCard>
  );
};

/**
 * What sold in the period and now needs buying in: out of stock first, then
 * the items at or below their reorder point. Stock is as it stands now.
 */
export const ReorderCard: React.FC<{ reorder: DayReorderRow[]; onOpen: (itemId: string) => void }> = ({
  reorder,
  onOpen,
}) => {
  if (reorder.length === 0) return null;
  const shown = reorder.slice(0, 8);
  return (
    <SectionCard
      title="Reorder soon"
      icon="alert-circle"
      subtitle={
        reorder.length === 1 ? '1 item sold that needs buying in' : `${reorder.length} items sold that need buying in`
      }
    >
      {shown.map(r => (
        <TouchableOpacity
          key={r.itemId}
          style={styles.tr}
          activeOpacity={0.7}
          onPress={() => onOpen(r.itemId)}
          accessibilityRole="button"
          accessibilityLabel={`${r.name}: ${r.outOfStock ? 'out of stock' : `${formatQty(r.onHand)} left`}`}
        >
          <View style={styles.flex2}>
            <Text style={styles.td} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={styles.reorderMeta} numberOfLines={1}>
              {[
                r.code,
                r.reorderPoint > 0 ? `reorder at ${formatQty(r.reorderPoint)}` : null,
                r.reorderQuantity > 0 ? `order ${formatQty(r.reorderQuantity)}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <Text style={[styles.tdStrong, { color: r.outOfStock ? colors.danger : colors.warning }]}>
            {r.outOfStock ? 'Out of stock' : `${formatQty(r.onHand)} left`}
          </Text>
        </TouchableOpacity>
      ))}
      {reorder.length > shown.length ? (
        <Text style={styles.note}>{reorder.length - shown.length} more — see Inventory.</Text>
      ) : null}
    </SectionCard>
  );
};

/** What an owner should look at — only when there is something. */
export const AttentionCard: React.FC<{
  summary: DaySummary;
  active: DayEntryFilter;
  onSelect: (f: DayEntryFilter) => void;
}> = ({ summary, active, onSelect }) => {
  const items = attentionItems(summary);
  if (items.length === 0) return null;
  return (
    <View style={styles.attention}>
      <View style={styles.attentionHead}>
        <Feather name="alert-triangle" size={15} color={colors.warning} />
        <Text style={styles.attentionTitle}>Needs a look</Text>
      </View>
      {items.map(item => (
        <TouchableOpacity
          key={item.filter}
          style={[styles.attentionRow, active === item.filter && styles.attentionRowOn]}
          onPress={() => onSelect(active === item.filter ? 'all' : item.filter)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityState={{ selected: active === item.filter }}
        >
          <View style={styles.flex1}>
            <Text style={styles.attentionLabel}>{item.label}</Text>
            <Text style={styles.attentionDetail}>{item.detail}</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

/** A count over its amount: two short lines fit a phone's narrow columns. */
const Fig: React.FC<{ f: { count: number; total: number } }> = ({ f }) =>
  f.count === 0 ? (
    <Text style={[styles.td, styles.right, styles.mutedInline]}>—</Text>
  ) : (
    <View style={styles.figCell}>
      <Text style={styles.tdStrong}>{f.count}</Text>
      <Text style={styles.figAmount} numberOfLines={1}>
        {compactMoney(f.total)}
      </Text>
    </View>
  );

/** Who entered what (owner). A row narrows the whole screen to that person. */
export const TeamCard: React.FC<{
  team: DayUserRow[];
  showOrders: boolean;
  onSelect: (userId: string) => void;
}> = ({ team, showOrders, onSelect }) => (
  <SectionCard title="Team activity" icon="users" subtitle="Tap a person to see only their day">
    {team.length === 0 ? (
      <Text style={styles.muted}>Nobody entered anything on this day.</Text>
    ) : (
      <>
        <View style={styles.tableHead}>
          <Text style={[styles.th, styles.flex2]}>Person</Text>
          <Text style={[styles.th, styles.right]}>Invoices</Text>
          {showOrders ? <Text style={[styles.th, styles.right]}>Orders</Text> : null}
          <Text style={[styles.th, styles.right]}>Receipts</Text>
        </View>
        {team.map(t => (
          <TouchableOpacity
            key={t.userId ?? 'none'}
            style={styles.tr}
            disabled={!t.userId}
            onPress={() => t.userId && onSelect(t.userId)}
            activeOpacity={0.7}
            accessibilityRole={t.userId ? 'button' : undefined}
            accessibilityLabel={t.userId ? `Show only ${t.name}’s day` : t.name}
          >
            <Text style={[styles.td, styles.flex2, t.userId ? styles.link : styles.mutedInline]} numberOfLines={1}>
              {t.name}
            </Text>
            <Fig f={t.invoices} />
            {showOrders ? <Fig f={t.salesOrders} /> : null}
            <Fig f={t.receipts} />
          </TouchableOpacity>
        ))}
      </>
    )}
  </SectionCard>
);

/** The day's P&L from the books (owner, everyone's view). */
export const ProfitStrip: React.FC<{ profit: NonNullable<DaySummary['profit']> }> = ({ profit }) => (
  <FigureStrip
    items={[
      { label: 'Revenue (books)', value: compactMoney(profit.revenue), caption: 'Posted, net of tax' },
      {
        label: 'Gross profit',
        value: compactMoney(profit.grossProfit),
        caption: profit.revenue ? `${Math.round((profit.grossProfit / profit.revenue) * 100)}% margin` : 'No revenue',
        tone: profit.grossProfit < 0 ? 'danger' : 'default',
      },
      { label: 'Expenses', value: compactMoney(profit.expenses), caption: 'Posted on this day' },
      {
        label: 'Net profit',
        value: compactMoney(profit.netIncome),
        caption: 'As the P&L shows it',
        tone: profit.netIncome < 0 ? 'danger' : 'default',
      },
    ]}
  />
);

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  right: { flex: 1, textAlign: 'right' },
  muted: { ...typography.bodySm, color: colors.textTertiary, paddingVertical: spacing.xs },
  mutedInline: { color: colors.textSecondary },
  none: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm },
  link: { color: colors.primary },

  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  docTile: {
    width: '31.5%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  docTileOn: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primaryTint },
  docTileQuiet: { opacity: 0.65 },
  docLabel: { ...typography.caption, color: colors.textSecondary, minHeight: 32 },
  docLabelOn: { color: colors.primary },
  docCount: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.xxs },
  docTotal: { ...typography.caption, color: colors.textTertiary },

  tableHead: {
    flexDirection: 'row',
    paddingBottom: spacing.xxs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  th: { ...typography.overline, color: colors.textSecondary },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  trTotal: { borderBottomWidth: 0 },
  td: { ...typography.caption, color: colors.textPrimary },
  tdMoney: { ...typography.caption, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  tdStrong: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  note: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  afterReturns: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  reorderMeta: { ...typography.caption, color: colors.textTertiary },
  figCell: { flex: 1, minWidth: 0, alignItems: 'flex-end' },
  figAmount: { ...typography.caption, color: colors.textTertiary, fontVariant: ['tabular-nums'] },
  noteStrong: { ...typography.labelSm, color: colors.textPrimary },

  attention: {
    backgroundColor: colors.warningLighter,
    borderColor: colors.warningLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  attentionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xxs },
  attentionTitle: { ...typography.labelLg, color: colors.textPrimary },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  attentionRowOn: { backgroundColor: colors.surface },
  attentionLabel: { ...typography.labelMd, color: colors.textPrimary },
  attentionDetail: { ...typography.caption, color: colors.textSecondary },
});
