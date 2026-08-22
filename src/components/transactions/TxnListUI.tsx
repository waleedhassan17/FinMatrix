// ═══════════════════════════════════════════════════════
// FinMatrix — Shared transaction-list UI primitives
// One source of truth for the filter tabs and list cards used across
// every Transactions list screen (Invoices look & feel).
//   • TxnTabs  — pill status tabs with count badges, in a fixed-height
//                pinned bar so the row never shifts between list states.
//   • TxnCard  — left-status-bordered card: number + subtitle + status
//                badge, an optional meta row, and a Total / secondary row.
// ═══════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { THEME as T } from '../../theme';

const { colors, spacing, radius, shadows, typography } = T;

// Capitalises a raw status key for display (e.g. "partially_received" → "Partially received").
export const titleCase = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s;

// ── Tabs ──────────────────────────────────────────────
export type TxnTab<V extends string> = { label: string; value: V; count: number };

export function TxnTabs<V extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TxnTab<V>[];
  active: V;
  onChange: (value: V) => void;
}) {
  return (
    <View style={s.tabsBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsScroll}
        contentContainerStyle={s.tabsRow}
      >
        {tabs.map(tab => {
          const isActive = active === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[s.tab, isActive && s.tabActive]}
              activeOpacity={0.7}
              onPress={() => onChange(tab.value)}
            >
              <Text style={[s.tabText, isActive && s.tabTextActive]}>{tab.label}</Text>
              <View style={[s.tabCount, isActive && s.tabCountActive]}>
                <Text style={[s.tabCountText, isActive && s.tabCountTextActive]}>{tab.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Card ──────────────────────────────────────────────
export type TxnCardProps = {
  number: string;
  subtitle?: string;
  statusLabel: string;
  statusColor: string;
  metaLeft?: string;
  metaRight?: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  secondaryColor?: string;
  onPress: () => void;
};

export const TxnCard: React.FC<TxnCardProps> = ({
  number,
  subtitle,
  statusLabel,
  statusColor,
  metaLeft,
  metaRight,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  secondaryColor,
  onPress,
}) => (
  <TouchableOpacity
    style={[s.card, { borderLeftWidth: 4, borderLeftColor: statusColor }]}
    activeOpacity={0.6}
    onPress={onPress}
  >
    <View style={s.cardTop}>
      <View style={{ flex: 1, marginRight: spacing.xs }}>
        <Text style={s.cardNumber}>{number}</Text>
        {subtitle ? <Text style={s.cardSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={[s.badge, { backgroundColor: statusColor + '18' }]}>
        <Text style={[s.badgeText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>

    {metaLeft || metaRight ? (
      <View style={s.cardDates}>
        <Text style={s.dateText}>{metaLeft ?? ''}</Text>
        {metaRight ? <Text style={s.dateText}>{metaRight}</Text> : null}
      </View>
    ) : null}

    <View style={s.cardBottom}>
      <View>
        <Text style={s.amtLabel}>{primaryLabel}</Text>
        <Text style={s.amtValue}>{primaryValue}</Text>
      </View>
      {secondaryValue != null ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.amtLabel}>{secondaryLabel}</Text>
          <Text style={[s.amtValue, secondaryColor ? { color: secondaryColor } : null]}>{secondaryValue}</Text>
        </View>
      ) : null}
    </View>
  </TouchableOpacity>
);

const s = StyleSheet.create({
  // Tabs — pinned in a fixed-height bar so the row never shifts between states.
  tabsBar: { height: 52, justifyContent: 'center' },
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabsRow: { paddingHorizontal: spacing.xl, alignItems: 'center', gap: spacing.xs },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // 44pt minimum touch target; the 52pt bar has room for it.
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.actionGreen, borderColor: colors.actionGreen },
  tabText: { ...typography.labelMd, color: colors.textSecondary },
  tabTextActive: { color: colors.neutral0 },
  tabCount: {
    marginLeft: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xxs + 2,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  // letterSpacing zeroed for digits (same treatment as ReportUI's kpiDelta).
  tabCountText: { ...typography.labelSm, letterSpacing: 0, color: colors.textSecondary },
  tabCountTextActive: { color: colors.neutral0 },

  // Card — matches ReportUI's Card surface (radius, border, elevation).
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
    ...shadows.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  cardNumber: { ...typography.labelLg, color: colors.textPrimary },
  cardSub: { ...typography.bodySm, color: colors.textSecondary, marginTop: 2 },
  badge: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xxs, borderRadius: radius.xs },
  // labelSm is the canonical badge-text role (see ReportUI's Badge).
  badgeText: { ...typography.labelSm, letterSpacing: 0.2 },
  cardDates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  dateText: { ...typography.caption, color: colors.textTertiary },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  amtLabel: { ...typography.caption, color: colors.textTertiary },
  // Tabular figures so amounts align digit-for-digit down the list.
  amtValue: { ...typography.labelLg, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
});
