// ═══════════════════════════════════════════════════════
// FinMatrix — Day Summary · panels
// ═══════════════════════════════════════════════════════
// Documents created (each tile a Day Book filter), money in and out by
// method, purchasing, what needs a look, the team (owner), and the day's P&L
// (owner).

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../../theme';
import { SectionCard } from '../../../components/reports/ReportUI';
import RankedBars from '../shared/RankedBars';
import { formatQty } from '../../../utils/formatters';
import type { DayReorderRow } from '../../../models/dayItemSheetModel';
import { compactMoney } from '../../../models/itemExplorerModel';
import {
  KIND_META,
  attentionItems,
  countLabel,
  dayMoney,
  dayShortLabel,
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
            accessibilityLabel={`${KIND_META[d.kind].label}: ${d.count}, ${dayMoney(d.total)}. Shows them in the Day Book.`}
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
    {summary.documents.some(d => d.count > 0) && summary.documents.some(d => d.count === 0 && d.kind !== active) ? (
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
        <Text style={styles.muted}>No money was received or paid out on this day.</Text>
      ) : (
        <>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.flex1]}>Method</Text>
            <Text style={[styles.th, styles.money]}>In</Text>
            <Text style={[styles.th, styles.money]}>Out</Text>
          </View>
          {cash.methods.map(m => (
            <View key={m.method} style={styles.tr}>
              <Text style={[styles.td, styles.flex1]}>{methodLabel(m.method)}</Text>
              <Text style={[styles.tdMoney, styles.money]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {m.received ? dayMoney(m.received) : '–'}
              </Text>
              <Text style={[styles.tdMoney, styles.money]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {m.paid ? dayMoney(m.paid) : '–'}
              </Text>
            </View>
          ))}
          <View style={[styles.tr, styles.trTotal]}>
            <Text style={[styles.tdStrong, styles.flex2]}>Net</Text>
            <Text style={[styles.tdStrong, styles.right, cash.net < 0 && { color: colors.danger }]}>
              {dayMoney(cash.net)}
            </Text>
          </View>
        </>
      )}
      {sales.returns > 0 ? (
        <View style={styles.afterReturns} accessibilityLabel="Sales after returns">
          <Text style={styles.th}>Sales after returns</Text>
          <View style={styles.tr}>
            <Text style={[styles.td, styles.flex2]}>Sales</Text>
            <Text style={[styles.tdMoney, styles.right]}>{dayMoney(sales.total)}</Text>
          </View>
          <View style={styles.tr}>
            <Text style={[styles.td, styles.flex2]}>Returns</Text>
            <Text style={[styles.tdMoney, styles.right, { color: colors.danger }]}>{dayMoney(-sales.returns)}</Text>
          </View>
          <View style={[styles.tr, styles.trTotal]}>
            <Text style={[styles.tdStrong, styles.flex2]}>Net sales</Text>
            <Text style={[styles.tdStrong, styles.right]}>{dayMoney(sales.net)}</Text>
          </View>
        </View>
      ) : null}
      {sales.unpaid > 0 ? (
        <Text style={styles.note}>
          <Text style={styles.noteStrong}>{dayMoney(sales.unpaid)}</Text> of this day’s sales is still unpaid.
        </Text>
      ) : null}
    </SectionCard>
  );
};

/**
 * What sold in the period and now needs buying in: out of stock first, then
 * the items at or below their reorder point. Stock is as it stands now.
 */
export const ReorderCard: React.FC<{
  reorder: DayReorderRow[];
  /** "on Thu 19 Nov" / "in 13–19 Nov": the period the items were sold in. */
  period: string;
  onOpen: (itemId: string) => void;
  onMore?: () => void;
}> = ({ reorder, period, onOpen, onMore }) => {
  if (reorder.length === 0) return null;
  const shown = reorder.slice(0, 8);
  return (
    <SectionCard
      title="Reorder soon"
      icon="alert-circle"
      subtitle={`${reorder.length === 1 ? '1 item' : `${reorder.length} items`} sold ${period} · stock now`}
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
        <TouchableOpacity
          style={styles.moreLink}
          onPress={onMore}
          disabled={!onMore}
          accessibilityRole="link"
          activeOpacity={0.7}
        >
          <Text style={styles.moreText}>See {reorder.length - shown.length} more in Inventory</Text>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </SectionCard>
  );
};

/** What an owner should look at — only when there is something. */
export const AttentionCard: React.FC<{
  summary: DaySummary;
  active: DayEntryFilter;
  onSelect: (f: DayEntryFilter) => void;
  onOpenPurchaseOrders?: () => void;
}> = ({ summary, active, onSelect, onOpenPurchaseOrders }) => {
  const items = attentionItems(summary);
  if (items.length === 0) return null;
  return (
    <SectionCard
      title="Needs a look"
      icon="alert-triangle"
      subtitle={`${items.length} ${items.length === 1 ? 'thing' : 'things'} to check`}
      style={styles.attention}
    >
      {items.map(item => {
        const filter = item.filter;
        const on = filter !== undefined && active === filter;
        const press = filter ? () => onSelect(on ? 'all' : filter) : onOpenPurchaseOrders;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.attentionRow, on && styles.attentionRowOn]}
            onPress={press}
            disabled={!press}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityHint={filter ? 'Shows them in the Day Book' : 'Opens Purchase orders'}
          >
            <Feather name="alert-circle" size={15} color={colors.warning} style={styles.attentionIcon} />
            <View style={styles.flex1}>
              <Text style={styles.attentionLabel}>{item.label}</Text>
              <Text style={styles.attentionDetail}>{item.detail}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        );
      })}
    </SectionCard>
  );
};

/**
 * The buying side of the day: purchase orders placed, goods received against
 * them and bills raised from them — then, for the owner, where the company's
 * purchase orders stand now.
 */
export const PurchasingCard: React.FC<{
  summary: DaySummary;
  onVendor: (vendorId: string) => void;
  onOpenPurchaseOrders?: () => void;
}> = ({ summary, onVendor, onOpenPurchaseOrders }) => {
  const p = summary.purchasing;
  if (!p) return null;
  const quiet = p.placed.count === 0 && p.received.count === 0 && p.billed.count === 0;
  const pos = (n: number) => `${n.toLocaleString('en-US')} ${n === 1 ? 'PO' : 'POs'}`;
  const rows = [
    { label: 'Placed', note: countLabel(p.placed.count, 'purchase_order'), value: p.placed.total },
    {
      label: 'Goods received',
      note: p.received.count ? `At cost · on ${pos(p.received.count)}` : 'Nothing arrived',
      value: p.received.total,
    },
    { label: 'Billed from POs', note: countLabel(p.billed.count, 'bill'), value: p.billed.total },
  ];
  const now = p.position;
  return (
    <SectionCard
      title="Purchasing"
      icon="shopping-cart"
      subtitle="Ordered, received and billed on the day"
      right={
        onOpenPurchaseOrders ? (
          <TouchableOpacity onPress={onOpenPurchaseOrders} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.headLink}>All POs</Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      {quiet ? (
        <Text style={styles.muted}>No purchase orders placed, goods received or bills from POs on this day.</Text>
      ) : (
        rows.map(r => (
          <View key={r.label} style={styles.tr} accessible accessibilityLabel={`${r.label}: ${dayMoney(r.value)}, ${r.note}`}>
            <View style={styles.flex1}>
              <Text style={styles.td}>{r.label}</Text>
              <Text style={styles.reorderMeta}>{r.note}</Text>
            </View>
            <Text style={styles.tdStrong}>{dayMoney(r.value)}</Text>
          </View>
        ))
      )}
      {p.topVendors.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.th}>Ordered from</Text>
          <RankedBars
            points={p.topVendors.map(v => ({
              key: v.id,
              label: v.name,
              value: v.total,
              hint: countLabel(v.count, 'purchase_order'),
            }))}
            format={compactMoney}
            emptyLabel="No purchase orders on this day."
            onSelect={onVendor}
            navigates
          />
        </View>
      ) : null}
      {now ? (
        <View style={styles.nowBlock}>
          <Text style={styles.th}>Right now</Text>
          <View style={styles.tr}>
            <Text style={[styles.td, styles.flex1]}>Still to arrive · {pos(now.open.count)}</Text>
            <Text style={styles.tdMoney}>{dayMoney(now.open.total)}</Text>
          </View>
          <View style={styles.tr}>
            <View style={styles.flex1}>
              <Text style={[styles.td, now.overdue.count > 0 && { color: colors.danger }]}>
                Overdue · {pos(now.overdue.count)}
              </Text>
              {now.overdue.oldest ? (
                <Text style={styles.reorderMeta}>Expected since {dayShortLabel(now.overdue.oldest)}</Text>
              ) : null}
            </View>
            <Text style={[styles.tdMoney, now.overdue.count > 0 && { color: colors.danger }]}>
              {dayMoney(now.overdue.total)}
            </Text>
          </View>
          <View style={[styles.tr, styles.trTotal]}>
            <Text style={[styles.td, styles.flex1]}>Received, not billed · {pos(now.receivedNotBilled.count)}</Text>
            <Text style={styles.tdMoney}>{dayMoney(now.receivedNotBilled.total)}</Text>
          </View>
        </View>
      ) : null}
    </SectionCard>
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
  showPurchaseOrders?: boolean;
  onSelect: (userId: string) => void;
}> = ({ team, showOrders, showPurchaseOrders = false, onSelect }) => (
  <SectionCard
    title="Team activity"
    icon="users"
    subtitle="Documents each person prepared. Tap someone to see only their day."
  >
    {team.length === 0 ? (
      <Text style={styles.muted}>Nobody entered anything on this day.</Text>
    ) : (
      <>
        <View style={styles.tableHead}>
          <Text style={[styles.th, styles.flex2]}>Person</Text>
          <Text style={[styles.th, styles.right]}>Invoices</Text>
          {showOrders ? <Text style={[styles.th, styles.right]}>Orders</Text> : null}
          <Text style={[styles.th, styles.right]}>Receipts</Text>
          {showPurchaseOrders ? <Text style={[styles.th, styles.right]}>POs</Text> : null}
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
            {showPurchaseOrders ? <Fig f={t.purchaseOrders} /> : null}
          </TouchableOpacity>
        ))}
      </>
    )}
  </SectionCard>
);

/** The day's P&L from the books, as a statement (owner, everyone's view). */
export const ProfitCard: React.FC<{ profit: NonNullable<DaySummary['profit']> }> = ({ profit }) => {
  const margin = profit.revenue !== 0 ? Math.round((profit.grossProfit / profit.revenue) * 100) : null;
  const line = (label: string, value: number, strong = false, tone?: string) => (
    <View style={[styles.tr, strong && styles.trStrong]} accessible accessibilityLabel={`${label}: ${dayMoney(value)}`}>
      <Text style={[strong ? styles.tdStrong : styles.td, styles.flex1]}>{label}</Text>
      <Text style={[strong ? styles.tdStrong : styles.tdMoney, tone ? { color: tone } : null]}>{dayMoney(value)}</Text>
    </View>
  );
  return (
    <SectionCard title="Profit for the day" icon="trending-up" subtitle="From the books: everything posted for the day">
      {line('Revenue', profit.revenue)}
      {line('Cost of sales', profit.cogs)}
      {line('Gross profit (books)', profit.grossProfit, true, profit.grossProfit < 0 ? colors.danger : undefined)}
      {margin !== null ? <Text style={styles.marginNote}>{margin}% gross margin</Text> : null}
      {line('Expenses', profit.expenses)}
      {line('Net profit', profit.netIncome, true, profit.netIncome < 0 ? colors.danger : colors.success)}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  right: { flex: 1, textAlign: 'right' },
  money: { flex: 1.3, textAlign: 'right' },
  headLink: { ...typography.labelMd, color: colors.primary },
  block: { marginTop: spacing.sm, gap: spacing.xs },
  nowBlock: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.neutral100,
  },
  trStrong: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  marginNote: { ...typography.caption, color: colors.textTertiary, textAlign: 'right', marginTop: 2 },
  moreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  moreText: { ...typography.labelMd, color: colors.primary },
  attentionIcon: { marginTop: 1 },
  muted: { ...typography.bodySm, color: colors.textTertiary, paddingVertical: spacing.xs },
  mutedInline: { color: colors.textSecondary },
  none: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm },
  link: { color: colors.primary },

  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  // Three to a row; a short last row stretches across rather than leaving gaps.
  docTile: {
    flexGrow: 1,
    flexBasis: '30%',
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

  attention: { borderWidth: 1, borderColor: colors.warningLight },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  attentionRowOn: { backgroundColor: colors.warningLighter },
  attentionLabel: { ...typography.labelMd, color: colors.textPrimary },
  attentionDetail: { ...typography.caption, color: colors.textSecondary },
});
