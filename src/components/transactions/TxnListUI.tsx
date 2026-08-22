// ═══════════════════════════════════════════════════════
// FinMatrix — Shared transaction-list UI primitives
// One source of truth for the filter tabs and list cards used across
// every Transactions list screen (Invoices look & feel).
//   • TxnTabs  — pill status tabs with count badges, in a fixed-height
//                pinned bar so the row never shifts between list states.
//   • TxnCard  — left-status-bordered card: number + subtitle + status
//                badge, an optional meta row, and a Total / secondary row.
// ═══════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME as T } from '../../theme';

const { colors, spacing, radius, shadows, typography } = T;

// Capitalises a raw status key for display (e.g. "partially_received" → "Partially received").
export const titleCase = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : s;

// ── Tabs ──────────────────────────────────────────────
export type TxnTab<V extends string> = { label: string; value: V; count: number };

/**
 * Most list screens carry six status tabs, which is far more than fits across
 * a phone — so roughly half the row starts off-screen. Three things follow
 * from that, and this component handles all three so no screen has to:
 *
 *   • The selected tab is scrolled into view. Coming back to a list with a
 *     filter still applied used to show a row of unselected tabs, with the
 *     active one off the right edge and no sign the filter was on.
 *   • The edges fade while there is more row in that direction, so the row
 *     reads as scrollable instead of clipped.
 *   • A tab with nothing behind it is dimmed, so an empty filter is visible
 *     before it is tapped rather than after.
 */
export function TxnTabs<V extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TxnTab<V>[];
  active: V;
  onChange: (value: V) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  // Measured per pill so the active one can be centred without guessing widths.
  const spans = useRef<Partial<Record<V, { x: number; width: number }>>>({});
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);
  const [offset, setOffset] = useState(0);

  const measure = useCallback(
    (value: V) => (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      spans.current[value] = { x, width };
    },
    [],
  );

  useEffect(() => {
    const span = spans.current[active];
    if (!span || !viewport) return;
    // Centre it where there is room to; the clamp keeps the first and last
    // tabs flush against their edge instead of floating in from it.
    const max = Math.max(0, content - viewport);
    const centred = span.x + span.width / 2 - viewport / 2;
    scrollRef.current?.scrollTo({
      x: Math.min(Math.max(0, centred), max),
      animated: true,
    });
  }, [active, viewport, content]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOffset(e.nativeEvent.contentOffset.x);
  }, []);

  // 4px of slack so a fade does not flicker at the very end of a scroll.
  const moreLeft = offset > 4;
  const moreRight = content - viewport - offset > 4;

  return (
    <View style={s.tabsBar}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsScroll}
        contentContainerStyle={s.tabsRow}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={e => setViewport(e.nativeEvent.layout.width)}
        onContentSizeChange={w => setContent(w)}
      >
        {tabs.map(tab => {
          const isActive = active === tab.value;
          const isEmpty = tab.count === 0 && !isActive;
          return (
            <Pressable
              key={tab.value}
              onLayout={measure(tab.value)}
              style={({ pressed }) => [
                s.tab,
                isActive && s.tabActive,
                isEmpty && s.tabEmpty,
                pressed && !isActive && s.tabPressed,
              ]}
              onPress={() => onChange(tab.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label}, ${tab.count} ${tab.count === 1 ? 'item' : 'items'}`}
            >
              <Text style={[s.tabText, isActive && s.tabTextActive, isEmpty && s.tabTextEmpty]}>
                {tab.label}
              </Text>
              <View style={[s.tabCount, isActive && s.tabCountActive, isEmpty && s.tabCountEmpty]}>
                <Text
                  style={[
                    s.tabCountText,
                    isActive && s.tabCountTextActive,
                    isEmpty && s.tabTextEmpty,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Scroll affordance — non-interactive, so taps fall through to the tabs. */}
      {moreLeft ? (
        <LinearGradient
          colors={[colors.background, `${colors.background}00`]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[s.tabsFade, s.tabsFadeLeft, { pointerEvents: 'none' }]}
        />
      ) : null}
      {moreRight ? (
        <LinearGradient
          colors={[`${colors.background}00`, colors.background]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[s.tabsFade, s.tabsFadeRight, { pointerEvents: 'none' }]}
        />
      ) : null}
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
  tabActive: {
    backgroundColor: colors.actionGreen,
    borderColor: colors.actionGreen,
    // The selected pill lifts off the row so it reads as selected even in
    // peripheral vision, where the colour alone is easy to miss.
    ...shadows.sm,
    shadowColor: colors.actionGreen,
  },
  // A filter with nothing behind it, muted so it reads as empty before it is
  // tapped. Still fully tappable — it is information, not a disabled state.
  tabEmpty: { backgroundColor: colors.background, borderColor: colors.borderLight },
  tabPressed: { backgroundColor: colors.neutral100, borderColor: colors.neutral300 },
  tabText: { ...typography.labelMd, color: colors.textSecondary },
  tabTextActive: { color: colors.neutral0 },
  tabTextEmpty: { color: colors.textTertiary },
  tabCount: {
    marginLeft: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xxs + 2,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  // Solid white on the accent pill: a translucent chip left white digits at
  // roughly 2.4:1 against the green behind them.
  tabCountActive: { backgroundColor: colors.neutral0 },
  tabCountEmpty: { backgroundColor: 'transparent' },
  // letterSpacing zeroed for digits (same treatment as ReportUI's kpiDelta).
  tabCountText: { ...typography.labelSm, letterSpacing: 0, color: colors.textSecondary },
  tabCountTextActive: { color: colors.actionGreen },

  // Edge fades that appear only while there is more row in that direction.
  tabsFade: { position: 'absolute', top: 0, bottom: 0, width: spacing.xl },
  tabsFadeLeft: { left: 0 },
  tabsFadeRight: { right: 0 },

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
