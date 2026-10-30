import type { OwnerCockpit } from '../models/ownerCockpitModel';
import { unwrapEnvelope } from '../networks/reports/reportHelpers';
import { budgetVsActualSerializer } from './budgetSerializer';
import { assessmentFrom, financialHealthSerializer, kpiListFrom, kpiWithChangeFrom } from './kpiSerializer';
import type { BusinessInsight, InsightTone } from '../models/insightModel';
import { arr, num, numOrNull, str, strOrNull } from './reportValues';

const TONES: InsightTone[] = ['negative', 'warning', 'positive', 'neutral'];

/** The analytics `insights[]`, as sent; an unknown tone reads as neutral. */
export const insightsFrom = (raw: unknown): BusinessInsight[] =>
  arr(raw)
    .map((i: any) => ({
      key: str(i?.key),
      tone: (TONES.includes(i?.tone) ? i.tone : 'neutral') as InsightTone,
      title: str(i?.title),
      detail: str(i?.detail),
      report: {
        key: str(i?.report?.key),
        params: Object.fromEntries(
          Object.entries(i?.report?.params && typeof i.report.params === 'object' ? i.report.params : {}).map(
            ([k, v]) => [k, str(v)],
          ),
        ),
      },
    }))
    .filter(i => i.title);

const rangeFrom = (r: any) =>
  r && typeof r === 'object' ? { startDate: str(r.startDate), endDate: str(r.endDate) } : null;

/** GET /reports/analytics — the Owner Cockpit. */
export const ownerCockpitSerializer = (payload: unknown): OwnerCockpit | null => {
  const raw = unwrapEnvelope<any>(payload);
  if (!raw || typeof raw !== 'object') return null;
  const sales = raw.salesByCustomer;
  const budget = raw.budgetVsActual ? budgetVsActualSerializer({ data: raw.budgetVsActual }) : null;
  return {
    range: rangeFrom(raw.range) ?? { startDate: '', endDate: '' },
    comparisonRange: rangeFrom(raw.comparisonRange),
    fiscalYearStart: strOrNull(raw.fiscalYearStart),
    series: arr(raw.series).map((p: any) => ({
      period: str(p?.period),
      label: str(p?.label),
      revenue: num(p?.revenue),
      cogs: num(p?.cogs),
      grossProfit: num(p?.grossProfit),
      operatingExpenses: num(p?.operatingExpenses),
      netIncome: num(p?.netIncome),
      operatingCashFlow: num(p?.operatingCashFlow),
      endingCash: numOrNull(p?.endingCash),
    })),
    kpis: kpiListFrom({ kpis: raw.kpis }, kpiWithChangeFrom).filter(k => k.key),
    expenseByAccount: arr(raw.expenseByAccount).map((l: any) => ({
      accountCode: str(l?.accountCode),
      accountName: str(l?.accountName),
      amount: num(l?.amount),
      sharePct: numOrNull(l?.sharePct),
    })),
    salesByCustomer:
      sales && typeof sales === 'object'
        ? {
            basis: str(sales.basis, 'invoice'),
            label: str(sales.label, 'invoice basis'),
            note: str(sales.note),
            total: num(sales.total),
            customers: arr(sales.customers).map((c: any) => ({
              customerId: str(c?.customerId),
              name: str(c?.name, '(no customer)') || '(no customer)',
              amount: num(c?.amount),
              invoices: num(c?.invoices),
              sharePct: numOrNull(c?.sharePct),
            })),
            other: {
              count: num(sales.other?.count),
              amount: num(sales.other?.amount),
              sharePct: numOrNull(sales.other?.sharePct),
            },
            top5SharePct: numOrNull(sales.top5SharePct),
            assessment: assessmentFrom(sales.assessment),
          }
        : null,
    budgetVsActual: budget ? { ...budget, basis: str(raw.budgetVsActual?.basis) } : null,
    health: raw.health ? financialHealthSerializer(raw.health) : null,
    insights: insightsFrom(raw.insights),
  };
};
