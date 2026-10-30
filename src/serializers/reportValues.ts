// ═══════════════════════════════════════════════════════
// FinMatrix — Coercion for report payloads
// ═══════════════════════════════════════════════════════
// The ledger columns are Postgres `numeric`, which node-postgres hands over as
// strings, and a v2 field is simply absent on a server that predates it. These
// read both without throwing, so a serializer can say what it expects once
// rather than guarding every field.

/** A figure; anything unreadable is 0. */
export const num = (v: unknown): number => {
  const x = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(x) ? x : 0;
};

/**
 * A figure that may legitimately be missing — a ratio with no denominator, a
 * prior period that was not asked for. Kept as null so the screen can say "—"
 * rather than show a zero that reads as a fact.
 */
export const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const x = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(x) ? x : null;
};

export const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : v === null || v === undefined ? fallback : String(v);

export const strOrNull = (v: unknown): string | null =>
  typeof v === 'string' && v !== '' ? v : null;

export const arr = <T = any>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export const bool = (v: unknown): boolean => v === true || v === 'true';
