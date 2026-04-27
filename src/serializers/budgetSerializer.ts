// ═══════════════════════════════════════════════════════
// FinMatrix — Budget Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN budget network and budget slices.
// Unwraps `{ success, data }` envelopes from budgetNetwork
// and returns clean, slice-ready entities. Matches the GL
// serializer pattern (src/serializers/glSerializer.ts).

import type {
  AnnualBudget,
  BudgetComparisonResponse,
  BudgetComparisonResult,
  BudgetCopyResponse,
  BudgetListResponse,
  BudgetSingleResponse,
} from '../models/budgetModel';

const unwrap = <T>(payload: { success?: boolean; data?: T } | null | undefined): T | null => {
  if (!payload || payload.success === false) return null;
  return (payload.data ?? null) as T | null;
};

export const budgetListSerializer = (
  payload: BudgetListResponse,
): AnnualBudget[] => unwrap<AnnualBudget[]>(payload) ?? [];

export const budgetSingleSerializer = (
  payload: BudgetSingleResponse,
): AnnualBudget | null => unwrap<AnnualBudget>(payload);

export const budgetCopySerializer = (
  payload: BudgetCopyResponse,
): AnnualBudget | null => unwrap<AnnualBudget | null>(payload);

export const budgetComparisonSerializer = (
  payload: BudgetComparisonResponse,
): BudgetComparisonResult | null => unwrap<BudgetComparisonResult>(payload);
