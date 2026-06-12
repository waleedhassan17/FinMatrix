// ═══════════════════════════════════════════════════════
// FinMatrix — Reports & Hub UI Kit
// Shared, enterprise-grade presentational primitives so every
// report / hub / dashboard surface is visually consistent.
// All tokens come from utils/theme (THEME) — single source of truth.
// ═══════════════════════════════════════════════════════

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  StatusBar,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../utils/theme';

const T = THEME;

// Shared navy header gradient (matches the company dashboard hero).
export const HEADER_NAVY = ['#0E1726', '#16243B', '#1C2F4C'] as const;

// Curated accent palette for KPI tiles / chart series — used everywhere
// so a "blue metric" looks the same on every screen.
export const ACCENT = {
  brand: T.colors.primary, // emerald — primary brand
  blue: '#2563EB',
  violet: T.colors.secondary,
  amber: T.colors.warning,
  red: T.colors.danger,
  green: T.colors.success,
  teal: '#0F766E',
};

export const CHART_SERIES = [
  ACCENT.brand,
  ACCENT.blue,
  ACCENT.violet,
  ACCENT.amber,
  ACCENT.teal,
  ACCENT.red,
];

// ── Screen container ──────────────────────────────────
export const ReportContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SafeAreaView style={[S.container, { backgroundColor: HEADER_NAVY[0] }]} edges={['top']}>
    <View style={S.container}>
      {children}
    </View>
  </SafeAreaView>
);

// ── Unified header ────────────────────────────────────
// `onBack` → renders the back row (used by detail screens).
// Omit `onBack` for tab-root screens (Reports/Transactions hubs).
// Canonical app-wide back button — a plain `arrow-left` (no box), matching the
// Transactions screens. White on the navy header; `dark` for light surfaces.
export const BackButton: React.FC<{ onPress: () => void; dark?: boolean }> = ({ onPress, dark }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    style={S.backBtn}
  >
    <Feather name="arrow-left" size={24} color={dark ? T.colors.textPrimary : '#FFFFFF'} />
  </TouchableOpacity>
);

export const ReportHeader: React.FC<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
}> = ({ title, subtitle, onBack, right }) => (
  <LinearGradient colors={HEADER_NAVY} style={S.header}>
    <StatusBar barStyle="light-content" backgroundColor={HEADER_NAVY[0]} />
    <View style={S.headerSheen} pointerEvents="none" />
    <View style={S.headerRow}>
      {onBack ? <BackButton onPress={onBack} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={S.headerTitle}>{title}</Text>
        {subtitle ? <Text style={S.headerSub}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={S.headerRight}>{right}</View> : null}
    </View>
  </LinearGradient>
);

// Circular icon action used in headers (translucent white on the navy header).
export const HeaderIconButton: React.FC<{ icon: keyof typeof Feather.glyphMap; onPress?: () => void }> = ({
  icon,
  onPress,
}) => (
  <TouchableOpacity style={S.headerBtn} activeOpacity={0.7} onPress={onPress}>
    <Feather name={icon} size={16} color="#FFFFFF" />
  </TouchableOpacity>
);

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
  <View style={[S.kpiTile, style]}>
    <View style={[S.kpiAccent, { backgroundColor: accent }]} />
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

// ── Segmented control (period pickers) ────────────────
export const Segmented: React.FC<{
  options: string[];
  activeIndex: number;
  onChange: (i: number) => void;
}> = ({ options, activeIndex, onChange }) => (
  <View style={S.segment}>
    {options.map((opt, i) => {
      const active = i === activeIndex;
      return (
        <TouchableOpacity
          key={opt}
          style={[S.segmentBtn, active && S.segmentBtnActive]}
          activeOpacity={0.8}
          onPress={() => onChange(i)}
        >
          <Text style={[S.segmentText, active && S.segmentTextActive]}>{opt}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── Date field ────────────────────────────────────────
export const DateField: React.FC<{
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}> = ({ label, value, onChangeText, placeholder = 'YYYY-MM-DD', style }) => (
  <View style={[{ flex: 1 }, style]}>
    {label ? <Text style={S.fieldLabel}>{label}</Text> : null}
    <View style={S.fieldWrap}>
      <Feather name="calendar" size={15} color={T.colors.textTertiary} style={{ marginRight: 8 }} />
      <TextInput
        style={S.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  </View>
);

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

export const EmptyBlock: React.FC<{ icon?: keyof typeof Feather.glyphMap; title: string; hint?: string }> = ({
  icon = 'inbox',
  title,
  hint,
}) => (
  <View style={S.stateBlock}>
    <View style={[S.stateIcon, { backgroundColor: T.colors.neutral100 }]}>
      <Feather name={icon} size={20} color={T.colors.textTertiary} />
    </View>
    <Text style={S.stateText}>{title}</Text>
    {hint ? <Text style={S.stateHint}>{hint}</Text> : null}
  </View>
);

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
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
  },
  headerSheen: {
    position: 'absolute',
    right: -60,
    top: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { marginRight: 4, padding: 2 },
  headerTitle: { ...T.typography.h2, color: '#FFFFFF' },
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
    flexDirection: 'row',
    overflow: 'hidden',
    ...T.shadows.xs,
  },
  kpiAccent: { width: 4 },
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
  bold: { fontWeight: '700' },
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

  // Progress
  progressBg: { height: 8, backgroundColor: T.colors.neutral100, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },

  // Segmented
  segment: {
    flexDirection: 'row',
    backgroundColor: T.colors.neutral100,
    borderRadius: T.radius.md,
    padding: 3,
    gap: 3,
  },
  segmentBtn: { flex: 1, paddingVertical: 7, borderRadius: T.radius.sm, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: T.colors.surface, ...T.shadows.xs },
  segmentText: { ...T.typography.labelMd, color: T.colors.textSecondary },
  segmentTextActive: { color: T.colors.primary },

  // Date field
  fieldLabel: { ...T.typography.labelMd, color: T.colors.textSecondary, marginBottom: 6 },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.colors.neutral50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.colors.border,
    borderRadius: T.radius.md,
    paddingHorizontal: 12,
    height: 42,
  },
  fieldInput: { flex: 1, ...T.typography.bodyMd, color: T.colors.textPrimary, paddingVertical: 0 },

  // States
  stateBlock: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
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
});
