// ═══════════════════════════════════════════════════════
// FinMatrix — Payroll Model
// ═══════════════════════════════════════════════════════
// Defines the API contract + UI worksheet contract for the
// Payroll feature. Mirrors the GL / Banking / Employees pattern:
// Model → Serializer → Network → Slice → Screen.
//
// Backed by activity diagram "Run Payroll":
//   Step 1: Select Pay Period (Weekly / Bi-weekly / Monthly)
//   Step 2: Review Payroll Worksheet per employee
//          → Verify hours for hourly employees
//          → Adjustments needed?  Yes → Edit hours / amounts
//   Step 3: Review Totals (gross, taxes, deductions, net)
//   Step 4: Confirm & Process
//          → JE: DR Salary + Tax Exp / CR Payroll Liabilities + Cash
//          → Pay stubs generated for each employee

import type { PayrollStatus } from '../types';

export interface PayrollPeriodOption {
  id: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
}

export interface PayrollWorksheetRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  payType: 'salary' | 'hourly';
  hours: number;
  standardHours: number;
  hourlyRate: number;
  salaryAmount: number;
  baseTaxes: number;
  baseBenefits: number;
  baseDeductions: number;
  gross: number;
  taxes: number;
  benefits: number;
  deductions: number;
  net: number;
}

export interface PayrollRunRecord {
  id: string;
  companyId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  status: PayrollStatus;
  totalGross: number;
  totalTaxes: number;
  totalBenefits: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  createdBy: string;
  journalEntryId: string;
  worksheet: PayrollWorksheetRow[];
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRunInput {
  periodStart: string;
  periodEnd: string;
  payDate: string;
  worksheet: Array<{ employeeId: string; hours: number }>;
  createdBy?: string;
}

export interface PayStub {
  runId: string;
  payDate: string;
  periodStart: string;
  periodEnd: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  position: string;
  gross: number;
  taxes: number;
  benefits: number;
  deductions: number;
  net: number;
  ytdGross: number;
  ytdTaxes: number;
  ytdBenefits: number;
  ytdDeductions: number;
  ytdNet: number;
}

export interface PayrollTotals {
  gross: number;
  taxes: number;
  benefits: number;
  deductions: number;
  net: number;
}

// ─── API entity & envelope types ─────────────────────
export type PayrollRunApi = PayrollRunRecord;
export type PayStubApi = PayStub;

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface PayrollRunListResponse {
  runs: PayrollRunApi[];
}
export interface PayrollRunSingleResponse {
  run: PayrollRunApi;
}
export interface PayrollWorksheetResponse {
  worksheet: PayrollWorksheetRow[];
}
export interface PayStubResponse {
  stub: PayStubApi;
}

export const PAYROLL_PERIOD_OPTIONS: PayrollPeriodOption[] = [
  {
    id: '2026-01',
    label: 'Jan 2026 (01 Jan - 31 Jan)',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    payDate: '2026-02-01',
  },
  {
    id: '2026-02',
    label: 'Feb 2026 (01 Feb - 28 Feb)',
    periodStart: '2026-02-01',
    periodEnd: '2026-02-28',
    payDate: '2026-03-01',
  },
  {
    id: '2026-03',
    label: 'Mar 2026 (01 Mar - 31 Mar)',
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    payDate: '2026-04-01',
  },
  {
    id: '2026-04',
    label: 'Apr 2026 (01 Apr - 30 Apr)',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    payDate: '2026-05-01',
  },
];

const round2 = (n: number): number => Math.round(n * 100) / 100;

export const recalculatePayrollRow = (row: PayrollWorksheetRow, nextHours: number): PayrollWorksheetRow => {
  const safeHours = Number.isFinite(nextHours) ? Math.max(0, nextHours) : row.standardHours;
  const hourlyBaseline = Math.max(1, row.standardHours);
  const ratio = row.payType === 'hourly' ? safeHours / hourlyBaseline : 1;

  const gross = row.payType === 'hourly'
    ? round2(Math.max(0, safeHours) * row.hourlyRate)
    : round2(row.salaryAmount);

  const taxes = round2(row.baseTaxes * ratio);
  const benefits = round2(row.baseBenefits * ratio);
  const deductions = round2(row.baseDeductions * ratio);
  const net = round2(Math.max(0, gross - taxes - benefits - deductions));

  return {
    ...row,
    hours: safeHours,
    gross,
    taxes,
    benefits,
    deductions,
    net,
  };
};

export const calculatePayrollTotals = (rows: PayrollWorksheetRow[]): PayrollTotals => {
  return rows.reduce(
    (acc, row) => {
      acc.gross += row.gross;
      acc.taxes += row.taxes;
      acc.benefits += row.benefits;
      acc.deductions += row.deductions;
      acc.net += row.net;
      return acc;
    },
    { gross: 0, taxes: 0, benefits: 0, deductions: 0, net: 0 },
  );
};
