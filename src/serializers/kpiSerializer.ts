import {
  asKpiStatus,
  asKpiUnit,
  type FinancialHealth,
  type Kpi,
  type KpiAssessment,
  type KpiAssessmentLevel,
  type KpiWithChange,
} from '../models/kpiModel';
import { unwrapEnvelope } from '../networks/reports/reportHelpers';
import { numOrNull, str } from './reportValues';

const LEVELS: KpiAssessmentLevel[] = ['healthy', 'watch', 'risk', 'neutral'];

/**
 * The server's verdict on a figure (reports v2). Null from a server that does
 * not send one: the card then shows no pill rather than one guessed here.
 */
export const assessmentFrom = (raw: any): KpiAssessment | null =>
  raw && typeof raw === 'object' && LEVELS.includes(raw.level)
    ? { level: raw.level as KpiAssessmentLevel, guide: str(raw.guide) }
    : null;

/**
 * One KPI object — { key, label, value, unit, formula, inputs, asOfDate,
 * status, assessment }. `value` stays null when the server sent null: a zero denominator
 * is "not measurable", and reading it as 0 would print a ratio of 0.00×.
 */
export const kpiFrom = (raw: any, fallbackKey = ''): Kpi => {
  const value = numOrNull(raw?.value ?? raw?.current);
  const inputs: Record<string, number | null> = {};
  if (raw?.inputs && typeof raw.inputs === 'object') {
    for (const [k, v] of Object.entries(raw.inputs)) {
      // Only figures; a nested object is not something the sheet can print.
      if (v === null || typeof v === 'number' || typeof v === 'string') inputs[k] = numOrNull(v);
    }
  }
  return {
    key: str(raw?.key, fallbackKey) || fallbackKey,
    label: str(raw?.label, fallbackKey) || fallbackKey,
    value,
    unit: asKpiUnit(raw?.unit),
    formula: str(raw?.formula),
    inputs,
    asOfDate: str(raw?.asOfDate),
    status: asKpiStatus(raw?.status, value),
    assessment: assessmentFrom(raw?.assessment),
  };
};

/** A KPI over a period, with the server's comparison beside it. */
export const kpiWithChangeFrom = (raw: any, fallbackKey = ''): KpiWithChange => ({
  ...kpiFrom(raw, fallbackKey),
  prior: numOrNull(raw?.prior),
  change: numOrNull(raw?.change),
  changePct: numOrNull(raw?.changePct),
});

/**
 * A list of KPIs, however the server keyed it: an array of objects, an object
 * of them by key, or either under `kpis`.
 */
export const kpiListFrom = <T extends Kpi>(raw: any, one: (r: any, key: string) => T): T[] => {
  const src = raw?.kpis ?? raw;
  if (Array.isArray(src)) return src.map(r => one(r, str(r?.key)));
  if (src && typeof src === 'object') {
    return Object.entries(src)
      .filter(([, v]) => v && typeof v === 'object' && !Array.isArray(v))
      .map(([k, v]) => one(v, k));
  }
  return [];
};

/** GET /reports/financial-health. */
export const financialHealthSerializer = (payload: unknown): FinancialHealth | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw || typeof raw !== 'object') return null;
  const kpis = kpiListFrom(raw, kpiFrom).filter(k => k.key);
  return { asOfDate: str(raw.asOfDate) || kpis[0]?.asOfDate || '', kpis };
};

