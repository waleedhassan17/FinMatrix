// ═══════════════════════════════════════════════════════
// FinMatrix — Reports hub · Today
// ═══════════════════════════════════════════════════════
// Four figures before any report: cash on hand, what customers owe that is
// late, what is due to suppliers this week, and how many items need
// reordering. Each tile opens the report it comes from; each fails on its own
// and says "—" with a retry, so one slow endpoint never blanks the hub.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { THEME } from '../../../theme';
import { compactMoney } from '../../../models/itemExplorerModel';
import type { Remote } from '../../../models/remoteModel';
import type { HubToday } from './reportsHubSlice';

const { colors, radius, spacing, typography } = THEME;

interface Tile {
  key: keyof HubToday;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  target: string;
  params?: object;
  value: (t: HubToday) => string | null;
  caption: (t: HubToday) => string | null;
  tone?: (t: HubToday) => 'default' | 'warning';
}

const TILES: Tile[] = [
  {
    key: 'cash',
    label: 'Cash on hand',
    icon: 'dollar-sign',
    target: 'CashFlow',
    value: t => (t.cash.data === null || t.cash.data === undefined ? null : compactMoney(t.cash.data)),
    caption: () => 'Cash and bank',
  },
  {
    key: 'overdueAr',
    label: 'Overdue from customers',
    icon: 'arrow-down-left',
    target: 'ARAging',
    value: t => (t.overdueAr.data ? compactMoney(t.overdueAr.data.overdue) : null),
    caption: t =>
      t.overdueAr.data ? `${t.overdueAr.data.parties} customer${t.overdueAr.data.parties === 1 ? '' : 's'} late` : null,
    tone: t => ((t.overdueAr.data?.overdue ?? 0) > 0 ? 'warning' : 'default'),
  },
  {
    key: 'apDue',
    label: 'Due to suppliers this week',
    icon: 'arrow-up-right',
    target: 'APAging',
    value: t => (t.apDue.data ? compactMoney(t.apDue.data.dueThisWeek) : null),
    caption: t => (t.apDue.data && t.apDue.data.overdue > 0 ? `+ ${compactMoney(t.apDue.data.overdue)} overdue` : 'Nothing overdue'),
    tone: t => ((t.apDue.data?.overdue ?? 0) > 0 ? 'warning' : 'default'),
  },
  {
    key: 'belowReorder',
    label: 'Below reorder point',
    icon: 'shopping-cart',
    target: 'InventoryValuation',
    params: { tab: 'health' },
    value: t => (t.belowReorder.data === null || t.belowReorder.data === undefined ? null : String(t.belowReorder.data)),
    caption: t => (t.belowReorder.data ? `item${t.belowReorder.data === 1 ? '' : 's'} to reorder` : 'Nothing to reorder'),
    tone: t => ((t.belowReorder.data ?? 0) > 0 ? 'warning' : 'default'),
  },
];

const TodayRow: React.FC<{
  today: HubToday;
  onOpen: (target: string, params?: object) => void;
  onRetry: (key: keyof HubToday) => void;
  /**
   * Whether this tier has the report a tile opens. A tile whose report is not
   * mounted (stock on a tier without inventory) is not shown: a figure that
   * opens nothing when tapped is worse than no figure.
   */
  canOpen?: (target: string) => boolean;
}> = ({ today, onOpen, onRetry, canOpen = () => true }) => (
  <View style={styles.grid}>
    {TILES.map(tile => {
      if (!canOpen(tile.target)) return null;
      const st = today[tile.key] as Remote<unknown>;
      // A server without the endpoint: the tile is simply not there.
      if (st.notFound) return null;
      const value = tile.value(today);
      const loading = value === null && (st.status === 'loading' || st.status === 'idle');
      const failed = value === null && st.status === 'failed';
      const tone = tile.tone?.(today) ?? 'default';
      const caption = failed ? 'Tap to retry' : loading ? ' ' : tile.caption(today);
      return (
        <TouchableOpacity
          key={tile.key}
          style={styles.tile}
          onPress={() => (failed ? onRetry(tile.key) : onOpen(tile.target, tile.params))}
          accessibilityRole="button"
          accessibilityLabel={`${tile.label}, ${failed ? 'not loaded. Retry' : loading ? 'loading' : `${value}${caption ? `, ${caption}` : ''}. Opens the report`}`}
        >
          <View style={styles.head}>
            <Feather name={tile.icon} size={13} color={colors.textTertiary} />
            <Text style={styles.label} numberOfLines={1}>
              {tile.label}
            </Text>
          </View>
          <Text
            style={[styles.value, tone === 'warning' && styles.warn, value === null && styles.muted]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {value ?? '—'}
          </Text>
          <Text style={styles.caption} numberOfLines={1}>
            {caption}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 76,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { ...typography.labelSm, color: colors.textSecondary, flex: 1 },
  value: { ...typography.h4, color: colors.textPrimary, marginTop: 2, fontVariant: ['tabular-nums'] },
  warn: { color: colors.warning },
  muted: { color: colors.textTertiary },
  caption: { ...typography.caption, color: colors.textTertiary },
});

export default TodayRow;
