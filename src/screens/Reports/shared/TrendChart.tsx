// ═══════════════════════════════════════════════════════
// FinMatrix — A monthly series as columns, with an optional line
// ═══════════════════════════════════════════════════════
// Hand-drawn in react-native-svg like MetricChart (same axis rule, same web
// font fallback, same whole-month tap bands) — no Skia, so it runs in the
// current build.
//
// The columns are a FLOW (net cash in a month, revenue in a month) and the
// line a LEVEL (cash held at each month end). They differ by an order of
// magnitude, so the line gets its own scale with its ticks on the right; one
// shared axis would flatten the columns to nothing. Columns below zero are in
// the danger colour. Tapping a month reads both figures out above the chart.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { niceAxis } from '../../../models/chartAxisModel';
import { compactMoney } from '../../../models/itemExplorerModel';
import { parenNegative } from '../../../components/reports/reportFormat';
import { THEME } from '../../../theme';

const { colors, spacing, typography } = THEME;

export interface TrendPoint {
  key: string;
  label: string;
  /** The column. Null is a gap — no reading — never a zero. */
  value: number | null;
  /** The line, on its own scale. */
  line?: number | null;
}

const TOP = 10;
const PLOT_H = 160;
const LABEL_H = 22;
const TICK_FONT = typography.overline.fontSize;
const CHAR_W = 6.2;
const SVG_FONT =
  Platform.OS === 'web'
    ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    : undefined;

interface Props {
  points: TrendPoint[];
  /** What the columns are — "Net cash". */
  barLabel: string;
  /** What the line is — "Ending cash"; no line when absent. */
  lineLabel?: string;
  /** Full figure for the readout; compact for the ticks. */
  format?: (v: number) => string;
  formatTick?: (v: number) => string;
  emptyLabel?: string;
}

const rs = (n: number) => parenNegative(n, 'Rs ');

const TrendChart: React.FC<Props> = ({
  points,
  barLabel,
  lineLabel,
  format = rs,
  formatTick = compactMoney,
  emptyLabel = 'No months to show yet.',
}) => {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const hasLine = !!lineLabel && points.some(p => p.line !== null && p.line !== undefined);
  if (points.length === 0) return <Text style={styles.empty}>{emptyLabel}</Text>;

  const axis = niceAxis(points.map(p => p.value));
  const [bottom, top] = axis.domain;
  const span = top - bottom || 1;
  const y = (v: number) => TOP + ((top - v) / span) * PLOT_H;
  const tickText = axis.ticks.map(t => formatTick(t));
  const axisW = Math.max(34, Math.ceil(Math.max(...tickText.map(t => t.length)) * CHAR_W) + 8);

  const lineAxis = hasLine ? niceAxis(points.map(p => p.line ?? null)) : null;
  const lineSpan = lineAxis ? lineAxis.domain[1] - lineAxis.domain[0] || 1 : 1;
  const ly = (v: number) => (lineAxis ? TOP + ((lineAxis.domain[1] - v) / lineSpan) * PLOT_H : 0);
  const lineTicks = lineAxis ? lineAxis.ticks.map(t => formatTick(t)) : [];
  const rightW = lineAxis ? Math.max(30, Math.ceil(Math.max(...lineTicks.map(t => t.length)) * CHAR_W) + 6) : 12;

  const plotW = Math.max(0, width - axisW - rightW);
  const band = plotW / points.length;
  const barW = Math.max(3, Math.min(22, band * 0.56));
  const centre = (i: number) => axisW + i * band + band / 2;
  const labelEvery = band >= 34 ? 1 : band >= 17 ? 2 : band >= 11 ? 3 : 6;
  const zero = y(0);
  const dips = points.some(p => p.value !== null && p.value < 0);
  const sel = points.find(p => p.key === selected) ?? null;

  const runs: { i: number; v: number }[][] = [];
  if (hasLine) {
    points.forEach((p, i) => {
      if (p.line === null || p.line === undefined) return;
      const last = runs[runs.length - 1];
      if (last && last[last.length - 1].i === i - 1) last.push({ i, v: p.line });
      else runs.push([{ i, v: p.line }]);
    });
  }

  return (
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>{barLabel}</Text>
        </View>
        {hasLine ? (
          <View style={styles.legendItem}>
            <View style={[styles.swatchLine, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendText}>{lineLabel} (right scale)</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.readout} numberOfLines={2} accessibilityLiveRegion="polite">
        {sel
          ? `${sel.label} · ${barLabel} ${sel.value === null ? '—' : format(sel.value)}${
              hasLine && sel.line !== null && sel.line !== undefined ? ` · ${lineLabel} ${format(sel.line)}` : ''
            }`
          : 'Tap a month for its figures.'}
      </Text>
      {width > 0 && (
        <View>
          <Svg width={width} height={TOP + PLOT_H + LABEL_H}>
            {axis.ticks.map((t, k) => (
              <React.Fragment key={`t${t}`}>
                <Line
                  x1={axisW}
                  x2={axisW + plotW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 && dips ? colors.borderStrong : colors.borderLight}
                  strokeWidth={1}
                />
                <SvgText x={axisW - 6} y={y(t) + 4} fontSize={TICK_FONT} fontFamily={SVG_FONT} fill={colors.textTertiary} textAnchor="end">
                  {tickText[k]}
                </SvgText>
              </React.Fragment>
            ))}
            {lineAxis?.ticks.map((t, k) => (
              <SvgText
                key={`r${t}`}
                x={axisW + plotW + 4}
                y={ly(t) + 4}
                fontSize={TICK_FONT}
                fontFamily={SVG_FONT}
                fill={colors.warning}
                textAnchor="start"
              >
                {lineTicks[k]}
              </SvgText>
            ))}

            {sel && (
              <Rect
                x={axisW + points.indexOf(sel) * band + 1}
                y={TOP}
                width={Math.max(0, band - 2)}
                height={PLOT_H}
                fill={colors.primaryLight}
                rx={3}
              />
            )}

            {points.map((p, i) => {
              if (p.value === null) return null;
              const receded = !!sel && sel.key !== p.key;
              const negative = p.value < 0;
              return (
                <Rect
                  key={p.key}
                  x={centre(i) - barW / 2}
                  y={y(Math.max(p.value, 0))}
                  width={barW}
                  height={Math.max(p.value === 0 ? 0 : 1, Math.abs(y(p.value) - zero))}
                  fill={negative ? (receded ? colors.dangerLight : colors.danger) : receded ? colors.navy200 : colors.primary}
                  rx={2}
                />
              );
            })}

            {runs.map(run =>
              run.length > 1 ? (
                <Polyline
                  key={`run-${run[0].i}`}
                  points={run.map(pt => `${centre(pt.i)},${ly(pt.v)}`).join(' ')}
                  fill="none"
                  stroke={colors.warning}
                  strokeWidth={2}
                />
              ) : null,
            )}
            {hasLine &&
              points.map((p, i) =>
                p.line === null || p.line === undefined ? null : (
                  <Circle
                    key={`dot-${p.key}`}
                    cx={centre(i)}
                    cy={ly(p.line)}
                    r={p.key === selected ? 4.5 : 2.5}
                    fill={colors.surface}
                    stroke={colors.warning}
                    strokeWidth={2}
                  />
                ),
              )}

            {points.map((p, i) =>
              (points.length - 1 - i) % labelEvery === 0 ? (
                <SvgText
                  key={`label-${p.key}`}
                  x={centre(i)}
                  y={TOP + PLOT_H + 15}
                  fontSize={TICK_FONT}
                  fontFamily={SVG_FONT}
                  fill={p.key === selected ? colors.textPrimary : colors.textTertiary}
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              ) : null,
            )}
          </Svg>

          <View style={[styles.hits, { left: axisW, width: plotW }]}>
            {points.map(p => (
              <Pressable
                key={p.key}
                style={styles.hit}
                onPress={() => setSelected(s => (s === p.key ? null : p.key))}
                accessibilityRole="button"
                accessibilityState={{ selected: p.key === selected }}
                accessibilityLabel={`${p.label}: ${barLabel} ${p.value === null ? 'no reading' : format(p.value)}${
                  hasLine && p.line !== null && p.line !== undefined ? `, ${lineLabel} ${format(p.line)}` : ''
                }`}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xxs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  swatchLine: { width: 14, height: 3, borderRadius: 2 },
  legendText: { ...typography.caption, color: colors.textSecondary },
  readout: { ...typography.labelSm, color: colors.textPrimary, minHeight: 18, marginBottom: spacing.xxs, fontVariant: ['tabular-nums'] },
  empty: { ...typography.bodySm, color: colors.textTertiary, paddingVertical: spacing.sm },
  hits: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row' },
  hit: { flex: 1 },
});

export default TrendChart;
