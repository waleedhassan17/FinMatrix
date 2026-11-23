// ═══════════════════════════════════════════════════════
// FinMatrix — Item-wise sales (Day Summary)
// ═══════════════════════════════════════════════════════
// Every item sold in the period, grouped by category (or agency): units sold,
// given free and returned, net units and net sales — and for the owner gross
// profit and margin. Subtotals per group, a grand total, and a line showing
// the total ties to the period's invoices. The same sheet as the website's.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../../theme';
import {
  SectionCard,
  Segmented,
  FilterChip,
  DateField,
  ReportSkeleton,
  ErrorBlock,
  EmptyBlock,
} from '../../../components/reports/ReportUI';
import { formatCurrency } from '../../../utils/formatters';
import {
  FOLD_AFTER,
  GROUPING_LABELS,
  ITEM_GROUPINGS,
  ITEM_SORTS,
  ITEM_SORT_LABELS,
  groupItemSheet,
  marginText,
  qtyCell,
  sheetChange,
  sheetPeriodLabel,
  uncategorizedShare,
  type DayItemSheet,
  type DayItemSheetRow,
  type ItemGrouping,
  type ItemSort,
  type SheetGroup,
  type SheetTotals,
} from '../../../models/dayItemSheetModel';

const { colors, radius, spacing, typography } = THEME;
const SEARCH_DELAY_MS = 300;

export interface ItemSalesCardProps {
  sheet: DayItemSheet | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  mode: 'day' | 'range';
  onMode: (mode: 'day' | 'range') => void;
  from: string;
  to: string;
  onRange: (from: string, to: string) => void;
  groupBy: ItemGrouping;
  onGroupBy: (g: ItemGrouping) => void;
  sort: ItemSort;
  onSort: (s: ItemSort) => void;
  query: string;
  onSearch: (q: string) => void;
  /** "vs day before" / "vs last week". */
  compareLabel: string;
  onOpenItem: (itemId: string) => void;
  onSharePdf: () => void;
  sharing: boolean;
}

const Change: React.FC<{ current: number; previous: number | null }> = ({ current, previous }) => {
  const c = sheetChange(current, previous);
  if (!c) return <Text style={styles.muted}>–</Text>;
  return <Text style={c.up ? styles.up : styles.down}>{c.text}</Text>;
};

const ItemSalesCard: React.FC<ItemSalesCardProps> = props => {
  const { sheet, loading, error, groupBy, sort, query } = props;
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState(query);

  // The search applies when typing pauses.
  useEffect(() => {
    const next = draft.trim();
    if (next === query) return undefined;
    const t = setTimeout(() => props.onSearch(next), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [draft, query, props]);

  const view = sheet ? groupItemSheet(sheet, { groupBy, sort, q: query }) : null;
  const period = sheet ? sheetPeriodLabel(sheet.from, sheet.to) : sheetPeriodLabel(props.from, props.to);
  const foldByDefault = (sheet?.rows.length ?? 0) > FOLD_AFTER;
  const isFolded = (key: string) => folded[key] ?? foldByDefault;
  const toggle = (key: string) => setFolded(p => ({ ...p, [key]: !(p[key] ?? foldByDefault) }));
  const allFolded = view ? view.groups.every(g => isFolded(g.key)) : false;
  const toggleAll = () => setFolded(view ? Object.fromEntries(view.groups.map(g => [g.key, !allFolded])) : {});

  const subtitle = [
    period,
    sheet && sheet.rows.length > 0 ? `${sheet.rows.length} ${sheet.rows.length === 1 ? 'line' : 'lines'}` : null,
    sheet?.compare ? props.compareLabel : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SectionCard
      title="Item-wise sales"
      subtitle={subtitle}
      icon="shopping-bag"
      right={
        <TouchableOpacity
          onPress={props.onSharePdf}
          disabled={!sheet || sheet.rows.length === 0 || props.sharing}
          style={[styles.iconButton, (!sheet || sheet.rows.length === 0) && styles.iconButtonOff]}
          accessibilityRole="button"
          accessibilityLabel="Share the item-wise sales sheet as a PDF"
        >
          <Feather name="share-2" size={16} color={colors.primary} />
        </TouchableOpacity>
      }
    >
      {/* ── How the sheet is read ───────────────────────── */}
      <View style={styles.controls}>
        <Segmented
          options={['This day', 'Date range']}
          activeIndex={props.mode === 'day' ? 0 : 1}
          onChange={i => props.onMode(i === 0 ? 'day' : 'range')}
        />
        {props.mode === 'range' ? (
          <View style={styles.rangeRow}>
            <DateField
              label="From"
              value={props.from}
              onChange={d => props.onRange(d, props.to)}
              style={styles.rangeField}
            />
            <DateField
              label="To"
              value={props.to}
              onChange={d => props.onRange(props.from, d)}
              style={styles.rangeField}
            />
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {ITEM_GROUPINGS.map(g => (
            <FilterChip
              key={g}
              label={g === 'none' ? 'No groups' : `By ${GROUPING_LABELS[g].toLowerCase()}`}
              icon={g === 'none' ? 'list' : 'folder'}
              active={groupBy === g}
              onPress={() => props.onGroupBy(g)}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {ITEM_SORTS.map(o => (
            <FilterChip
              key={o}
              label={ITEM_SORT_LABELS[o]}
              icon={sort === o ? 'arrow-down' : undefined}
              active={sort === o}
              onPress={() => props.onSort(o)}
            />
          ))}
        </ScrollView>
        <View style={styles.search}>
          <Feather name="search" size={15} color={colors.textTertiary} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Find an item or code"
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Find an item or code"
          />
          {draft ? (
            <TouchableOpacity
              onPress={() => setDraft('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Clear search"
            >
              <Feather name="x-circle" size={15} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading && !sheet ? <ReportSkeleton variant="list" rows={5} /> : null}
      {!loading && error && !sheet ? <ErrorBlock message={error} onRetry={props.onRetry} /> : null}

      {sheet && view ? (
        <View style={[styles.sheet, loading && styles.busy]}>
          <Figures totals={view.totals} sheet={sheet} />

          {sheet.rows.length === 0 ? (
            <EmptyBlock
              icon="package"
              title={`No items sold in ${period}`}
              hint="Invoices, delivered orders and returns dated in the period show here, item by item."
            />
          ) : view.groups.length === 0 ? (
            <Text style={styles.noMatch}>No item matches “{query}”.</Text>
          ) : (
            <>
              <TouchableOpacity onPress={toggleAll} style={styles.foldAll} accessibilityRole="button">
                <Text style={styles.link}>{allFolded ? 'Expand all groups' : 'Collapse all groups'}</Text>
              </TouchableOpacity>
              {view.groups.map(g => (
                <Group
                  key={g.key}
                  group={g}
                  sheet={sheet}
                  folded={isFolded(g.key)}
                  onToggle={() => toggle(g.key)}
                  onOpenItem={props.onOpenItem}
                />
              ))}
              <View style={styles.grand}>
                <View style={styles.flex}>
                  <Text style={styles.grandLabel}>{view.filtered ? 'Total (items shown)' : 'Grand total'}</Text>
                  <Text style={styles.caption}>
                    {qtyCell(view.totals.net)} net units
                    {sheet.hasFree ? ` · ${qtyCell(view.totals.free)} free` : ''}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.grandValue}>{formatCurrency(view.totals.value)}</Text>
                  {sheet.showCost && view.totals.profit !== null ? (
                    <Text style={styles.caption}>
                      GP {formatCurrency(view.totals.profit)} · {marginText(view.totals.margin)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </>
          )}

          <Notes sheet={sheet} groupBy={groupBy} />
        </View>
      ) : null}
    </SectionCard>
  );
};

/** Four figures in a 2×2 grid — the same four on every phone. */
const Figures: React.FC<{ totals: SheetTotals; sheet: DayItemSheet }> = ({
  totals: t,
  sheet,
}) => {
  const tiles: Array<{ label: string; value: string; note?: React.ReactNode; danger?: boolean }> = [
    { label: 'Net units', value: qtyCell(t.net), note: sheet.hasFree ? `incl. ${qtyCell(t.free)} free` : undefined },
    {
      label: 'Net sales',
      value: formatCurrency(t.value),
      note: sheet.compare ? <Change current={t.value} previous={t.compareValue} /> : undefined,
    },
    {
      label: 'Returns',
      value: formatCurrency(-t.returnsValue).replace(/^-/, '−'),
      note: t.returned > 0 ? `${qtyCell(t.returned)} units back` : 'None',
      danger: t.returnsValue > 0,
    },
    sheet.showCost && t.profit !== null
      ? {
          label: 'Gross profit on items',
          value: formatCurrency(t.profit).replace(/^-/, '−'),
          note: t.margin === null ? undefined : `${t.margin.toFixed(1)}% margin`,
          danger: t.profit < 0,
        }
      : { label: 'Lines sold', value: String(t.lines) },
  ];
  return (
    <View style={styles.figures}>
      {tiles.map((tile, i) => (
        <View key={tile.label} style={[styles.figure, i % 2 === 0 && styles.figureLeft, i >= 2 && styles.figureBelow]}>
          <Text style={styles.figureLabel}>{tile.label}</Text>
          <Text
            style={[styles.figureValue, tile.danger && styles.dangerText]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {tile.value}
          </Text>
          {tile.note !== undefined ? <Text style={styles.caption}>{tile.note}</Text> : null}
        </View>
      ))}
    </View>
  );
};

const Group: React.FC<{
  group: SheetGroup;
  sheet: DayItemSheet;
  folded: boolean;
  onToggle: () => void;
  onOpenItem: (itemId: string) => void;
}> = ({ group: g, sheet, folded, onToggle, onOpenItem }) => {
  const count = `${g.rows.length} ${
    g.services ? (g.rows.length === 1 ? 'line' : 'lines') : g.rows.length === 1 ? 'item' : 'items'
  }`;
  return (
    <View style={styles.group}>
      <TouchableOpacity
        onPress={onToggle}
        style={styles.groupHead}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: !folded }}
        accessibilityLabel={`${g.label}, ${count}, ${formatCurrency(g.totals.value)}`}
      >
        <Feather name={folded ? 'chevron-right' : 'chevron-down'} size={16} color={colors.textTertiary} />
        <View style={styles.flex}>
          <Text style={styles.groupLabel} numberOfLines={1}>
            {g.label}
          </Text>
          <Text style={styles.caption}>
            {count} · {qtyCell(g.totals.net)} net
          </Text>
        </View>
        {folded ? (
          // Folded, the heading carries the group's figures; open, its Total row does.
          <View style={styles.right}>
            <Text style={styles.groupValue}>{formatCurrency(g.totals.value)}</Text>
            {sheet.compare ? <Change current={g.totals.value} previous={g.totals.compareValue} /> : null}
          </View>
        ) : null}
      </TouchableOpacity>
      {!folded ? (
        <>
          {g.rows.map(r => (
            <ItemRow key={r.itemId ?? `svc:${r.name}`} row={r} sheet={sheet} onOpenItem={onOpenItem} />
          ))}
          <View style={styles.subtotal}>
            <Text style={[styles.subtotalLabel, styles.flex]} numberOfLines={1}>
              {g.label.length <= 18 ? `Total ${g.label}` : 'Total'}
            </Text>
            <View style={styles.right}>
              <Text style={styles.subtotalValue}>{formatCurrency(g.totals.value)}</Text>
              {sheet.showCost && !g.services && g.totals.profit !== null ? (
                <Text style={styles.caption}>
                  GP {formatCurrency(g.totals.profit)} · {marginText(g.totals.margin)}
                </Text>
              ) : null}
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
};

const ItemRow: React.FC<{ row: DayItemSheetRow; sheet: DayItemSheet; onOpenItem: (itemId: string) => void }> = ({
  row: r,
  sheet,
  onOpenItem,
}) => {
  const moves = [
    `Sold ${qtyCell(r.sold)}`,
    r.free > 0 ? `Free ${qtyCell(r.free)}` : null,
    r.returned > 0 ? `Returned ${qtyCell(r.returned)}` : null,
  ].filter(Boolean);
  // A service has no cost of goods: its "profit" is the sale itself, so it is not repeated.
  const showProfit = sheet.showCost && r.kind === 'item' && r.profit !== null;
  const body = (
    <>
      <View style={styles.flex}>
        <Text style={styles.itemName} numberOfLines={1}>
          {r.name}
        </Text>
        {r.code ? (
          <Text style={styles.code} numberOfLines={1}>
            {r.code}
            {r.unit && r.unit !== 'unit' ? ` · ${r.unit}` : ''}
          </Text>
        ) : null}
        <Text style={[styles.caption, r.returned > 0 && styles.secondaryText]}>{moves.join(' · ')}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.itemValue, r.value < 0 && styles.dangerText]}>{formatCurrency(r.value)}</Text>
        <Text style={styles.caption}>
          {qtyCell(r.net)} net
          {sheet.compare ? (
            <>
              {' · '}
              <Change current={r.value} previous={r.compareValue} />
            </>
          ) : null}
        </Text>
        {showProfit ? (
          <Text style={[styles.caption, (r.profit ?? 0) < 0 && styles.dangerText]}>
            GP {formatCurrency(r.profit ?? 0)} · {marginText(r.margin)}
            {r.costMissing ? ' *' : ''}
          </Text>
        ) : null}
      </View>
    </>
  );
  if (!r.itemId) return <View style={styles.item}>{body}</View>;
  return (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.7}
      onPress={() => onOpenItem(r.itemId!)}
      accessibilityRole="button"
      accessibilityLabel={`${r.name}: ${formatCurrency(r.value)}, ${qtyCell(r.net)} net units`}
    >
      {body}
    </TouchableOpacity>
  );
};

/** How the figures are worked out, and that they tie to the documents. */
const Notes: React.FC<{ sheet: DayItemSheet; groupBy: ItemGrouping }> = ({ sheet, groupBy }) => {
  const tie = sheet.reconciliation;
  return (
    <View style={styles.notes}>
      {sheet.rows.length > 0 ? (
        <View style={styles.tie}>
          <Feather
            name={tie.matches ? 'check-circle' : 'info'}
            size={13}
            color={tie.matches ? colors.success : colors.warning}
            style={styles.tieIcon}
          />
          <Text style={[styles.caption, styles.flex]}>
            Net sales {formatCurrency(tie.netSales)} = invoices before tax, after discounts{' '}
            {formatCurrency(tie.salesBeforeTax)} − returns {formatCurrency(tie.returns)}.{' '}
            {tie.matches
              ? 'The sheet adds up to exactly that.'
              : `The sheet shows ${formatCurrency(sheet.totals.value)}; some lines could not be matched to an item.`}
          </Text>
        </View>
      ) : null}
      <Text style={styles.caption}>
        Net units = sold + free − returned. Free units were given at price 0. Net sales are before tax, after each
        invoice’s discount, less returns.{sheet.showCost ? ' GP is gross profit on stock items: net sales less the cost of the goods (services and charges carry none).' : ''}
      </Text>
      {groupBy === 'category' && uncategorizedShare(sheet) >= 0.3 ? (
        <Text style={styles.caption}>
          Most of these items have no category. Give items a category in Inventory (for example “NESTLE POWDER”) to
          group the sheet by product line.
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end', marginLeft: spacing.sm },
  muted: { ...typography.caption, color: colors.textTertiary },
  up: { ...typography.caption, color: colors.success },
  down: { ...typography.caption, color: colors.danger },
  caption: { ...typography.caption, color: colors.textTertiary },
  secondaryText: { color: colors.textSecondary },
  dangerText: { color: colors.danger },
  link: { ...typography.labelMd, color: colors.primary },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonOff: { opacity: 0.4 },

  controls: { gap: spacing.xs },
  rangeRow: { flexDirection: 'row', gap: spacing.xs },
  rangeField: { flex: 1 },
  chips: { gap: spacing.xs, paddingVertical: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.textPrimary, paddingVertical: 0 },

  sheet: { marginTop: spacing.sm },
  busy: { opacity: 0.6 },
  noMatch: { ...typography.bodySm, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.md },

  figures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  figure: { width: '50%', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  figureLeft: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.borderLight },
  figureBelow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
  figureLabel: { ...typography.caption, color: colors.textTertiary },
  figureValue: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'] },

  foldAll: { alignSelf: 'flex-end', paddingVertical: spacing.xxs, marginBottom: spacing.xxs },

  group: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  groupLabel: { ...typography.labelMd, color: colors.textPrimary },
  groupValue: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  itemName: { ...typography.bodySm, color: colors.textPrimary },
  code: { ...typography.caption, color: colors.textTertiary, fontVariant: ['tabular-nums'] },
  itemValue: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },

  subtotal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subtotalLabel: { ...typography.labelMd, color: colors.textPrimary },
  subtotalValue: { ...typography.labelMd, color: colors.textPrimary, fontVariant: ['tabular-nums'] },

  grand: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.xxs,
    borderTopWidth: 2,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
  },
  grandLabel: { ...typography.labelLg, color: colors.textPrimary },
  grandValue: { ...typography.h5, color: colors.textPrimary, fontVariant: ['tabular-nums'] },

  notes: { gap: spacing.xs, marginTop: spacing.sm },
  tie: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  tieIcon: { marginTop: 2 },
});

export default ItemSalesCard;
