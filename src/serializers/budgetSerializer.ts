import type { Budget, BudgetLine, BudgetStatus, BudgetVsActual } from '../models/budgetModel';
const toNum = (v: any): number => { if (typeof v === 'number') return v; const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const mapLine = (raw: any): BudgetLine => ({
  id: raw.id, accountId: raw.accountId ?? '', accountCode: raw.accountCode ?? '', accountName: raw.accountName ?? '',
  monthlyAmounts: Array.isArray(raw.monthlyAmounts) ? raw.monthlyAmounts.map(toNum) : [], annualTotal: toNum(raw.annualTotal),
});
export const mapBudget = (raw: any): Budget => ({
  id: raw.id ?? '', name: raw.name ?? '', fiscalYear: raw.fiscalYear ?? 0,
  status: (raw.status ?? 'draft') as BudgetStatus, totalBudget: toNum(raw.totalBudget),
  lines: Array.isArray(raw.lines) ? raw.lines.map(mapLine) : [],
});
const arrayFrom = (payload: any): any[] => { const d = payload?.data ?? payload; if (Array.isArray(d)) return d; if (Array.isArray(d?.data)) return d.data; return []; };
export const budgetListSerializer = (payload: any): Budget[] => arrayFrom(payload).map(mapBudget);
export const budgetSingleSerializer = (payload: any): Budget | null => { const raw = payload?.data ?? payload; if (!raw || Array.isArray(raw) || !raw.id) return null; return mapBudget(raw); };
export const budgetVsActualSerializer = (payload: any): BudgetVsActual | null => {
  const d = payload?.data ?? payload; if (!d || !d.rows) return null;
  return {
    budget: d.budget, totals: { budgeted: toNum(d.totals?.budgeted), actual: toNum(d.totals?.actual), variance: toNum(d.totals?.variance) },
    rows: d.rows.map((r: any) => ({ accountId: r.accountId, accountCode: r.accountCode, accountName: r.accountName, accountType: r.accountType, budgeted: toNum(r.budgeted), actual: toNum(r.actual), variance: toNum(r.variance), percentUsed: toNum(r.percentUsed) })),
  };
};
