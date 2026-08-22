// ═══════════════════════════════════════════════════════
// FinMatrix — Tabs
// ═══════════════════════════════════════════════════════
// THE two tab controls in the app. Before this module the same two ideas were
// re-implemented per screen and had drifted into four looks: scrollable status
// pills with counts, plain filter chips a pixel smaller, a filled segmented
// switcher, and an underline-indicator bar.
//
// Which one to reach for:
//
//   FilterTabs     — narrows a LIST. A scrolling row of pills, one of which is
//                    active, optionally carrying a result count. Use on any
//                    list screen with status or category filters.
//
//   SegmentedTabs  — switches SECTIONS of one record. A fixed, fill-width
//                    control, because the choices are few and known. Use on
//                    detail screens ("Overview / Invoices / Payments").
//
// Both draw their active state the same way — a filled accent pill — so
// "which one am I on" reads identically wherever tabs appear.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME as T } from '../../theme';

const { colors, spacing, radius, shadows, typography } = T;

export type TabItem<V extends string> = {
  label: string;
  value: V;
  /** Result count. Omit for a plain filter with nothing to count. */
  count?: number;
};

const countLabel = (label: string, count?: number): string =>
  count === undefined ? label : `${label}, ${count} ${count === 1 ? 'item' : 'items'}`;

// ── FilterTabs ────────────────────────────────────────
/**
 * Most list screens carry five or six filters, which is far more than fits
 * across a phone — so roughly half the row starts off-screen. Three things
 * follow from that, and this component handles all three so no screen has to:
 *
 *   • The selected tab is scrolled into view. Coming back to a list with a
 *     filter still applied used to show a row of unselected tabs, with the
 *     active one off the right edge and no sign the filter was on.
 *   • The edges fade while there is more row in that direction, so the row
 *     reads as scrollable instead of clipped.
 *   • A tab with nothing behind it is dimmed, so an empty filter is visible
 *     before it is tapped rather than after.
 */
export function FilterTabs<V extends string>({
  tabs,
  active,
  onChange,
  style,
}: {
  tabs: TabItem<V>[];
  active: V;
  onChange: (value: V) => void;
  style?: StyleProp<ViewStyle>;
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
    <View style={[s.filterBar, style]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
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
                s.pill,
                isActive && s.pillActive,
                isEmpty && s.pillEmpty,
                pressed && !isActive && s.pillPressed,
              ]}
              onPress={() => onChange(tab.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={countLabel(tab.label, tab.count)}
            >
              <Text style={[s.pillText, isActive && s.pillTextActive, isEmpty && s.textEmpty]}>
                {tab.label}
              </Text>
              {tab.count !== undefined ? (
                <View style={[s.badge, isActive && s.badgeActive, isEmpty && s.badgeEmpty]}>
                  <Text
                    style={[s.badgeText, isActive && s.badgeTextActive, isEmpty && s.textEmpty]}
                  >
                    {tab.count}
                  </Text>
                </View>
              ) : null}
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
          style={[s.fade, s.fadeLeft, { pointerEvents: 'none' }]}
        />
      ) : null}
      {moreRight ? (
        <LinearGradient
          colors={[`${colors.background}00`, colors.background]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[s.fade, s.fadeRight, { pointerEvents: 'none' }]}
        />
      ) : null}
    </View>
  );
}

// ── SegmentedTabs ─────────────────────────────────────
/**
 * The detail-screen section switcher. Fill-width and non-scrolling: the
 * sections of one record are few and fixed, so showing them all at once is
 * both possible and clearer than a row that might be hiding one.
 */
export function SegmentedTabs<V extends string>({
  tabs,
  active,
  onChange,
  style,
}: {
  tabs: TabItem<V>[];
  active: V;
  onChange: (value: V) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.segment, style]} accessibilityRole="tablist">
      {tabs.map(tab => {
        const isActive = active === tab.value;
        return (
          <Pressable
            key={tab.value}
            style={({ pressed }) => [
              s.segmentBtn,
              isActive && s.segmentBtnActive,
              pressed && !isActive && s.segmentBtnPressed,
            ]}
            onPress={() => onChange(tab.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={countLabel(tab.label, tab.count)}
          >
            <Text
              style={[s.segmentText, isActive && s.segmentTextActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {tab.count !== undefined ? (
              <View style={[s.badge, isActive && s.badgeActive]}>
                <Text style={[s.badgeText, isActive && s.badgeTextActive]}>{tab.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  // ── FilterTabs ──
  // Fixed-height bar so the row keeps a constant vertical slot and never
  // shifts between "has results" / "empty filter" list states.
  filterBar: { height: 52, justifyContent: 'center' },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { paddingHorizontal: spacing.xl, alignItems: 'center', gap: spacing.xs },
  pill: {
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
  pillActive: {
    backgroundColor: colors.actionGreen,
    borderColor: colors.actionGreen,
    // The selected pill lifts off the row so it reads as selected even in
    // peripheral vision, where the colour alone is easy to miss.
    ...shadows.sm,
    shadowColor: colors.actionGreen,
  },
  // A filter with nothing behind it, muted so it reads as empty before it is
  // tapped. Still fully tappable — it is information, not a disabled state.
  pillEmpty: { backgroundColor: colors.background, borderColor: colors.borderLight },
  pillPressed: { backgroundColor: colors.neutral100, borderColor: colors.neutral300 },
  pillText: { ...typography.labelMd, color: colors.textSecondary },
  pillTextActive: { color: colors.neutral0 },
  textEmpty: { color: colors.textTertiary },

  // ── SegmentedTabs ──
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs + 2,
    // 44pt with the 3pt track padding either side.
    minHeight: 38,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  segmentBtnActive: {
    backgroundColor: colors.actionGreen,
    ...shadows.xs,
    shadowColor: colors.actionGreen,
  },
  segmentBtnPressed: { backgroundColor: colors.neutral100 },
  segmentText: { ...typography.labelMd, color: colors.textSecondary },
  segmentTextActive: { color: colors.neutral0 },

  // ── Count badge, shared by both controls ──
  badge: {
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
  badgeActive: { backgroundColor: colors.neutral0 },
  badgeEmpty: { backgroundColor: 'transparent' },
  // letterSpacing zeroed for digits (same treatment as ReportUI's kpiDelta).
  badgeText: { ...typography.labelSm, letterSpacing: 0, color: colors.textSecondary },
  badgeTextActive: { color: colors.actionGreen },

  // ── Edge fades, shown only while there is more row that way ──
  fade: { position: 'absolute', top: 0, bottom: 0, width: spacing.xl },
  fadeLeft: { left: 0 },
  fadeRight: { right: 0 },
});
