// ═══════════════════════════════════════════════════════
// FinMatrix — Reports & Hub UI Kit
// Shared, enterprise-grade presentational primitives so every
// report / hub / dashboard surface is visually consistent.
// All tokens come from utils/theme (THEME) — single source of truth.
// ═══════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StatusBar,
  Modal,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { THEME } from '../../utils/theme';
import { HEADER_NAVY, HEADER_RADIUS } from '../../theme';
import { CATEGORY_PALETTE } from '../../theme/theme';
import { useAppSelector } from '../../hooks/useReduxHooks';
import { selectActiveCompany } from '../../screens/Auth/companySlice';
import { DEFAULT_COMPANY } from '../../utils/invoicePdf';
import {
  STATUS_CAPTION,
  assessmentLabel,
  formatKpiValue,
  kpiContext,
  kpiDelta,
  type DeltaTone,
  type Kpi,
  type KpiAssessment,
  type KpiWithChange,
} from '../../models/kpiModel';
import AssessmentPill from './AssessmentPill';
import Sparkline from './Sparkline';
import { parenNegative } from './reportFormat';

// Re-exported so every screen has one import site for the reports kit.
export { parenNegative, asOfLabel, rangeLabel, reconcile, formatRatio, refreshingOverContent } from './reportFormat';

const T = THEME;

// Re-exported so the reports kit stays one import site; the value itself is a
// token and lives in theme.ts.
export { HEADER_NAVY } from '../../theme';

// Curated accent palette for KPI tiles / chart series — used everywhere
// so a "blue metric" looks the same on every screen.
export const ACCENT = {
  brand: T.colors.primary, // emerald — primary brand
  blue: T.colors.info,
  violet: T.colors.secondary,
  amber: T.colors.warning,
  red: T.colors.danger,
  green: T.colors.success,
  teal: T.colors.primary,
};

/**
 * Series colours for charts with more than one series — the validated
 * CATEGORY_PALETTE (theme.ts), the website's too. The old list repeated the
 * brand navy twice (brand and "teal" were the same token) and put violet
 * beside blue, a pair colour-blind readers cannot tell apart.
 */
export const CHART_SERIES = [...CATEGORY_PALETTE];

// ── Screen container ──────────────────────────────────
// The top inset is the root SafeAreaProvider's (the hook), not a SafeAreaView
// per screen. A SafeAreaView works its inset out from where the view sits on
// screen at the moment it measures, so a screen measured mid-transition came
// out at 0 and drew its header under the status bar — the General Ledger, the
// heaviest report to mount, did exactly that. The provider measures the window
// once; nothing a screen does can move it. React Navigation's own header
// takes its inset the same way.
export const ReportContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[S.container, { paddingTop: insets.top, backgroundColor: HEADER_NAVY[0] }]}>
      <View style={S.container}>{children}</View>
    </View>
  );
};

// ── Unified header ────────────────────────────────────
// `onBack` → renders the back row (used by detail screens).
// Omit `onBack` for tab-root screens (Reports/Transactions hubs).
// Canonical app-wide back button — a plain `arrow-left` (no box), matching the
// Transactions screens. White on the navy header; `dark` for light surfaces.
export const BackButton: React.FC<{ onPress: () => void; dark?: boolean; label?: string }> = ({
  onPress,
  dark,
  label = 'Go back',
}) => (
  // Named for a screen reader: an unlabelled arrow is read as "button".
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    style={S.backBtn}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Feather name="arrow-left" size={24} color={dark ? T.colors.textPrimary : T.colors.neutral0} />
  </TouchableOpacity>
);

export const ReportHeader: React.FC<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
}> = ({ title, subtitle, onBack, backLabel, right }) => (
  <LinearGradient colors={HEADER_NAVY} style={S.header}>
    <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
    <View style={S.headerRow}>
      {onBack ? (
        <BackButton onPress={onBack} label={backLabel && backLabel !== 'Back' ? `Back to ${backLabel}` : 'Go back'} />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={S.headerTitle}>{title}</Text>
        {subtitle ? <Text style={S.headerSub}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={S.headerRight}>{right}</View> : null}
    </View>
  </LinearGradient>
);

// Circular icon action used in headers (translucent white on the navy header).
// The button draws at 36pt; the hit slop takes the touch target to 44.
export const HeaderIconButton: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}> = ({ icon, onPress, accessibilityLabel, disabled }) => (
  <TouchableOpacity
    style={[S.headerBtn, disabled && { opacity: 0.5 }]}
    activeOpacity={0.7}
    onPress={onPress}
    disabled={disabled}
    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
  >
    <Feather name={icon} size={16} color={T.colors.neutral0} />
  </TouchableOpacity>
);

/**
 * THE header create action (ux polish pass): one professional labeled pill —
 * brand-green, plus icon + label — replacing the mix of bare "+" icon
 * buttons, ad-hoc "Add" pills, and "+ New"/"+ Add" buttons that previously
 * varied screen by screen. Spec shared with the in-form AddButton
 * (THEME.form.addPill) so every create affordance in the app is identical.
 */
export const HeaderAction: React.FC<{
  label: string;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
}> = ({ label, onPress, icon = 'plus', disabled }) => (
  <TouchableOpacity
    style={[S.headerAction, disabled && { opacity: 0.5 }]}
    activeOpacity={0.8}
    onPress={onPress}
    disabled={disabled}
  >
    <Feather name={icon} size={THEME.form.addPill.iconSize} color={T.colors.neutral0} />
    <Text style={S.headerActionText} numberOfLines={1}>
      {label}
    </Text>
  </TouchableOpacity>
);

/**
 * Width for a financial-table amount column, sized to the LONGEST formatted
 * amount it must display — the professional ledger rule: figures are always
 * shown complete, at full size, never scaled down or clipped. Pair with a
 * horizontal ScrollView around the table so narrow screens pan instead of
 * squeezing the numbers. Heuristic: ~7.3px per character at the bodySm table
 * type size, plus the cell's own padding on both sides; clamped so empty
 * tables keep sane columns.
 *
 * The padding used to be counted as a flat 8px while TCell pads 12px a side,
 * so a column was 16px short of its widest figure and "Rs 320,000.00" drew as
 * "Rs 320,00…" — clipped, the one thing this rule exists to prevent.
 */
export const amountColWidth = (formatted: Array<string | null | undefined>): number => {
  const longest = formatted.reduce<number>((m, s) => Math.max(m, (s ?? '').length), 0);
  return Math.min(200, Math.max(88, Math.round(longest * 7.3) + T.spacing.sm * 2));
};

// ── Card surfaces ─────────────────────────────────────
export const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }> = ({
  children,
  style,
  padded = true,
}) => <View style={[S.card, padded && S.cardPad, style]}>{children}</View>;

export const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  icon?: keyof typeof Feather.glyphMap;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ title, subtitle, icon, right, children, style }) => (
  <View style={[S.card, style]}>
    <View style={S.sectionHead}>
      {icon ? (
        <View style={S.sectionIcon}>
          <Feather name={icon} size={15} color={T.colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={S.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={S.sectionSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
    <View style={S.sectionDivider} />
    <View style={S.sectionBody}>{children}</View>
  </View>
);

// ── KPI tiles ─────────────────────────────────────────
export type KpiItem = {
  label: string;
  value: string;
  accent?: string;
  icon?: keyof typeof Feather.glyphMap;
  delta?: { text: string; positive?: boolean };
};

export const KpiTile: React.FC<KpiItem & { style?: StyleProp<ViewStyle> }> = ({
  label,
  value,
  accent = ACCENT.brand,
  icon,
  delta,
  style,
}) => (
  // No coloured strip down the side: the tinted icon is the tile's only accent.
  <View style={[S.kpiTile, style]}>
    <View style={S.kpiBody}>
      {icon ? (
        <View style={[S.kpiIcon, { backgroundColor: `${accent}14` }]}>
          <Feather name={icon} size={14} color={accent} />
        </View>
      ) : null}
      <Text style={S.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={S.kpiLabel} numberOfLines={2}>
        {label}
      </Text>
      {delta ? (
        <View style={S.kpiDeltaRow}>
          <Feather
            name={delta.positive ? 'trending-up' : 'trending-down'}
            size={11}
            color={delta.positive ? ACCENT.green : ACCENT.red}
          />
          <Text style={[S.kpiDelta, { color: delta.positive ? ACCENT.green : ACCENT.red }]}>
            {delta.text}
          </Text>
        </View>
      ) : null}
    </View>
  </View>
);

// Responsive grid of KPI tiles (2-up by default).
export const KpiGrid: React.FC<{ items: KpiItem[] }> = ({ items }) => (
  <View style={S.kpiGrid}>
    {items.map((it, i) => (
      <KpiTile key={`${it.label}-${i}`} {...it} />
    ))}
  </View>
);

// ── KPI card (server KPIs) ────────────────────────────
// A business KPI as reports-kpi.service returns it: the value in its unit,
// the figures it was worked out from, how it reads (Healthy / Watch / At
// risk — the server's verdict), the move against the prior period coloured by
// whether that move is good news for THIS figure, and an ⓘ that opens the
// rule of thumb, the formula and its inputs. Nothing here computes a KPI; it
// formats one — the same anatomy as the website's KpiCard.

export type KpiCardData = Pick<Kpi, 'key' | 'label' | 'value' | 'unit' | 'status'> &
  Partial<Pick<Kpi, 'inputs' | 'assessment'>> &
  Partial<Pick<KpiWithChange, 'prior' | 'change' | 'changePct'>>;

const DELTA_TONE: Record<DeltaTone, { fg: string; bg: string }> = {
  good: { fg: T.colors.success, bg: T.colors.successLighter },
  bad: { fg: T.colors.danger, bg: T.colors.dangerLighter },
  neutral: { fg: T.colors.textSecondary, bg: T.colors.neutral100 },
};

export const KpiCard: React.FC<{
  kpi: KpiCardData;
  onInfo?: () => void;
  /** Open the report the figure comes from. */
  onPress?: () => void;
  /** Full width and a larger value, for the headline figures. */
  hero?: boolean;
  /** The line of figures under the value; defaults to the KPI's inputs, null hides it. */
  context?: string | null;
  /** A verdict other than the KPI's own — the cash card wears the runway's. */
  assessment?: KpiAssessment | null;
  /** The figure month by month, oldest first, for a sparkline. */
  trend?: (number | null)[];
  /** A small picture of the figure's make-up in the sparkline's place — the aging's age bar. */
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ kpi, onInfo, onPress, hero, context, assessment, trend, footer, style }) => {
  const value = formatKpiValue(kpi.value, kpi.unit);
  // A KPI with no value says why in the value's place ("Cash-positive — no
  // burn"); the line under it keeps the figures it was judged on.
  const status = kpi.value === null ? STATUS_CAPTION[kpi.status] : null;
  const figures = context === undefined ? (kpi.inputs ? kpiContext({ key: kpi.key, inputs: kpi.inputs }) : null) : context;
  const verdict = assessment === undefined ? (kpi.assessment ?? null) : assessment;
  const pill = assessmentLabel(verdict);
  const delta = kpiDelta({
    key: kpi.key,
    unit: kpi.unit,
    change: kpi.change ?? null,
    changePct: kpi.changePct ?? null,
  });
  const tone = delta ? DELTA_TONE[delta.tone] : null;
  const prior =
    kpi.prior !== undefined && kpi.prior !== null ? formatKpiValue(kpi.prior, kpi.unit) : null;
  const a11y = [
    `${kpi.label}, ${status ?? value}`,
    pill,
    figures,
    delta ? `${delta.text} against the prior period` : null,
    prior ? `prior ${prior}` : null,
  ]
    .filter(Boolean)
    .join('. ');

  const body = (
    <>
      <View style={S.kpiCardHead}>
        <Text style={S.kpiCardLabel} numberOfLines={2}>
          {kpi.label}
        </Text>
        {onInfo ? (
          <TouchableOpacity
            onPress={onInfo}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={`How ${kpi.label} is worked out`}
          >
            <Feather name="info" size={14} color={T.colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
        {/* Beside the label on a full-width card; under it on a narrow one. */}
        {hero ? <AssessmentPill assessment={verdict} /> : null}
      </View>
      {!hero && pill ? (
        <View style={S.kpiCardPillRow}>
          <AssessmentPill assessment={verdict} />
        </View>
      ) : null}
      {status ? (
        <Text style={[hero ? S.kpiCardHeroStatus : S.kpiCardStatus]} numberOfLines={2}>
          {status}
        </Text>
      ) : (
        <Text
          style={hero ? S.kpiCardHero : S.kpiCardValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {value}
        </Text>
      )}
      {figures ? (
        <Text style={S.kpiCardFigures} numberOfLines={2}>
          {figures}
        </Text>
      ) : null}
      {delta && tone ? (
        <View style={S.kpiCardDeltaRow}>
          <View style={[S.kpiCardChip, { backgroundColor: tone.bg }]}>
            <Feather
              name={delta.rising ? 'arrow-up-right' : 'arrow-down-right'}
              size={11}
              color={tone.fg}
            />
            <Text style={[S.kpiCardChipText, { color: tone.fg }]}>{delta.text}</Text>
          </View>
          {prior ? (
            <Text style={S.kpiCardCaption} numberOfLines={1}>
              vs {prior}
            </Text>
          ) : null}
        </View>
      ) : null}
      {trend ? <Sparkline values={trend} label={`${kpi.label} by month`} /> : null}
      {footer ? <View style={S.kpiCardFooter}>{footer}</View> : null}
    </>
  );

  const cardStyle = [S.kpiCard, hero && S.kpiCardWide, style];
  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${a11y}. Opens the report`}
      >
        {body}
      </TouchableOpacity>
    );
  }
  return (
    <View style={cardStyle} accessible accessibilityLabel={a11y}>
      {body}
    </View>
  );
};

/** Two KPI cards across a phone. */
export const KpiCardGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={S.kpiCardGrid}>{children}</View>
);

// ── Tie-out badge ─────────────────────────────────────
// The answer to "does this agree with the rest of the books", in the report's
// own header: A = L + E, ending cash = balance-sheet cash, a register that
// lands on the statement line. The verdict is the server's (taken on raw
// figures) or an equality between two server figures — never a sum.

export type TieState = 'balanced' | 'ties' | 'gap';

export const TieOutBadge: React.FC<{
  state: TieState;
  /** What ties to what — "Ending cash = Balance Sheet cash". */
  label?: string;
  /** The difference, when the server sends it. */
  gap?: number | null;
}> = ({ state, label, gap }) => {
  const ok = state !== 'gap';
  const color = ok ? T.colors.success : T.colors.danger;
  const text =
    state === 'balanced'
      ? label ?? 'Balanced'
      : state === 'ties'
        ? label ?? 'Ties'
        : gap !== undefined && gap !== null && gap !== 0
          ? `${label ? `${label} — ` : ''}Gap ${parenNegative(gap, 'Rs ')}`
          : label
            ? `${label} — does not tie`
            : 'Out of balance';
  return (
    <View
      style={[S.tie, { backgroundColor: ok ? T.colors.successLighter : T.colors.dangerLighter }]}
      accessible
      accessibilityLabel={text}
    >
      <Feather name={ok ? 'check-circle' : 'alert-triangle'} size={13} color={color} />
      <Text style={[S.tieText, { color }]} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
};

// ── Filter chip ───────────────────────────────────────
export const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
}> = ({ label, active, onPress, icon }) => (
  <TouchableOpacity
    style={[S.chip, active && S.chipOn]}
    onPress={onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 8, bottom: 8 }}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    accessibilityLabel={label}
  >
    {icon ? (
      <Feather name={icon} size={12} color={active ? T.colors.textInverse : T.colors.textSecondary} />
    ) : null}
    <Text style={[S.chipText, active && S.chipTextOn]}>{label}</Text>
  </TouchableOpacity>
);

// ── Figure strip ──────────────────────────────────────
// The headline figures of one report on ONE surface, divided by hairlines,
// rather than floated as separate accent-striped tiles — the same treatment
// the web gives aging and analytics. Colour goes on an amount only where it
// states a fact (overdue, a loss), never as decoration.

export type FigureTone = 'default' | 'success' | 'warning' | 'danger';

export type FigureItem = {
  label: string;
  value: string;
  /** A line qualifying the figure. Two lines at most. */
  caption?: React.ReactNode;
  tone?: FigureTone;
};

const FIGURE_TONE: Record<FigureTone, string> = {
  default: T.colors.textPrimary,
  success: T.colors.success,
  warning: T.colors.warning,
  danger: T.colors.danger,
};

/** Two across on a phone; the hairlines are the card's own background. */
export const FigureStrip: React.FC<{ items: FigureItem[] }> = ({ items }) => (
  <View style={[S.card, S.figureStrip]}>
    {items.map((it, i) => {
      // An odd one out spans the row, rather than leaving half of it empty.
      const alone = items.length % 2 === 1 && i === items.length - 1;
      return (
        <View
          key={`${it.label}-${i}`}
          style={[
            S.figure,
            i % 2 === 0 && !alone && S.figureLeft,
            i >= 2 && S.figureBelow,
            alone && S.figureAlone,
          ]}
        >
          <Text style={S.figureLabel} numberOfLines={1}>
            {it.label}
          </Text>
          <Text
            style={[S.figureValue, { color: FIGURE_TONE[it.tone ?? 'default'] }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {it.value}
          </Text>
          {it.caption !== undefined ? (
            <Text style={S.figureCaption} numberOfLines={2}>
              {it.caption}
            </Text>
          ) : null}
        </View>
      );
    })}
  </View>
);

// ── Refresh fade ──────────────────────────────────────
/**
 * Keeps a report on screen while its next version loads.
 *
 * The screens used to render `{report && !isLoading && …}`, so changing a
 * period blanked the whole report to a spinner and threw away the scroll
 * position. This keeps the figures where they are, dims them once a request
 * has run past 150ms — most land inside that, and a screen that flickers on
 * every tap reads as broken — and blocks taps on what is about to change.
 * Leaving the state has no delay, so new figures appear at once.
 */
export const RefreshFade: React.FC<{ busy: boolean; children: React.ReactNode }> = ({
  busy,
  children,
}) => {
  // Created once and kept: state rather than a ref, because it is read
  // during render (as a style) and refs must not be.
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const anim = Animated.timing(opacity, {
      toValue: busy ? 0.55 : 1,
      duration: 200,
      delay: busy ? 150 : 0,
      // The web build has no native animation module to hand this to.
      useNativeDriver: Platform.OS !== 'web',
    });
    anim.start();
    return () => anim.stop();
  }, [busy, opacity]);

  return (
    <Animated.View
      style={[S.fade, { opacity, pointerEvents: busy ? 'none' : 'auto' }]}
      accessibilityState={{ busy }}
    >
      {children}
    </Animated.View>
  );
};

// ── Summary label/value line ──────────────────────────
export const SummaryLine: React.FC<{
  label: string;
  value: string;
  strong?: boolean;
  highlight?: boolean;
  valueColor?: string;
}> = ({ label, value, strong, highlight, valueColor }) => (
  <View style={[S.summaryLine, highlight && S.summaryHighlight]}>
    <Text style={[S.summaryLabel, strong && S.bold, highlight && S.bold]}>{label}</Text>
    <Text
      style={[
        S.summaryValue,
        strong && S.bold,
        highlight && S.bold,
        valueColor ? { color: valueColor } : null,
      ]}
    >
      {value}
    </Text>
  </View>
);

export const Divider: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[S.hr, style]} />
);

// ── Data table primitives ─────────────────────────────
export const tableStyles = {
  head: {
    flexDirection: 'row' as const,
    backgroundColor: T.colors.neutral50,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.colors.border,
  },
  row: {
    flexDirection: 'row' as const,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.colors.borderLight,
  },
  rowAlt: { backgroundColor: T.colors.neutral25 },
  totalRow: {
    flexDirection: 'row' as const,
    paddingVertical: 12,
    backgroundColor: T.colors.primaryLight,
    borderTopWidth: 1,
    borderTopColor: T.colors.border,
  },
};

export const TCell: React.FC<{
  children: React.ReactNode;
  width?: number;
  flex?: number;
  head?: boolean;
  strong?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
}> = ({ children, width, flex, head, strong, align = 'left', color }) => (
  <Text
    numberOfLines={1}
    style={[
      S.cell,
      width != null ? { width } : null,
      flex != null ? { flex } : null,
      { textAlign: align },
      head && S.cellHead,
      strong && S.bold,
      color ? { color } : null,
    ]}
  >
    {children}
  </Text>
);

// ── Status / progress ─────────────────────────────────
export const Badge: React.FC<{ label: string; color?: string; dot?: boolean }> = ({
  label,
  color = T.colors.primary,
  dot = true,
}) => (
  <View style={[S.badge, { backgroundColor: `${color}14`, borderColor: `${color}33` }]}>
    {dot ? <View style={[S.badgeDot, { backgroundColor: color }]} /> : null}
    <Text style={[S.badgeText, { color }]}>{label}</Text>
  </View>
);

export const ProgressBar: React.FC<{ pct: number; color?: string }> = ({ pct, color = T.colors.primary }) => (
  <View style={S.progressBg}>
    <View style={[S.progressFill, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }]} />
  </View>
);

// ── Segmented control (views, modes, report tabs) ─────
/**
 * A label is never broken across lines. Split into equal quarters, four tabs
 * on a phone — Items, Top sellers, Health, Reconciliation — left
 * "Reconciliation" too narrow, and it wrapped mid-word under the others. The
 * control measures its labels and lays itself out the way iOS apportions
 * segments:
 *
 *   • equal    every label fits an equal share: equal segments, as before;
 *   • content  one does not: each segment gets its label's width plus an
 *              equal part of the room left, so a long label gets what it needs;
 *   • scroll   even that overflows (a large system font): the strip scrolls
 *              sideways and keeps the active segment in view, as the web's
 *              tab list does on a phone.
 *
 * Until the labels are measured it draws equal, single-line segments.
 */
type SegmentFit = 'equal' | 'content' | 'scroll';
const SEG_PAD_X = 10;
const SEG_GAP = 3;
const SEG_TRACK_PAD = 3;

export const segmentFit = (labelWidths: number[], trackWidth: number): SegmentFit => {
  const n = labelWidths.length;
  if (n === 0 || trackWidth <= 0) return 'equal';
  const gaps = SEG_GAP * (n - 1);
  const need = labelWidths.map(w => w + SEG_PAD_X * 2);
  if (Math.max(...need) <= (trackWidth - gaps) / n) return 'equal';
  return need.reduce((sum, w) => sum + w, 0) + gaps <= trackWidth ? 'content' : 'scroll';
};

export const Segmented: React.FC<{
  options: string[];
  activeIndex: number;
  onChange: (i: number) => void;
}> = ({ options, activeIndex, onChange }) => {
  // The track's inner width, and each label's width on one line.
  const [track, setTrack] = useState(0);
  const [natural, setNatural] = useState<Record<string, number>>({});
  const scrollRef = useRef<ScrollView>(null);
  const spans = useRef<Record<number, { x: number; width: number }>>({});

  const widths = options.map(o => natural[o]);
  const fit: SegmentFit = widths.every(w => w !== undefined) ? segmentFit(widths as number[], track) : 'equal';

  const recordLabel = (opt: string, width: number) => {
    const w = Math.ceil(width) + 1; // sub-pixel widths round down on some devices
    setNatural(prev => (prev[opt] === w ? prev : { ...prev, [opt]: w }));
  };

  const centre = (i: number, animated: boolean) => {
    const s = spans.current[i];
    if (!s) return;
    scrollRef.current?.scrollTo({ x: Math.max(0, s.x - (track - s.width) / 2), animated });
  };

  useEffect(() => {
    if (fit === 'scroll') centre(activeIndex, true);
    // `centre` reads refs; re-running on its identity would scroll every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, activeIndex, track]);

  const buttons = options.map((opt, i) => {
    const active = i === activeIndex;
    return (
      <TouchableOpacity
        key={opt}
        style={[S.segmentBtn, fit === 'equal' ? S.segmentEqual : S.segmentContent, active && S.segmentBtnActive]}
        activeOpacity={0.8}
        onPress={() => onChange(i)}
        onLayout={
          fit === 'scroll'
            ? e => {
                const { x, width } = e.nativeEvent.layout;
                spans.current[i] = { x, width };
                if (active) centre(i, false);
              }
            : undefined
        }
        hitSlop={{ top: 4, bottom: 4 }}
        // A screen reader hears which of the views is on, not just a word.
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${opt}, ${i + 1} of ${options.length}`}
      >
        <Text style={[S.segmentText, active && S.segmentTextActive]} numberOfLines={1}>
          {opt}
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <View
      style={S.segment}
      onLayout={e => setTrack(Math.max(0, e.nativeEvent.layout.width - SEG_TRACK_PAD * 2))}
    >
      {/* Each label at its natural width, unseen and unheard: what decides the fit. */}
      <View
        style={S.segmentMeasure}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {options.map(opt => (
          <Text
            key={opt}
            style={[S.segmentText, S.segmentTextActive]}
            numberOfLines={1}
            onLayout={e => recordLabel(opt, e.nativeEvent.layout.width)}
          >
            {opt}
          </Text>
        ))}
      </View>
      {fit === 'scroll' ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={S.segmentFill}
          contentContainerStyle={S.segmentRow}
        >
          {buttons}
        </ScrollView>
      ) : (
        <View style={[S.segmentFill, S.segmentRow]}>{buttons}</View>
      )}
    </View>
  );
};

// ── Date field (custom calendar — web · iOS · Android) ────────────
// Tapping the field opens an in-app calendar built purely from RN primitives,
// so it works everywhere INCLUDING react-native-web (the native datetimepicker
// has no web implementation). Values are exchanged as `YYYY-MM-DD` strings
// (same contract as before) so callers are unchanged. `onChangeText` keeps the
// legacy name; `onChange` is an alias. By default no future date is selectable
// (`maximumDate` = today) so reports always run up to the current date.
const ISO = 'YYYY-MM-DD';
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const toIsoD = (d: dayjs.Dayjs): string => d.format(ISO);
const parseIsoD = (v?: string): dayjs.Dayjs => {
  const d = v ? dayjs(v, ISO) : dayjs();
  return d.isValid() ? d : dayjs();
};

export const DateField: React.FC<{
  label?: string;
  value: string;
  onChangeText?: (t: string) => void;
  onChange?: (t: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: StyleProp<ViewStyle>;
}> = ({ label, value, onChangeText, onChange, placeholder = 'Select date', minimumDate, maximumDate, style }) => {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<dayjs.Dayjs>(() => parseIsoD(value).startOf('month'));

  const min = minimumDate ? dayjs(minimumDate).startOf('day') : null;
  const max = (maximumDate ? dayjs(maximumDate) : dayjs()).startOf('day'); // default: today
  const today = dayjs().startOf('day');

  const commit = (t: string) => {
    onChangeText?.(t);
    onChange?.(t);
  };
  const selected = value && dayjs(value, ISO).isValid() ? dayjs(value, ISO).startOf('day') : null;
  const display = selected ? selected.format('DD MMM YYYY') : '';

  const isDisabled = (d: dayjs.Dayjs) =>
    !!((min && d.isBefore(min, 'day')) || (max && d.isAfter(max, 'day')));

  const openPicker = () => {
    setViewMonth((selected ?? parseIsoD(value)).startOf('month'));
    setOpen(true);
  };
  const pick = (d: dayjs.Dayjs) => {
    if (isDisabled(d)) return;
    commit(toIsoD(d));
    setOpen(false);
  };

  // Build the day grid: leading blanks before the 1st, then each day, padded
  // to whole weeks.
  const firstWeekday = viewMonth.day(); // 0 = Sunday
  const daysInMonth = viewMonth.daysInMonth();
  const cells: (dayjs.Dayjs | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(viewMonth.date(d));
  while (cells.length % 7 !== 0) cells.push(null);

  const prevDisabled = !!(min && viewMonth.isSame(min, 'month'));
  const nextDisabled = !!(max && viewMonth.isSame(max, 'month'));
  const todayDisabled = isDisabled(today);

  return (
    <View style={[{ flex: 1 }, style]}>
      {label ? <Text style={S.fieldLabel}>{label}</Text> : null}
      <TouchableOpacity style={S.fieldWrap} activeOpacity={0.7} onPress={openPicker}>
        <Feather name="calendar" size={15} color={T.colors.primary} style={{ marginRight: 8 }} />
        <Text style={[S.fieldInput, !display && { color: T.colors.textTertiary }]} numberOfLines={1}>
          {display || placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={S.calBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={S.calCard}>
            <LinearGradient colors={HEADER_NAVY} style={S.calHeader}>
              <TouchableOpacity
                style={[S.calNav, prevDisabled && S.calNavDisabled]}
                disabled={prevDisabled}
                onPress={() => setViewMonth(viewMonth.subtract(1, 'month'))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="chevron-left" size={20} color={prevDisabled ? 'rgba(255,255,255,0.3)' : T.colors.neutral0} />
              </TouchableOpacity>
              <Text style={S.calMonth}>{viewMonth.format('MMMM YYYY')}</Text>
              <TouchableOpacity
                style={[S.calNav, nextDisabled && S.calNavDisabled]}
                disabled={nextDisabled}
                onPress={() => setViewMonth(viewMonth.add(1, 'month'))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="chevron-right" size={20} color={nextDisabled ? 'rgba(255,255,255,0.3)' : T.colors.neutral0} />
              </TouchableOpacity>
            </LinearGradient>

            <View style={S.calBody}>
              <View style={S.calWeekRow}>
                {WEEKDAYS.map((w) => (
                  <Text key={w} style={S.calWeekday}>{w}</Text>
                ))}
              </View>
              <View style={S.calGrid}>
                {cells.map((d, i) => {
                  if (!d) return <View key={`blank-${i}`} style={S.calCell} />;
                  const isSel = !!(selected && d.isSame(selected, 'day'));
                  const isToday = d.isSame(today, 'day');
                  const disabled = isDisabled(d);
                  return (
                    <TouchableOpacity
                      key={toIsoD(d)}
                      style={S.calCell}
                      activeOpacity={0.7}
                      disabled={disabled}
                      onPress={() => pick(d)}
                    >
                      <View style={[S.calDay, isSel && S.calDaySel, !isSel && isToday && S.calDayToday]}>
                        <Text
                          style={[
                            S.calDayText,
                            isSel && S.calDayTextSel,
                            disabled && S.calDayTextDisabled,
                          ]}
                        >
                          {d.date()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={S.calFooter}>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={S.calCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={todayDisabled} onPress={() => pick(today)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[S.calToday, todayDisabled && { color: T.colors.textTertiary }]}>Today</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ── Loading / error / empty states ────────────────────

export const LoadingBlock: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <View style={S.stateBlock}>
    <ActivityIndicator size="large" color={T.colors.primary} />
    <Text style={S.stateText}>{label}</Text>
  </View>
);

export const ErrorBlock: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <View style={S.stateBlock}>
    <View style={[S.stateIcon, { backgroundColor: T.colors.dangerLight }]}>
      <Feather name="alert-triangle" size={20} color={T.colors.danger} />
    </View>
    <Text style={S.stateText}>{message}</Text>
    {onRetry ? (
      <TouchableOpacity style={S.retryBtn} onPress={onRetry} activeOpacity={0.8}>
        <Feather name="refresh-cw" size={13} color={T.colors.primary} />
        <Text style={S.retryText}>Retry</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

/**
 * A failed refetch over figures still on screen. The full ErrorBlock replaced
 * the report, so one dropped request threw away a statement the user was
 * reading; this says the refresh failed and leaves the last good figures.
 */
export const ErrorBanner: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <View style={S.banner} accessibilityRole="alert">
    <Feather name="alert-triangle" size={14} color={T.colors.danger} />
    <Text style={S.bannerText} numberOfLines={3}>
      {message}
    </Text>
    {onRetry ? (
      <TouchableOpacity
        onPress={onRetry}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Retry"
      >
        <Text style={S.retryText}>Retry</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

/** A notice that is not an error — a fiscal-year crossing, partial cost history. */
export const NoticeBanner: React.FC<{ message: string; icon?: keyof typeof Feather.glyphMap }> = ({
  message,
  icon = 'info',
}) => (
  <View style={S.notice}>
    <Feather name={icon} size={14} color={T.colors.warning} />
    <Text style={S.noticeText}>{message}</Text>
  </View>
);

// ── Skeleton ──────────────────────────────────────────
// Grey shapes where the report will be, so the first load reads as "this
// statement, filling in" rather than a spinner in a blank screen. One pulse
// drives every bar; the native driver carries it where there is one.

const usePulse = (): Animated.Value => {
  const [v] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(v, { toValue: 0.55, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v;
};

const Bar: React.FC<{ width?: ViewStyle['width']; height?: number; style?: StyleProp<ViewStyle> }> = ({
  width = '100%',
  height = 10,
  style,
}) => <View style={[S.skelBar, { width, height }, style]} />;

export type SkeletonVariant = 'statement' | 'kpis' | 'list' | 'inline';

export const ReportSkeleton: React.FC<{ variant?: SkeletonVariant; rows?: number }> = ({
  variant = 'statement',
  rows,
}) => {
  const opacity = usePulse();
  const n = rows ?? (variant === 'inline' ? 3 : variant === 'list' ? 6 : 8);
  let body: React.ReactNode;
  if (variant === 'kpis') {
    body = (
      <View style={S.kpiCardGrid}>
        {Array.from({ length: n > 6 ? 4 : n }, (_, i) => (
          <View key={i} style={[S.kpiCard, S.skelTile]}>
            <Bar width="60%" height={9} />
            <Bar width="80%" height={18} style={{ marginTop: T.spacing.xs }} />
            <Bar width="40%" height={9} style={{ marginTop: T.spacing.xs }} />
          </View>
        ))}
      </View>
    );
  } else if (variant === 'inline') {
    body = (
      <View style={S.skelInline}>
        {Array.from({ length: n }, (_, i) => (
          <View key={i} style={S.skelRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Bar width="70%" height={9} />
              <Bar width="45%" height={7} />
            </View>
            <Bar width={64} height={9} />
          </View>
        ))}
      </View>
    );
  } else {
    body = (
      <Card>
        {variant === 'statement' ? (
          <View style={S.skelTitle}>
            <Bar width="45%" height={12} />
            <Bar width="35%" height={10} />
            <Bar width="55%" height={8} />
          </View>
        ) : null}
        {Array.from({ length: n }, (_, i) => (
          <View key={i} style={[S.skelRow, variant === 'list' && S.skelListRow]}>
            <View style={{ flex: 1, gap: 5 }}>
              <Bar width={i % 3 === 0 ? '55%' : '72%'} height={10} />
              {variant === 'list' ? <Bar width="40%" height={8} /> : null}
            </View>
            <Bar width={86} height={10} />
          </View>
        ))}
      </Card>
    );
  }
  return (
    <Animated.View
      style={{ opacity }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      {body}
    </Animated.View>
  );
};

// `actionLabel`/`onAction` render a centred call-to-action, for the genuine
// first-run zero-state where the empty block is the user's primary route
// forward. Optional — existing callers are unaffected.
export const EmptyBlock: React.FC<{
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** The action's glyph. A plus suits "Create…"; a retry wants refresh-cw. */
  actionIcon?: keyof typeof Feather.glyphMap | null;
}> = ({ icon = 'inbox', title, hint, actionLabel, onAction, actionIcon = 'plus' }) => (
  <View style={S.stateBlock}>
    <View style={[S.stateIcon, { backgroundColor: T.colors.neutral100 }]}>
      <Feather name={icon} size={20} color={T.colors.textTertiary} />
    </View>
    <Text style={S.stateText}>{title}</Text>
    {hint ? <Text style={S.stateHint}>{hint}</Text> : null}
    {actionLabel && onAction ? (
      <TouchableOpacity
        style={S.stateAction}
        onPress={onAction}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
      >
        {actionIcon ? (
          <Feather name={actionIcon} size={THEME.form.addPill.iconSize} color={T.colors.neutral0} />
        ) : null}
        <Text style={S.stateActionText} numberOfLines={1}>
          {actionLabel}
        </Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

/**
 * The foot of a list the server pages: a spinner while the next page loads,
 * else how much is showing and the way to the rest. Nothing once all of it
 * has loaded — a list that simply ends is complete. Pair it with `nearEnd`
 * on the ScrollView so scrolling to the bottom loads more by itself.
 */
export const LoadMoreFooter: React.FC<{
  shown: number;
  total: number;
  hasMore: boolean;
  loading: boolean;
  onMore: () => void;
}> = ({ shown, total, hasMore, loading, onMore }) => {
  if (loading) {
    return (
      <View style={S.moreBlock}>
        <ActivityIndicator color={T.colors.primary} />
      </View>
    );
  }
  if (!hasMore) return null;
  return (
    <View style={S.moreBlock}>
      <Text style={S.stateHint}>Showing {shown} of {total}</Text>
      <TouchableOpacity style={S.retryBtn} onPress={onMore} activeOpacity={0.8}>
        <Feather name="chevrons-down" size={13} color={T.colors.primary} />
        <Text style={S.retryText}>Load more</Text>
      </TouchableOpacity>
    </View>
  );
};

/** A ScrollView `onScroll` that calls `onEnd` near the bottom. */
export const nearEnd =
  (onEnd: () => void, threshold = 240) =>
  (e: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - threshold) onEnd();
  };

// ═══════════════════════════════════════════════════════
// Statement primitives — QuickBooks-style formal statements
// ═══════════════════════════════════════════════════════
// These build the statement BODY that sits beneath the navy ReportHeader and
// the KPI tiles. They are presentation only: every figure passed in comes
// straight from the API response, and nothing here recomputes an amount.

/**
 * The name a statement is headed with — the signed-in company, falling back to
 * the invoice/PDF placeholder if none is loaded yet. Read-only.
 */
export const useStatementCompany = (): string => {
  const company = useAppSelector(selectActiveCompany);
  return company?.name?.trim() || DEFAULT_COMPANY.name;
};

/**
 * The block every formal statement opens with: who, what, over what period,
 * and on what basis.
 */
export const ReportTitleBlock: React.FC<{
  company: string;
  report: string;
  periodLabel: string;
  basis?: 'Accrual' | 'Cash';
}> = ({ company, report, periodLabel, basis = 'Accrual' }) => (
  <Card>
    <View style={S.titleBlock}>
      <Text style={S.titleCompany}>{company}</Text>
      <Text style={S.titleReport}>{report}</Text>
      <Text style={S.titlePeriod}>{periodLabel}</Text>
      <Text style={S.titleBasis}>{basis} basis</Text>
    </View>
  </Card>
);

/**
 * One line of a statement. `depth` indents the label so sub-accounts sit under
 * their group; `isTotal` rules off above the amount; `isGrand` is the heavier
 * treatment for TOTAL ASSETS / NET INCOME and the like.
 *
 * Pass `onToggle` to make the line expandable. It gains a +/− affordance and
 * becomes tappable, and whatever the caller renders as `children` appears
 * beneath it — the transactions behind the figure, for the P&L drill-down. The
 * amount shown is still the one handed in: expanding a line reveals what is
 * under it, it never recomputes it.
 */
export const StatementRow: React.FC<{
  label: string;
  amount?: number;
  depth?: number;
  bold?: boolean;
  italic?: boolean;
  isTotal?: boolean;
  isGrand?: boolean;
  /** Optional second column, used by the P&L prior-period compare. */
  prior?: number;
  showPrior?: boolean;
  currency?: string;
  /** Supplying this makes the row expandable. */
  onToggle?: () => void;
  expanded?: boolean;
  /**
   * Supplying this makes the row open something else — a rollforward, another
   * report — and it takes a chevron rather than the +/−.
   */
  onPress?: () => void;
  /** What a tap opens, for the screen reader ("Opens the profit and loss"). */
  pressHint?: string;
  /**
   * A second line under the amount: the prior figure and the change, or the
   * amount behind a percentage. Comparison goes here rather than in a second
   * column, which a phone has no room for.
   */
  detail?: string;
  /** Colours `detail` — for a variance that is a warning. */
  detailTone?: 'default' | 'success' | 'warning' | 'danger';
  /** Replaces the formatted amount — a common-size percentage, say. */
  display?: string;
  children?: React.ReactNode;
}> = ({
  label,
  amount,
  depth = 0,
  bold,
  italic,
  isTotal,
  isGrand,
  prior,
  showPrior,
  currency = 'Rs ',
  onToggle,
  expanded,
  onPress,
  pressHint,
  detail,
  detailTone = 'default',
  display,
  children,
}) => {
  const emphasise = bold || isGrand;
  const touchable = !!(onToggle || onPress);
  const shown = display ?? (amount === undefined ? '' : parenNegative(amount, currency));

  const body = (
    <View
      style={[
        S.stRow,
        touchable && S.stRowTouchable,
        isTotal && S.stRowTotal,
        isGrand && S.stRowGrand,
      ]}
    >
      {/* The affordance sits in the indent rather than beside the label, so
          expandable and plain rows keep their labels on the same x. */}
      {onToggle ? (
        <View style={[S.stToggle, { marginLeft: depth * 16 }]}>
          <Feather
            name={expanded ? 'minus-square' : 'plus-square'}
            size={14}
            color={T.colors.textTertiary}
          />
        </View>
      ) : null}
      <Text
        style={[
          S.stLabel,
          { paddingLeft: onToggle ? 0 : depth * 16 },
          emphasise && S.stEmphasis,
          italic && S.stItalic,
        ]}
        numberOfLines={2}>
        {label}
      </Text>
      <View style={S.stAmountCol}>
        <Text style={[S.stAmount, emphasise && S.stEmphasis]}>{shown}</Text>
        {detail ? (
          <Text
            style={[
              S.stDetail,
              detailTone === 'danger' && { color: T.colors.danger },
              detailTone === 'warning' && { color: T.colors.warningHover },
              detailTone === 'success' && { color: T.colors.success },
            ]}
            numberOfLines={1}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      {showPrior ? (
        <Text style={[S.stAmount, emphasise && S.stEmphasis]}>
          {prior === undefined ? '—' : parenNegative(prior, currency)}
        </Text>
      ) : null}
      {onPress && !onToggle ? (
        <Feather name="chevron-right" size={14} color={T.colors.textDisabled} />
      ) : null}
    </View>
  );

  const spoken = `${label}, ${shown}${detail ? `, ${detail}` : ''}`;

  if (!touchable) {
    return shown ? (
      <View accessible accessibilityLabel={spoken}>
        {body}
      </View>
    ) : (
      body
    );
  }

  if (onPress && !onToggle) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={`${spoken}. ${pressHint ?? 'Opens the detail'}`}>
        {body}
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityState={{ expanded: !!expanded }}
        accessibilityLabel={`${spoken}. ${expanded ? 'Hide' : 'Show'} transactions`}>
        {body}
      </TouchableOpacity>
      {expanded ? children : null}
    </View>
  );
};

// Standard scroll content padding for report bodies.
export const reportContentStyle: ViewStyle = {
  padding: T.spacing.md,
  gap: T.spacing.sm + 2,
  paddingBottom: T.spacing.xxxl,
};

// ── Styles ────────────────────────────────────────────
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.colors.background },

  // Header — navy gradient hero (matches the company dashboard)
  header: {
    paddingHorizontal: T.spacing.md,
    paddingTop: T.spacing.sm + 2,
    paddingBottom: T.spacing.md + 2,
    // Same corner as the auth header (AUTH.header.radius).
    borderBottomLeftRadius: HEADER_RADIUS,
    borderBottomRightRadius: HEADER_RADIUS,
    overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { marginRight: 4, padding: 2 },
  headerTitle: { ...T.typography.h2, color: T.colors.neutral0 },
  headerSub: { ...T.typography.bodySm, color: 'rgba(255,255,255,0.62)', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: T.radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.form.addPill.background,
    paddingHorizontal: THEME.form.addPill.paddingHorizontal,
    paddingVertical: THEME.form.addPill.paddingVertical,
    borderRadius: THEME.form.addPill.radius,
  },
  headerActionText: {
    fontFamily: THEME.typography.fontFamily,
    fontSize: THEME.form.addPill.fontSize,
    fontWeight: THEME.form.addPill.fontWeight,
    color: T.colors.neutral0,
  },

  // Card
  card: {
    backgroundColor: T.colors.surface,
    borderRadius: T.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.border,
    overflow: 'hidden',
    ...T.shadows.xs,
  },
  cardPad: { padding: T.spacing.md },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: T.spacing.md,
    paddingTop: T.spacing.md,
    paddingBottom: T.spacing.sm,
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: T.radius.md,
    backgroundColor: T.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...T.typography.h4, color: T.colors.textPrimary },
  sectionSub: { ...T.typography.caption, color: T.colors.textTertiary, marginTop: 1 },
  sectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: T.colors.borderLight },
  sectionBody: { padding: T.spacing.md },

  // Figure strip
  figureStrip: { flexDirection: 'row', flexWrap: 'wrap' },
  figure: {
    width: '50%',
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.sm + 4,
  },
  figureLeft: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: T.colors.borderLight },
  figureAlone: { width: '100%' },
  figureBelow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.colors.borderLight },
  figureLabel: { ...T.typography.labelSm, color: T.colors.textSecondary },
  figureValue: { ...T.typography.h4, marginTop: 4, fontVariant: ['tabular-nums'] },
  figureCaption: { ...T.typography.caption, color: T.colors.textTertiary, marginTop: 3 },

  // Refresh fade — the same gap the report body's scroll content uses.
  fade: { gap: T.spacing.sm + 2 },

  // KPI
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: T.spacing.xs + 2 },
  kpiTile: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    backgroundColor: T.colors.surface,
    borderRadius: T.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.border,
    overflow: 'hidden',
    ...T.shadows.xs,
  },
  kpiBody: { flex: 1, padding: T.spacing.sm + 2 },
  kpiIcon: {
    width: 28,
    height: 28,
    borderRadius: T.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: { ...T.typography.h3, color: T.colors.textPrimary },
  kpiLabel: { ...T.typography.caption, color: T.colors.textSecondary, marginTop: 2 },
  kpiDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  kpiDelta: { ...T.typography.labelSm, letterSpacing: 0 },

  // KPI card (server KPIs)
  kpiCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: T.spacing.xs },
  kpiCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    minHeight: 88,
    backgroundColor: T.colors.surface,
    borderRadius: T.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.border,
    padding: T.spacing.sm,
    ...T.shadows.xs,
  },
  kpiCardWide: { flexBasis: '100%' },
  kpiCardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: T.spacing.xxs },
  kpiCardPillRow: { marginTop: T.spacing.xxs },
  kpiCardStatus: { ...T.typography.labelLg, color: T.colors.textPrimary, marginTop: T.spacing.xxs },
  kpiCardHeroStatus: { ...T.typography.h4, color: T.colors.textPrimary, marginTop: T.spacing.xxs },
  kpiCardFigures: { ...T.typography.caption, color: T.colors.textSecondary, marginTop: 2 },
  kpiCardFooter: { marginTop: T.spacing.xs },
  kpiCardLabel: { ...T.typography.labelSm, color: T.colors.textSecondary, flex: 1 },
  kpiCardValue: {
    ...T.typography.h4,
    color: T.colors.textPrimary,
    marginTop: T.spacing.xxs,
    fontVariant: ['tabular-nums'],
  },
  kpiCardHero: {
    ...T.typography.h2,
    color: T.colors.textPrimary,
    marginTop: T.spacing.xxs,
    fontVariant: ['tabular-nums'],
  },
  kpiCardMuted: { color: T.colors.textTertiary },
  kpiCardCaption: { ...T.typography.caption, color: T.colors.textTertiary, marginTop: 2 },
  kpiCardDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: T.spacing.xxs,
    marginTop: T.spacing.xxs,
  },
  kpiCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: T.radius.full,
  },
  kpiCardChipText: { ...T.typography.labelSm, fontVariant: ['tabular-nums'] },

  // Tie-out badge
  tie: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: T.spacing.xs,
    paddingVertical: 4,
    borderRadius: T.radius.full,
    maxWidth: '100%',
  },
  tieText: { ...T.typography.labelSm, flexShrink: 1, fontVariant: ['tabular-nums'] },

  // Filter chip — the spec the inventory filters already use.
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: T.spacing.sm,
    paddingVertical: T.spacing.xxs + 2,
    borderRadius: T.radius.full,
    borderWidth: 1,
    borderColor: T.colors.border,
    backgroundColor: T.colors.surface,
  },
  chipOn: { backgroundColor: T.colors.primary, borderColor: T.colors.primary },
  chipText: { ...T.typography.labelSm, color: T.colors.textSecondary },
  chipTextOn: { color: T.colors.textInverse },

  // Banners
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.spacing.xs,
    padding: T.spacing.sm,
    borderRadius: T.radius.md,
    backgroundColor: T.colors.dangerLighter,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.dangerLight,
  },
  bannerText: { ...T.typography.bodySm, color: T.colors.textPrimary, flex: 1 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: T.spacing.xs,
    padding: T.spacing.sm,
    borderRadius: T.radius.md,
    backgroundColor: T.colors.warningLighter,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.warningLight,
  },
  noticeText: { ...T.typography.bodySm, color: T.colors.textPrimary, flex: 1 },

  // Skeleton
  skelBar: { backgroundColor: T.colors.neutral100, borderRadius: T.radius.xs },
  skelTile: { gap: 0 },
  skelTitle: { alignItems: 'center', gap: 6, paddingBottom: T.spacing.sm },
  skelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.spacing.sm,
    paddingVertical: T.spacing.xs,
  },
  skelListRow: {
    paddingVertical: T.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.colors.borderLight,
  },
  skelInline: {
    marginLeft: T.spacing.lg,
    paddingLeft: T.spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: T.colors.borderLight,
  },

  // Summary line
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  summaryHighlight: {
    backgroundColor: T.colors.primaryLight,
    marginHorizontal: -T.spacing.md,
    paddingHorizontal: T.spacing.md,
    borderRadius: 0,
    marginTop: 4,
  },
  summaryLabel: { ...T.typography.bodyMd, color: T.colors.textPrimary, flex: 1, marginRight: 12 },
  summaryValue: { ...T.typography.bodyMd, color: T.colors.textPrimary },
  bold: { fontWeight: T.typography.h3.fontWeight },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: T.colors.border, marginVertical: T.spacing.xs },

  // Table
  cell: {
    paddingHorizontal: T.spacing.sm,
    ...T.typography.bodySm,
    color: T.colors.textPrimary,
  },
  cellHead: {
    ...T.typography.labelMd,
    color: T.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: T.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
    alignSelf: 'flex-start',
  },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { ...T.typography.labelSm, letterSpacing: 0.2 },

  // Statement primitives
  titleBlock: { alignItems: 'center', gap: 2 },
  titleCompany: { ...T.typography.h4, color: T.colors.textPrimary, textAlign: 'center' },
  titleReport: { ...T.typography.h5, color: T.colors.textPrimary, textAlign: 'center' },
  titlePeriod: { ...T.typography.bodySm, color: T.colors.textSecondary, textAlign: 'center' },
  titleBasis: {
    ...T.typography.caption,
    color: T.colors.textTertiary,
    textAlign: 'center',
    marginTop: 1,
  },

  stRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: T.spacing.sm },
  stRowTotal: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.colors.border,
    marginTop: 2,
    paddingTop: 8,
  },
  stRowGrand: {
    borderTopWidth: 2,
    borderTopColor: T.colors.textPrimary,
    marginTop: 4,
    paddingTop: 9,
  },
  // Fixed width so an expandable row's label starts where a plain row's does.
  stToggle: { width: 16, alignItems: 'center', paddingTop: 2 },
  stLabel: { ...T.typography.bodySm, color: T.colors.textPrimary, flex: 1 },
  // A tappable row meets the 44pt touch target.
  stRowTouchable: { minHeight: 44, alignItems: 'center' },
  stAmountCol: { width: 118, alignItems: 'flex-end' },
  stAmount: {
    ...T.typography.bodySm,
    color: T.colors.textPrimary,
    width: 118,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  stDetail: {
    ...T.typography.caption,
    color: T.colors.textTertiary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  stEmphasis: { fontWeight: T.typography.h1.fontWeight },
  stItalic: { fontStyle: 'italic', color: T.colors.textSecondary },

  // Progress
  progressBg: { height: 8, backgroundColor: T.colors.neutral100, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },

  // Segmented
  segment: {
    flexDirection: 'row',
    backgroundColor: T.colors.neutral100,
    borderRadius: T.radius.md,
    padding: SEG_TRACK_PAD,
  },
  segmentFill: { flex: 1 },
  segmentRow: { flexDirection: 'row', gap: SEG_GAP },
  // Absolute and content-sized: each label measures at its natural width.
  segmentMeasure: { position: 'absolute', left: 0, top: 0, opacity: 0, alignItems: 'flex-start' },
  segmentBtn: {
    paddingVertical: 7,
    paddingHorizontal: SEG_PAD_X,
    borderRadius: T.radius.sm,
    alignItems: 'center',
  },
  segmentEqual: { flex: 1 },
  segmentContent: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' },
  segmentBtnActive: { backgroundColor: T.colors.surface, ...T.shadows.xs },
  segmentText: { ...T.typography.labelMd, color: T.colors.textSecondary },
  segmentTextActive: { color: T.colors.primary },

  // Date field
  // The same control as CustomInput and CustomDropdown: side by side on a form
  // ("Payment Date" beside "Method") a 42px grey date under a smaller label sat
  // visibly out of line with the 48px white field next to it.
  fieldLabel: {
    ...T.typography.bodyMd,
    fontWeight: T.typography.labelSm.fontWeight,
    color: T.colors.textPrimary,
    // CustomInput's own gap, so a date and a field side by side start level.
    marginBottom: T.spacing.xxs,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.colors.surface,
    borderWidth: 1,
    borderColor: T.colors.border,
    borderRadius: THEME.form.controlRadius,
    paddingHorizontal: 12,
    height: THEME.form.controlHeight,
  },
  fieldInput: { flex: 1, ...T.typography.bodyMd, color: T.colors.textPrimary, paddingVertical: 0 },

  // Calendar picker (custom, cross-platform)
  calBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: T.spacing.lg,
    backgroundColor: 'rgba(14,23,38,0.55)',
  },
  calCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: T.colors.surface,
    borderRadius: T.radius.lg,
    overflow: 'hidden',
    ...T.shadows.lg,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.md,
  },
  calNav: {
    width: 34,
    height: 34,
    borderRadius: T.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  calNavDisabled: { backgroundColor: 'rgba(255,255,255,0.04)' },
  calMonth: { ...T.typography.h4, color: T.colors.neutral0 },
  calBody: { paddingHorizontal: T.spacing.sm, paddingTop: T.spacing.sm },
  calWeekRow: { flexDirection: 'row', paddingBottom: 6 },
  calWeekday: {
    flex: 1,
    textAlign: 'center',
    ...T.typography.labelSm,
    color: T.colors.textTertiary,
    textTransform: 'uppercase',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  calDay: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDaySel: { backgroundColor: T.colors.primary },
  calDayToday: { borderWidth: 1, borderColor: T.colors.primary },
  calDayText: { ...T.typography.bodyMd, color: T.colors.textPrimary },
  calDayTextSel: { color: T.colors.neutral0, fontWeight: T.typography.h3.fontWeight },
  calDayTextDisabled: { color: T.colors.textTertiary, opacity: 0.4 },
  calFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: T.spacing.md,
    paddingVertical: T.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.colors.borderLight,
  },
  calCancel: { ...T.typography.labelLg, color: T.colors.textTertiary },
  calToday: { ...T.typography.labelLg, color: T.colors.primary, fontWeight: T.typography.h3.fontWeight },

  // States
  stateBlock: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  moreBlock: { alignItems: 'center', justifyContent: 'center', paddingVertical: T.spacing.md, gap: T.spacing.xs },
  stateIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stateText: { ...T.typography.bodyMd, color: T.colors.textSecondary, textAlign: 'center' },
  stateHint: { ...T.typography.caption, color: T.colors.textTertiary, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: T.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.primary + '44',
    backgroundColor: T.colors.primaryLight,
  },
  retryText: { ...T.typography.labelMd, color: T.colors.primary },
  // Same spec as the header create pill, so the two create affordances match.
  stateAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: T.spacing.xxs,
    backgroundColor: THEME.form.addPill.background,
    paddingHorizontal: THEME.form.addPill.paddingHorizontal,
    paddingVertical: THEME.form.addPill.paddingVertical,
    borderRadius: THEME.form.addPill.radius,
  },
  stateActionText: {
    fontFamily: THEME.typography.fontFamily,
    fontSize: THEME.form.addPill.fontSize,
    fontWeight: THEME.form.addPill.fontWeight,
    color: T.colors.neutral0,
  },
});
