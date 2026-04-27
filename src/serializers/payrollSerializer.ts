// ═══════════════════════════════════════════════════════
// FinMatrix — Payroll Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN payrollNetwork and the Payroll slices.
// Takes raw API envelopes and returns clean, UI-ready
// payroll runs / worksheet rows / pay stubs with inline
// field mapping. Mirrors `glSerializer.ts`.

import type {
  PayStubApi,
  PayrollRunApi,
  PayrollWorksheetRow,
} from '../models/payrollModel';
import type { PayrollStatus } from '../types';

// ─── Sub-mappers ─────────────────────────────────────
const num = (v: any, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

export const mapWorksheetRow = (raw: any): PayrollWorksheetRow => ({
  employeeId: raw?.employeeId ?? '',
  employeeCode: raw?.employeeCode ?? '',
  employeeName: raw?.employeeName ?? '',
  department: raw?.department ?? '',
  payType: (raw?.payType as 'salary' | 'hourly') ?? 'salary',
  hours: num(raw?.hours),
  standardHours: num(raw?.standardHours, 40),
  hourlyRate: num(raw?.hourlyRate),
  salaryAmount: num(raw?.salaryAmount),
  baseTaxes: num(raw?.baseTaxes),
  baseBenefits: num(raw?.baseBenefits),
  baseDeductions: num(raw?.baseDeductions),
  gross: num(raw?.gross),
  taxes: num(raw?.taxes),
  benefits: num(raw?.benefits),
  deductions: num(raw?.deductions),
  net: num(raw?.net),
});

export const mapPayrollRun = (raw: any): PayrollRunApi => ({
  id: raw?.id ?? '',
  companyId: raw?.companyId ?? '',
  payPeriodStart: raw?.payPeriodStart ?? '',
  payPeriodEnd: raw?.payPeriodEnd ?? '',
  payDate: raw?.payDate ?? '',
  status: (raw?.status as PayrollStatus) ?? 'draft',
  totalGross: num(raw?.totalGross),
  totalTaxes: num(raw?.totalTaxes),
  totalBenefits: num(raw?.totalBenefits),
  totalDeductions: num(raw?.totalDeductions),
  totalNet: num(raw?.totalNet),
  employeeCount: num(raw?.employeeCount),
  createdBy: raw?.createdBy ?? '',
  journalEntryId: raw?.journalEntryId ?? '',
  worksheet: Array.isArray(raw?.worksheet)
    ? raw.worksheet.map(mapWorksheetRow)
    : [],
  createdAt: raw?.createdAt ?? '',
  updatedAt: raw?.updatedAt ?? '',
});

export const mapPayStub = (raw: any): PayStubApi => ({
  runId: raw?.runId ?? '',
  payDate: raw?.payDate ?? '',
  periodStart: raw?.periodStart ?? '',
  periodEnd: raw?.periodEnd ?? '',
  employeeId: raw?.employeeId ?? '',
  employeeCode: raw?.employeeCode ?? '',
  employeeName: raw?.employeeName ?? '',
  department: raw?.department ?? '',
  position: raw?.position ?? '',
  gross: num(raw?.gross),
  taxes: num(raw?.taxes),
  benefits: num(raw?.benefits),
  deductions: num(raw?.deductions),
  net: num(raw?.net),
  ytdGross: num(raw?.ytdGross),
  ytdTaxes: num(raw?.ytdTaxes),
  ytdBenefits: num(raw?.ytdBenefits),
  ytdDeductions: num(raw?.ytdDeductions),
  ytdNet: num(raw?.ytdNet),
});

// ─── Envelope serializers ────────────────────────────
export function payrollRunListSerializer(payload: any): PayrollRunApi[] {
  const list = payload?.data?.runs ?? payload?.data ?? [];
  return Array.isArray(list) ? list.map(mapPayrollRun) : [];
}

export function payrollRunSingleSerializer(payload: any): PayrollRunApi | null {
  const raw = payload?.data?.run ?? payload?.data;
  if (!raw) return null;
  return mapPayrollRun(raw);
}

export function payrollWorksheetSerializer(payload: any): PayrollWorksheetRow[] {
  const list = payload?.data?.worksheet ?? payload?.data ?? [];
  return Array.isArray(list) ? list.map(mapWorksheetRow) : [];
}

export function payStubSerializer(payload: any): PayStubApi | null {
  const raw = payload?.data?.stub ?? payload?.data;
  if (!raw) return null;
  return mapPayStub(raw);
}
