// ═══════════════════════════════════════════════════════
// FinMatrix — Invoiced and billed by month
// ═══════════════════════════════════════════════════════
// The web's monthly chart, drawn for a phone. Two columns a month — invoiced,
// and billed in a paler step of the same hue — with the difference between
// them as a line through the months. It replaces two chart-kit line charts: a
// gradient-filled bezier of revenue (smoothing invents values between months
// that do not exist) and a lone "cash flow" line that was really invoiced less
// billed, drawn with nothing to show what it was the difference of.
//
// Hand-drawn in react-native-svg rather than chart-kit, which can neither put
// columns and a line on one frame nor size its value axis the way the web does
// (a shallow dip below zero gets a sliver, not a whole empty step).
//
// Tapping a month selects it for the readout underneath — the phone's answer to
// a hover tooltip, and one that stays put when the finger lifts.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { ACCENT } from '../../../components/reports/ReportUI';
import { analyticsAxis, type AnalyticsMonth } from '../../../models/analyticsModel';
import { THEME } from '../../../theme';

const { colors, spacing, typography } = THEME;

/** Invoiced and billed share a hue; the difference contrasts with both. */
export const SERIES = {
  invoiced: { label: 'Invoiced', color: colors.primary },
  billed: { label: 'Billed', color: colors.navy200 },
  net: { label: 'Invoiced less billed', color: ACCENT.amber },
} as const;

const TOP = 8;
const PLOT_H = 170;
const LABEL_H = 22;
const AXIS_W = 42;
/** Room for the last month's label, which is centred on its column. */
const PAD_R = 12;
const TICK_FONT = typography.overline.fontSize;
/**
 * SVG text does not go through React Native's font mapping. The theme's
 * 'System' means the platform font to a <Text>, but to a browser it is an
 * unknown family, and the labels fell back to a serif. On the web the stack is
 * spelled out; natively the SVG default already is the system font.
 */
const SVG_FONT =
  Platform.OS === 'web'
    ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    : undefined;

const compact = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`;
  return `${sign}${Math.round(abs)}`;
};

export const ChartLegend: React.FC = () => (
  <View style={styles.legend}>
    {(['invoiced', 'billed'] as const).map(k => (
      <View key={k} style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: SERIES[k].color }]} />
        <Text style={styles.legendText}>{SERIES[k].label}</Text>
      </View>
    ))}
    <View style={styles.legendItem}>
      <View style={[styles.legendLine, { backgroundColor: SERIES.net.color }]} />
      <Text style={styles.legendText}>{SERIES.net.label}</Text>
    </View>
  </View>
);

interface Props {
  months: AnalyticsMonth[];
  selected: number;
  onSelect: (index: number) => void;
}

const InvoicedBilledChart: React.FC<Props> = ({ months, selected, onSelect }) => {
  const [width, setWidth] = useState(0);

  const axis = analyticsAxis(months);
  const [bottom, top] = axis.domain;
  const span = top - bottom || 1;
  const y = (v: number) => TOP + ((top - v) / span) * PLOT_H;

  const plotW = Math.max(0, width - AXIS_W - PAD_R);
  const band = months.length > 0 ? plotW / months.length : 0;
  const barW = Math.max(3, Math.min(12, band * 0.3));
  const centre = (i: number) => AXIS_W + i * band + band / 2;
  // Month labels thin out when they would collide, always keeping the last.
  const labelEvery = band < 34 ? 2 : 1;

  const zero = y(0);
  const bar = (v: number) => {
    const y0 = y(Math.max(v, 0));
    return { y: y0, h: Math.max(v === 0 ? 0 : 1, Math.abs(y(v) - zero)) };
  };

  return (
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <View>
          <Svg width={width} height={TOP + PLOT_H + LABEL_H}>
            {/* Gridlines and their amounts. */}
            {axis.ticks.map(t => (
              <React.Fragment key={t}>
                <Line
                  x1={AXIS_W}
                  x2={AXIS_W + plotW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? colors.borderStrong : colors.borderLight}
                  strokeWidth={1}
                />
                <SvgText
                  x={AXIS_W - 6}
                  y={y(t) + 4}
                  fontSize={TICK_FONT}
                  fontFamily={SVG_FONT}
                  fill={colors.textTertiary}
                  textAnchor="end"
                >
                  {compact(t)}
                </SvgText>
              </React.Fragment>
            ))}

            {/* The tapped month, behind its columns. */}
            {selected >= 0 && selected < months.length && (
              <Rect
                x={AXIS_W + selected * band + 1}
                y={TOP}
                width={Math.max(0, band - 2)}
                height={PLOT_H}
                fill={colors.primaryLight}
                rx={3}
              />
            )}

            {months.map((m, i) => {
              const inv = bar(m.invoiced);
              const bil = bar(m.billed);
              const x = centre(i);
              return (
                <React.Fragment key={m.label}>
                  <Rect
                    x={x - barW - 1}
                    y={inv.y}
                    width={barW}
                    height={inv.h}
                    fill={SERIES.invoiced.color}
                    rx={2}
                  />
                  <Rect
                    x={x + 1}
                    y={bil.y}
                    width={barW}
                    height={bil.h}
                    fill={SERIES.billed.color}
                    rx={2}
                  />
                  {(months.length - 1 - i) % labelEvery === 0 && (
                    <SvgText
                      x={x}
                      y={TOP + PLOT_H + 15}
                      fontSize={TICK_FONT}
                      fontFamily={SVG_FONT}
                      fill={i === selected ? colors.textPrimary : colors.textTertiary}
                      textAnchor="middle"
                    >
                      {m.label}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}

            {/* Straight between months: smoothing would invent values. */}
            {months.length > 1 && (
              <Polyline
                points={months.map((m, i) => `${centre(i)},${y(m.net)}`).join(' ')}
                fill="none"
                stroke={SERIES.net.color}
                strokeWidth={2}
              />
            )}
            {months.map((m, i) => (
              <Circle
                key={`dot-${m.label}`}
                cx={centre(i)}
                cy={y(m.net)}
                r={i === selected ? 4 : 3}
                fill={colors.surface}
                stroke={SERIES.net.color}
                strokeWidth={2}
              />
            ))}
          </Svg>

          {/* The tap targets: a whole month's band each, far easier to hit
              than a 10px column. */}
          <View style={[styles.hits, { left: AXIS_W, width: plotW }]}>
            {months.map((m, i) => (
              <Pressable
                key={m.label}
                style={styles.hit}
                onPress={() => onSelect(i)}
                accessibilityRole="button"
                accessibilityState={{ selected: i === selected }}
                accessibilityLabel={`${m.label}. Show its figures`}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendLine: { width: 14, height: 2, borderRadius: 1 },
  legendText: { ...typography.caption, color: colors.textSecondary },
  hits: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row' },
  hit: { flex: 1 },
});

export default InvoicedBilledChart;
