// ═══════════════════════════════════════════════════════
// FinMatrix — A value axis with round ticks
// ═══════════════════════════════════════════════════════
// Kept in step with the web's models/chartAxis.ts. Lifted out of the
// analytics chart so the item explorer's charts — money, quantities and
// margins — read their ticks the same way.

/** Round steps, so ticks read Rs 500K, 1.0M, 1.5M — never Rs 437.5K. */
const NICE_STEPS = [1, 2, 2.5, 5, 10];

const niceStep = (raw: number): number => {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return NICE_STEPS.map(n => n * magnitude).find(s => s >= raw) ?? 10 * magnitude;
};

export interface ChartAxis {
  /** [bottom, top] of the plot. */
  domain: [number, number];
  ticks: number[];
}

/**
 * The value axis for a set of figures.
 *
 * A shallow dip below zero (under half a step) gets a sliver and no negative
 * tick — the zero line marks the floor — instead of a whole step of empty
 * axis. A deep one gets the full steps it needs. `integer` keeps a count of
 * units on whole ticks. Nulls (a month with no reading) are ignored.
 */
export const niceAxis = (
  values: ReadonlyArray<number | null | undefined>,
  { tickCount = 4, integer = false }: { tickCount?: number; integer?: boolean } = {},
): ChartAxis => {
  const known = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const hi = Math.max(0, ...known);
  const lo = Math.min(0, ...known);
  if (hi === 0 && lo === 0) return { domain: [0, 1], ticks: [0] };

  const raw = niceStep(Math.max(hi, -lo) / tickCount);
  const step = integer ? Math.max(1, raw) : raw;
  const top = Math.ceil(hi / step) * step;
  const deep = -lo > step / 2;
  const bottom = deep ? Math.floor(lo / step) * step : lo * 1.15;

  // Integer multiples, so the ticks carry no floating-point drift.
  const first = deep ? Math.round(bottom / step) : 0;
  const last = Math.round(top / step);
  const ticks: number[] = [];
  for (let i = first; i <= last; i++) ticks.push(Number((i * step).toPrecision(12)));
  return { domain: [bottom, top], ticks };
};
