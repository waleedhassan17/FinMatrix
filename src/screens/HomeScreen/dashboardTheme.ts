// ═══════════════════════════════════════════════════════
// FinMatrix — Dashboard design tokens
// ═══════════════════════════════════════════════════════
// Shared by AdminDashboardScreen and the cards extracted out of it, so a card
// living in its own file still sits on exactly the same surface, radius and
// ink scale as the ones beside it.

import { THEME } from '../../utils/theme';

// ── Accounting palette ────────────────────────────────
// Quiet surfaces, dark ink figures, one disciplined brand
// green. Color appears only as small semantic signals.
export const C = {
  canvas: '#F5F6F8',
  surface: '#FFFFFF',
  line: '#E8EAEF',
  lineSoft: '#EEF0F4',
  ink: '#0F172A',
  ink2: '#475467',
  ink3: '#8A93A4',
  brand: '#0B6E4F',
  pos: '#0E8A5F',
  neg: '#C4362B',
  warn: '#B7791F',
  info: '#2A60C9',
  indigo: '#4F46E5',
  teal: '#0E7C86',
  slate: '#475467',
  bar: '#C9D0DB', // quiet slate for past months in the revenue chart
  navy: ['#0E1726', '#16243B', '#1C2F4C'] as const,
};

export const FONT = THEME.typography.fontFamily;

/** The card surface every block on the dashboard is drawn on. */
export const card = {
  backgroundColor: C.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: C.line,
  shadowColor: '#0F172A',
  shadowOpacity: 0.04,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
} as const;

// ── Compact currency (mirrors slice formatter) ────────
export const compactRs = (n: number): string => {
  if (!Number.isFinite(n)) return 'Rs 0';
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return `${sign}Rs ${(a / 1e9).toFixed(1)}B`;
  if (a >= 1_000_000) return `${sign}Rs ${(a / 1e6).toFixed(1)}M`;
  if (a >= 10_000) return `${sign}Rs ${Math.round(a / 1e3)}K`;
  if (a >= 1_000) return `${sign}Rs ${(a / 1e3).toFixed(1)}K`;
  return `${sign}Rs ${Math.round(a).toLocaleString()}`;
};
