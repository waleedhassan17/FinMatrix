// ═══════════════════════════════════════════════════════
// FinMatrix — One metric over the months, as columns or a line
// ═══════════════════════════════════════════════════════
// The phone's half of the web's MetricChart, hand-drawn in react-native-svg
// like InvoicedBilledChart (same axis rule, same web font fallback, same
// whole-month tap bands).
//
// One series, one scale: the explorer charts one metric at a time and lists
// the rest underneath, because two metrics on one frame would need two axes.
// The line is straight between months (smoothing would invent values) and
// BREAKS at a month with no reading rather than bridging it. A negative month
// — a loss, a return-heavy month, stock sold before it was dated in — is drawn
// below a zero line in the danger colour.

import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { niceAxis } from '../../../models/chartAxisModel';
import {
  explorerMetric,
  formatMetric,
  formatMetricCompact,
  type ExplorerMetricKey,
} from '../../../models/itemExplorerModel';
import { THEME } from '../../../theme';

const { colors, typography } = THEME;

export type ChartType = 'bar' | 'line';

export interface MetricChartPoint {
  period: string;
  label: string;
  /** Null is a GAP — no reading — never a zero. */
  value: number | null;
}

const TOP = 10;
const PLOT_H = 180;
const LABEL_H = 22;
const PAD_R = 12;
const TICK_FONT = typography.overline.fontSize;
/** Roughly what one tick character takes at the overline size. */
const CHAR_W = 6.2;
/**
 * SVG text does not go through React Native's font mapping; on the web the
 * theme's 'System' is an unknown family and falls back to a serif.
 */
const SVG_FONT =
  Platform.OS === 'web'
    ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    : undefined;

interface Props {
  metric: ExplorerMetricKey;
  points: MetricChartPoint[];
  type: ChartType;
  selected?: string | null;
  /** Tapping a month; tapping the selected one again clears it. */
  onSelect?: (period: string | null) => void;
  /** Drawn as a dashed line, when given; the screen names the figure. */
  average?: number | null;
}

const MetricChart: React.FC<Props> = ({
  metric,
  points,
  type,
  selected = null,
  onSelect,
  average = null,
}) => {
  const [width, setWidth] = useState(0);
  const def = explorerMetric(metric);

  const values = points.map(p => p.value);
  const axis = niceAxis([...values, average], { integer: def.unit === 'qty' });
  const [bottom, top] = axis.domain;
  const span = top - bottom || 1;
  const y = (v: number) => TOP + ((top - v) / span) * PLOT_H;
  const tickText = axis.ticks.map(t => formatMetricCompact(metric, t));
  const axisW = Math.max(34, Math.ceil(Math.max(...tickText.map(t => t.length)) * CHAR_W) + 8);

  const plotW = Math.max(0, width - axisW - PAD_R);
  const band = points.length > 0 ? plotW / points.length : 0;
  const barW = Math.max(3, Math.min(22, band * 0.56));
  const centre = (i: number) => axisW + i * band + band / 2;
  // Month labels thin out when they would collide, always keeping the last.
  const labelEvery = band >= 34 ? 1 : band >= 17 ? 2 : band >= 11 ? 3 : 6;

  const zero = y(0);
  const hasSelection = selected !== null && points.some(p => p.period === selected);
  const dips = values.some(v => v !== null && v < 0);

  const barFill = (p: MetricChartPoint) => {
    const negative = p.value !== null && p.value < 0;
    const receded = hasSelection && p.period !== selected;
    if (negative) return receded ? colors.dangerLight : colors.danger;
    return receded ? colors.navy200 : colors.primary;
  };

  // Contiguous runs of known months: the line breaks where there is no reading.
  const runs: { i: number; v: number }[][] = [];
  points.forEach((p, i) => {
    if (p.value === null) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1].i === i - 1) last.push({ i, v: p.value });
    else runs.push([{ i, v: p.value }]);
  });

  return (
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <View>
          <Svg width={width} height={TOP + PLOT_H + LABEL_H}>
            {axis.ticks.map((t, k) => (
              <React.Fragment key={t}>
                <Line
                  x1={axisW}
                  x2={axisW + plotW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 && dips ? colors.borderStrong : colors.borderLight}
                  strokeWidth={1}
                />
                <SvgText
                  x={axisW - 6}
                  y={y(t) + 4}
                  fontSize={TICK_FONT}
                  fontFamily={SVG_FONT}
                  fill={colors.textTertiary}
                  textAnchor="end"
                >
                  {tickText[k]}
                </SvgText>
              </React.Fragment>
            ))}

            {/* The tapped month, behind its mark. */}
            {hasSelection && (
              <Rect
                x={axisW + points.findIndex(p => p.period === selected) * band + 1}
                y={TOP}
                width={Math.max(0, band - 2)}
                height={PLOT_H}
                fill={colors.primaryLight}
                rx={3}
              />
            )}

            {average !== null && (
              <Line
                x1={axisW}
                x2={axisW + plotW}
                y1={y(average)}
                y2={y(average)}
                stroke={colors.neutral400}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            )}

            {type === 'bar' &&
              points.map((p, i) => {
                if (p.value === null) return null;
                const top0 = y(Math.max(p.value, 0));
                const h = Math.max(p.value === 0 ? 0 : 1, Math.abs(y(p.value) - zero));
                return (
                  <Rect
                    key={p.period}
                    x={centre(i) - barW / 2}
                    y={top0}
                    width={barW}
                    height={h}
                    fill={barFill(p)}
                    rx={2}
                  />
                );
              })}

            {type === 'line' &&
              runs.map(run =>
                run.length > 1 ? (
                  <Polyline
                    key={`run-${run[0].i}`}
                    points={run.map(pt => `${centre(pt.i)},${y(pt.v)}`).join(' ')}
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth={2}
                  />
                ) : null,
              )}
            {type === 'line' &&
              points.map((p, i) =>
                p.value === null ? null : (
                  <Circle
                    key={`dot-${p.period}`}
                    cx={centre(i)}
                    cy={y(p.value)}
                    r={p.period === selected ? 5 : 3}
                    fill={p.period === selected ? (p.value < 0 ? colors.danger : colors.primary) : colors.surface}
                    stroke={p.value < 0 ? colors.danger : colors.primary}
                    strokeWidth={2}
                  />
                ),
              )}

            {points.map((p, i) =>
              (points.length - 1 - i) % labelEvery === 0 ? (
                <SvgText
                  key={`label-${p.period}`}
                  x={centre(i)}
                  y={TOP + PLOT_H + 15}
                  fontSize={TICK_FONT}
                  fontFamily={SVG_FONT}
                  fill={p.period === selected ? colors.textPrimary : colors.textTertiary}
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              ) : null,
            )}
          </Svg>

          {/* Tap targets: a whole month's band each, far easier to hit than
              a narrow column or a 3px dot. */}
          {onSelect && (
            <View style={[styles.hits, { left: axisW, width: plotW }]}>
              {points.map(p => (
                <Pressable
                  key={p.period}
                  style={styles.hit}
                  onPress={() => onSelect(p.period === selected ? null : p.period)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: p.period === selected }}
                  accessibilityLabel={`${p.label}: ${p.value === null ? 'no reading' : formatMetric(metric, p.value)}`}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  hits: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row' },
  hit: { flex: 1 },
});

export default MetricChart;
