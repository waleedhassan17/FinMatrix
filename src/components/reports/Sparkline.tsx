// ═══════════════════════════════════════════════════════
// FinMatrix — A figure's shape over the months
// ═══════════════════════════════════════════════════════
// A 2px line over a faint wash, no axes, the latest point marked. It shows the
// direction, not the values — the card holds those. Drawn at the width it is
// given, like the website's Sparkline.

import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { THEME } from '../../theme';

const { colors } = THEME;
const H = 28;
const PAD = 3;

const Sparkline: React.FC<{
  /** Oldest first. A null is a month with no figure: the line breaks there. */
  values: (number | null)[];
  /** What it shows, for a screen reader: "Revenue by month". */
  label: string;
  color?: string;
  /**
   * Inside something that already names the figure — a tile, a button — the
   * line is decoration, and reading its label out would only add noise.
   */
  decorative?: boolean;
}> = ({ values, label, color = colors.primary, decorative = false }) => {
  const [width, setWidth] = useState(0);
  const known = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (known.length < 2) return null;
  const min = Math.min(...known);
  const max = Math.max(...known);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i * Math.max(0, width - PAD * 2)) / Math.max(1, values.length - 1);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  const runs: { x: number; y: number }[][] = [];
  let run: { x: number; y: number }[] = [];
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      if (run.length) runs.push(run);
      run = [];
      return;
    }
    run.push({ x: x(i), y: y(v) });
  });
  if (run.length) runs.push(run);
  // Readings that never sit side by side draw no line, only stray dots.
  if (!runs.some(r => r.length > 1)) return null;
  const line = (r: { x: number; y: number }[]) => r.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
  let lastIndex = values.length - 1;
  while (lastIndex > 0 && (values[lastIndex] === null || !Number.isFinite(values[lastIndex] as number))) lastIndex -= 1;

  return (
    <View
      style={{ height: H, marginTop: 6 }}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      {...(decorative
        ? { accessible: false, importantForAccessibility: 'no-hide-descendants' as const }
        : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label })}
    >
      {width > 0 ? (
        <Svg width={width} height={H}>
          {min < 0 && max > 0 ? (
            <Line x1={PAD} x2={width - PAD} y1={y(0)} y2={y(0)} stroke={colors.border} strokeWidth={1} strokeDasharray="2 2" />
          ) : null}
          {runs.map((r, i) =>
            r.length > 1 ? (
              <Path key={`a${i}`} d={`${line(r)}L${r[r.length - 1].x},${H}L${r[0].x},${H}Z`} fill={color} opacity={0.08} />
            ) : null,
          )}
          {runs.map((r, i) => (
            <Path key={`l${i}`} d={line(r)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          <Circle cx={x(lastIndex)} cy={y(values[lastIndex] as number)} r={3} fill={color} stroke={colors.surface} strokeWidth={1.5} />
        </Svg>
      ) : null}
    </View>
  );
};

export default Sparkline;
