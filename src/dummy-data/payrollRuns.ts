import { employees } from './employees';
import type { PayrollRunRecord, PayrollWorksheetRow } from '../models/payrollModel';
import { recalculatePayrollRow, calculatePayrollTotals } from '../models/payrollModel';

const round2 = (n: number): number => Math.round(n * 100) / 100;

const baseWorksheetRow = (employeeId: string, hoursOverride?: number): PayrollWorksheetRow => {
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) {
    throw new Error(`Employee ${employeeId} not found for payroll seed`);
  }

  const standardHours = emp.payType === 'hourly' ? emp.hoursPerWeek : 40;
  const baseRow: PayrollWorksheetRow = {
    employeeId: emp.id,
    employeeCode: emp.employeeCode,
    employeeName: emp.fullName,
    department: emp.department,
    payType: emp.payType,
    hours: standardHours,
    standardHours,
    hourlyRate: emp.hourlyRate,
    salaryAmount: emp.salaryAmount,
    baseTaxes: round2(emp.deductions.tax),
    baseBenefits: round2(emp.deductions.insurance + emp.deductions.retirement),
    baseDeductions: round2(emp.deductions.other),
    gross: 0,
    taxes: 0,
    benefits: 0,
    deductions: 0,
    net: 0,
  };

  return recalculatePayrollRow(baseRow, hoursOverride ?? standardHours);
};

const makeRun = (
  id: string,
  periodStart: string,
  periodEnd: string,
  payDate: string,
  worksheet: PayrollWorksheetRow[],
  createdAt: string,
): PayrollRunRecord => {
  const totals = calculatePayrollTotals(worksheet);
  return {
    id,
    companyId: 'comp_001',
    payPeriodStart: periodStart,
    payPeriodEnd: periodEnd,
    payDate,
    status: 'processed',
    totalGross: round2(totals.gross),
    totalTaxes: round2(totals.taxes),
    totalBenefits: round2(totals.benefits),
    totalDeductions: round2(totals.deductions),
    totalNet: round2(totals.net),
    employeeCount: worksheet.length,
    createdBy: 'admin_001',
    journalEntryId: `je-payroll-${id}`,
    worksheet,
    createdAt,
    updatedAt: createdAt,
  };
};

export const payrollRuns: PayrollRunRecord[] = [
  makeRun(
    'pr_2026_01',
    '2026-01-01',
    '2026-01-31',
    '2026-02-01',
    [
      baseWorksheetRow('emp_001'),
      baseWorksheetRow('emp_002'),
      baseWorksheetRow('emp_003'),
      baseWorksheetRow('emp_005', 44),
      baseWorksheetRow('emp_009', 40),
    ],
    '2026-02-01T10:00:00.000Z',
  ),
  makeRun(
    'pr_2026_02',
    '2026-02-01',
    '2026-02-28',
    '2026-03-01',
    [
      baseWorksheetRow('emp_001'),
      baseWorksheetRow('emp_002'),
      baseWorksheetRow('emp_003'),
      baseWorksheetRow('emp_005', 46),
      baseWorksheetRow('emp_009', 42),
    ],
    '2026-03-01T10:00:00.000Z',
  ),
  makeRun(
    'pr_2026_03',
    '2026-03-01',
    '2026-03-31',
    '2026-04-01',
    [
      baseWorksheetRow('emp_001'),
      baseWorksheetRow('emp_002'),
      baseWorksheetRow('emp_003'),
      baseWorksheetRow('emp_005', 45),
      baseWorksheetRow('emp_009', 41),
    ],
    '2026-04-01T10:00:00.000Z',
  ),
];
