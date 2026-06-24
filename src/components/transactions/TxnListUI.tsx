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
import { colors, spacing, borderRadius, shadows } from '../../theme';
import { THEME } from '../../utils/theme';

const FF = THEME.typography.fontFamily;

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
      <View style={{ flex: 1, marginRight: spacing.sm }}>
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
  // Tabs — identical to the Invoices screen, pinned in a fixed-height bar.
  tabsBar: { height: 52, justifyContent: 'center' },
  tabsScroll: { flexGrow: 0, flexShrink: 0 },
  tabsRow: { paddingHorizontal: spacing.lg, alignItems: 'center', gap: spacing.sm },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, fontFamily: FF },
  tabTextActive: { color: colors.white },
  tabCount: {
    marginLeft: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, fontFamily: FF },
  tabCountTextActive: { color: colors.white },

  // Card — identical to the Invoices screen card.
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardNumber: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: FF },
  cardSub: { fontSize: 13, color: colors.textSecondary, fontFamily: FF, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: FF },
  cardDates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  dateText: { fontSize: 12, color: colors.textLight, fontFamily: FF },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  amtLabel: { fontSize: 11, color: colors.textLight, fontFamily: FF },
  amtValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontFamily: FF },
});
