// ═══════════════════════════════════════════════════════
// FinMatrix — Month-by-month charts on ONE scale each
// ═══════════════════════════════════════════════════════
// Three pictures the website draws too, hand-drawn in react-native-svg like
// TrendChart (same axis rule, same web font fallback, same whole-month tap
// bands), but never with two scales on one frame:
//
//   ProfitChart       revenue and gross profit as columns, net profit a line —
//                     all money of the same size, so one axis serves them;
//   CashBalanceChart  cash and bank at each month end, a line over a wash;
//   CashInOutChart    cash in up and cash out down from one zero line.
//
// The two cash charts share a y-axis width, so stacked one above the other
// each month sits directly under itself — the website's layout, on a phone.

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { niceAxis } from '../../../models/chartAxisModel';
import { compactMoney } from '../../../models/itemExplorerModel';
import { parenNegative } from '../../../components/reports/reportFormat';
import { THEME } from '../../../theme';
import { CATEGORY_PALETTE } from '../../../theme/theme';

const { colors, spacing, typography } = THEME;

const TOP = 10;
const LABEL_H = 22;
const TICK_FONT = typography.overline.fontSize;
/** Wide enough for "−Rs 150K"; the same on both cash charts so their months align. */
const AXIS_W = 58;
const RIGHT_PAD = 8;
const SVG_FONT =
  Platform.OS === 'web'
    ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    : undefined;

const rs = (n: number) => parenNegative(n, 'Rs ');

/** Cash in wears the brand's teal, cash out its navy — the website's pair. The balance line is the navy. */
export const CASH_IN_COLOR = CATEGORY_PALETTE[1];
export const CASH_OUT_COLOR = CATEGORY_PALETTE[0];
const BALANCE_COLOR = CATEGORY_PALETTE[0];

export interface MonthDatum {
  key: string;
  label: string;
}

interface FrameProps<T extends MonthDatum> {
  data: T[];
  height: number;
  /** Every value the axis has to hold. */
  values: (number | null)[];
  /** The readout line for a tapped month. */
  readout: (d: T) => string;
  /** What a screen reader hears for a month. */
  describe: (d: T) => string;
  idle: string;
  legend?: { label: string; color: string; line?: boolean }[];
  /** Columns sit in the middle of each month; a line-only chart uses the same bands. */
  draw: (ctx: {
    x: (i: number) => number;
    y: (v: number) => number;
    band: number;
    selected: string | null;
  }) => React.ReactNode;
}

/** The shared frame: legend, readout, gridlines and ticks, month labels, tap bands. */
function MonthFrame<T extends MonthDatum>({ data, height, values, readout, describe, idle, legend, draw }: FrameProps<T>) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const axis = niceAxis(values);
  const [bottom, top] = axis.domain;
  const span = top - bottom || 1;
  const y = (v: number) => TOP + ((top - v) / span) * height;
  const plotW = Math.max(0, width - AXIS_W - RIGHT_PAD);
  const band = data.length ? plotW / data.length : 0;
  const x = (i: number) => AXIS_W + i * band + band / 2;
  const labelEvery = band >= 34 ? 1 : band >= 17 ? 2 : band >= 11 ? 3 : 6;
  const sel = data.find(d => d.key === selected) ?? null;
  const belowZero = values.some(v => v !== null && v < 0);

  return (
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {legend && legend.length > 1 ? (
        <View style={styles.legend}>
          {legend.map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[l.line ? styles.swatchLine : styles.swatch, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.readout} numberOfLines={2} accessibilityLiveRegion="polite">
        {sel ? readout(sel) : idle}
      </Text>
      {width > 0 ? (
        <View>
          <Svg width={width} height={TOP + height + LABEL_H}>
            {axis.ticks.map(t => (
              <React.Fragment key={`t${t}`}>
                <Line
                  x1={AXIS_W}
                  x2={AXIS_W + plotW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 && belowZero ? colors.borderStrong : colors.borderLight}
                  strokeWidth={1}
                />
                <SvgText x={AXIS_W - 6} y={y(t) + 4} fontSize={TICK_FONT} fontFamily={SVG_FONT} fill={colors.textTertiary} textAnchor="end">
                  {compactMoney(t)}
                </SvgText>
              </React.Fragment>
            ))}
            {sel ? (
              <Rect x={AXIS_W + data.indexOf(sel) * band + 1} y={TOP} width={Math.max(0, band - 2)} height={height} fill={colors.primaryLight} rx={3} />
            ) : null}
            {draw({ x, y, band, selected })}
            {data.map((d, i) =>
              (data.length - 1 - i) % labelEvery === 0 ? (
                <SvgText
                  key={`l-${d.key}`}
                  x={x(i)}
                  y={TOP + height + 15}
                  fontSize={TICK_FONT}
                  fontFamily={SVG_FONT}
                  fill={d.key === selected ? colors.textPrimary : colors.textTertiary}
                  textAnchor="middle"
                >
                  {d.label}
                </SvgText>
              ) : null,
            )}
          </Svg>
          <View style={[styles.hits, { left: AXIS_W, width: plotW }]}>
            {data.map(d => (
              <Pressable
                key={d.key}
                style={styles.hit}
                onPress={() => setSelected(s => (s === d.key ? null : d.key))}
                accessibilityRole="button"
                accessibilityState={{ selected: d.key === selected }}
                accessibilityLabel={describe(d)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── Revenue, gross profit and net profit ─────────────────────────────

export interface ProfitMonth extends MonthDatum {
  revenue: number;
  grossProfit: number;
  netIncome: number;
}

const PROFIT = [
  { key: 'revenue', label: 'Revenue', color: CATEGORY_PALETTE[0] },
  { key: 'grossProfit', label: 'Gross profit', color: CATEGORY_PALETTE[1] },
  { key: 'netIncome', label: 'Net profit', color: CATEGORY_PALETTE[2] },
] as const;

export const ProfitChart: React.FC<{ months: ProfitMonth[] }> = ({ months }) => {
  if (months.length === 0) return <Text style={styles.empty}>No months to show yet.</Text>;
  return (
    <MonthFrame
      data={months}
      height={150}
      values={months.flatMap(m => [m.revenue, m.grossProfit, m.netIncome])}
      legend={PROFIT.map(p => ({ label: p.label, color: p.color, line: p.key === 'netIncome' }))}
      idle="Tap a month for its figures."
      readout={m => `${m.label} · Revenue ${rs(m.revenue)} · Gross ${rs(m.grossProfit)} · Net ${rs(m.netIncome)}`}
      describe={m => `${m.label}: revenue ${rs(m.revenue)}, gross profit ${rs(m.grossProfit)}, net profit ${rs(m.netIncome)}`}
      draw={({ x, y, band, selected }) => {
        const barW = Math.max(2, Math.min(12, band * 0.3));
        const zero = y(0);
        const column = (m: ProfitMonth, i: number, v: number, color: string, shift: number) => (
          <Rect
            key={`${m.key}-${color}`}
            x={x(i) + shift - barW / 2}
            y={y(Math.max(v, 0))}
            width={barW}
            height={Math.max(v === 0 ? 0 : 1, Math.abs(y(v) - zero))}
            fill={color}
            opacity={selected && selected !== m.key ? 0.35 : 1}
            rx={2}
          />
        );
        return (
          <>
            {months.map((m, i) => column(m, i, m.revenue, PROFIT[0].color, -barW / 2 - 1))}
            {months.map((m, i) => column(m, i, m.grossProfit, PROFIT[1].color, barW / 2 + 1))}
            <Polyline
              points={months.map((m, i) => `${x(i)},${y(m.netIncome)}`).join(' ')}
              fill="none"
              stroke={PROFIT[2].color}
              strokeWidth={2}
            />
            {months.map((m, i) => (
              <Circle key={`n-${m.key}`} cx={x(i)} cy={y(m.netIncome)} r={m.key === selected ? 4 : 2.5} fill={colors.surface} stroke={PROFIT[2].color} strokeWidth={2} />
            ))}
          </>
        );
      }}
    />
  );
};

// ── Cash and bank at each month end ──────────────────────────────────

export interface BalanceMonth extends MonthDatum {
  endingCash: number | null;
}

export const CashBalanceChart: React.FC<{ months: BalanceMonth[]; height?: number }> = ({ months, height = 130 }) => {
  if (!months.some(m => m.endingCash !== null)) return <Text style={styles.empty}>No month-end balances for this period.</Text>;
  return (
    <MonthFrame
      data={months}
      height={height}
      values={months.map(m => m.endingCash)}
      idle="Tap a month for its closing cash."
      readout={m => `${m.label} · Cash and bank ${m.endingCash === null ? '—' : rs(m.endingCash)}`}
      describe={m => `${m.label}: cash and bank ${m.endingCash === null ? 'no reading' : rs(m.endingCash)}`}
      draw={({ x, y, selected }) => {
        const runs: { i: number; v: number }[][] = [];
        months.forEach((m, i) => {
          if (m.endingCash === null) return;
          const last = runs[runs.length - 1];
          if (last && last[last.length - 1].i === i - 1) last.push({ i, v: m.endingCash });
          else runs.push([{ i, v: m.endingCash }]);
        });
        const base = y(Math.max(0, Math.min(...months.map(m => m.endingCash ?? 0))));
        return (
          <>
            {runs.map(r =>
              r.length > 1 ? (
                <Path
                  key={`a${r[0].i}`}
                  d={`M${x(r[0].i)},${base} ${r.map(p => `L${x(p.i)},${y(p.v)}`).join(' ')} L${x(r[r.length - 1].i)},${base} Z`}
                  fill={BALANCE_COLOR}
                  opacity={0.08}
                />
              ) : null,
            )}
            {runs.map(r =>
              r.length > 1 ? (
                <Polyline key={`l${r[0].i}`} points={r.map(p => `${x(p.i)},${y(p.v)}`).join(' ')} fill="none" stroke={BALANCE_COLOR} strokeWidth={2} />
              ) : null,
            )}
            {months.map((m, i) =>
              m.endingCash === null ? null : (
                <Circle key={`d${m.key}`} cx={x(i)} cy={y(m.endingCash)} r={m.key === selected ? 4 : 2.5} fill={colors.surface} stroke={BALANCE_COLOR} strokeWidth={2} />
              ),
            )}
          </>
        );
      }}
    />
  );
};

// ── Cash in and cash out ─────────────────────────────────────────────

export interface InOutMonth extends MonthDatum {
  inflow: number;
  outflow: number;
  net: number;
}

export const CashInOutChart: React.FC<{ months: InOutMonth[] }> = ({ months }) => {
  if (!months.some(m => m.inflow !== 0 || m.outflow !== 0)) return <Text style={styles.empty}>No cash moved in this period.</Text>;
  return (
    <MonthFrame
      data={months}
      height={150}
      values={months.flatMap(m => [m.inflow, -m.outflow])}
      legend={[
        { label: 'Cash in', color: CASH_IN_COLOR },
        { label: 'Cash out', color: CASH_OUT_COLOR },
      ]}
      idle="Tap a month for what came in and went out."
      readout={m => `${m.label} · In ${rs(m.inflow)} · Out ${rs(m.outflow)} · Net ${rs(m.net)}`}
      describe={m => `${m.label}: cash in ${rs(m.inflow)}, cash out ${rs(m.outflow)}, net ${rs(m.net)}`}
      draw={({ x, y, band, selected }) => {
        const barW = Math.max(3, Math.min(22, band * 0.56));
        const zero = y(0);
        return (
          <>
            {months.map((m, i) => (
              <React.Fragment key={m.key}>
                {m.inflow > 0 ? (
                  <Rect
                    x={x(i) - barW / 2}
                    y={y(m.inflow)}
                    width={barW}
                    height={Math.max(1, zero - y(m.inflow))}
                    fill={CASH_IN_COLOR}
                    opacity={selected && selected !== m.key ? 0.35 : 1}
                    rx={2}
                  />
                ) : null}
                {m.outflow > 0 ? (
                  <Rect
                    x={x(i) - barW / 2}
                    y={zero}
                    width={barW}
                    height={Math.max(1, y(-m.outflow) - zero)}
                    fill={CASH_OUT_COLOR}
                    opacity={selected && selected !== m.key ? 0.35 : 1}
                    rx={2}
                  />
                ) : null}
              </React.Fragment>
            ))}
          </>
        );
      }}
    />
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
