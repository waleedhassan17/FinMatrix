import { simulateApiCall } from './apiHelpers';
import { payrollRuns as seedPayrollRuns } from '../dummy-data/payrollRuns';
import { employees as seedEmployees } from '../dummy-data/employees';
import { journalEntriesData } from '../dummy-data/journalEntries';
import type { EmployeeRecord } from '../models/employeeModel';
import type {
  ApiEnvelope,
  PayStub,
  PayStubResponse,
  PayrollRunInput,
  PayrollRunListResponse,
  PayrollRunRecord,
  PayrollRunSingleResponse,
  PayrollWorksheetResponse,
  PayrollWorksheetRow,
} from '../models/payrollModel';
import { calculatePayrollTotals, recalculatePayrollRow } from '../models/payrollModel';
import type { JournalEntry } from '../types';

let payrollStore: PayrollRunRecord[] = seedPayrollRuns.map(run => ({
  ...run,
  worksheet: run.worksheet.map(row => ({ ...row })),
}));

const employeesStore: EmployeeRecord[] = seedEmployees.map(e => ({ ...e }));

const round2 = (n: number): number => Math.round(n * 100) / 100;

const cloneRun = (run: PayrollRunRecord): PayrollRunRecord => ({
  ...run,
  worksheet: run.worksheet.map(row => ({ ...row })),
});

const getWorksheetSeed = (): PayrollWorksheetRow[] => {
  return employeesStore
    .filter(e => e.status !== 'terminated')
    .map(emp => {
      const standardHours = emp.payType === 'hourly' ? emp.hoursPerWeek : 40;
      return recalculatePayrollRow(
        {
          employeeId: emp.id,
          employeeCode: emp.employeeCode,
          employeeName: emp.fullName,
          department: emp.department,
          payType: emp.payType,
          hours: standardHours,
          standardHours,
          hourlyRate: emp.hourlyRate,
          salaryAmount: emp.salaryAmount,
          baseTaxes: emp.deductions.tax,
          baseBenefits: emp.deductions.insurance + emp.deductions.retirement,
          baseDeductions: emp.deductions.other,
          gross: 0,
          taxes: 0,
          benefits: 0,
          deductions: 0,
          net: 0,
        },
        standardHours,
      );
    });
};

const nextPayrollId = (): string => `pr_${Date.now()}`;

const nextPayrollEntryNumber = (): string => {
  const max = journalEntriesData.reduce((n, je) => {
    const match = je.entryNumber.match(/JE-(\d+)/i);
    return match ? Math.max(n, parseInt(match[1], 10)) : n;
  }, 0);
  return `JE-${String(max + 1).padStart(3, '0')}`;
};

const appendPayrollJournalEntry = (run: PayrollRunRecord): JournalEntry => {
  const entryNumber = nextPayrollEntryNumber();
  const createdAt = new Date().toISOString();

  const entry: JournalEntry = {
    id: `je-${entryNumber.toLowerCase()}-${Date.now()}`,
    companyId: run.companyId,
    entryNumber,
    date: run.payDate,
    description: `Payroll run ${run.payPeriodStart} to ${run.payPeriodEnd}`,
    reference: `PAY-${run.id.toUpperCase()}`,
    status: 'posted',
    lines: [
      {
        id: `jel-${Date.now()}-1`,
        accountId: 'acct-5000',
        accountCode: '5000',
        accountName: 'Salaries Expense',
        debit: round2(run.totalGross),
        credit: 0,
        description: 'Gross payroll expense',
      },
      {
        id: `jel-${Date.now()}-2`,
        accountId: 'acct-2200',
        accountCode: '2200',
        accountName: 'Payroll Tax Liabilities',
        debit: 0,
        credit: round2(run.totalTaxes),
        description: 'Payroll taxes withheld',
      },
      {
        id: `jel-${Date.now()}-3`,
        accountId: 'acct-2210',
        accountCode: '2210',
        accountName: 'Employee Benefits Payable',
        debit: 0,
        credit: round2(run.totalBenefits),
        description: 'Benefits withholding',
      },
      {
        id: `jel-${Date.now()}-4`,
        accountId: 'acct-2220',
        accountCode: '2220',
        accountName: 'Other Payroll Deductions Payable',
        debit: 0,
        credit: round2(run.totalDeductions),
        description: 'Other deductions withholding',
      },
      {
        id: `jel-${Date.now()}-5`,
        accountId: 'acct-1010',
        accountCode: '1010',
        accountName: 'Checking',
        debit: 0,
        credit: round2(run.totalNet),
        description: 'Net payroll disbursement',
      },
    ],
    totalDebit: round2(run.totalGross),
    totalCredit: round2(run.totalTaxes + run.totalBenefits + run.totalDeductions + run.totalNet),
    createdBy: 'admin_001',
    approvedBy: 'admin_001',
    postedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  };

  journalEntriesData.push(entry);
  return entry;
};

export const getPayrollRunsAPI = async (): Promise<
  ApiEnvelope<PayrollRunListResponse>
> => {
  const sorted = [...payrollStore].sort((a, b) => b.payDate.localeCompare(a.payDate));
  return simulateApiCall(
    { success: true, data: { runs: sorted.map(cloneRun) } },
    500,
  );
};

export const getPayrollRunByIdAPI = async (
  runId: string,
): Promise<ApiEnvelope<PayrollRunSingleResponse>> => {
  const run = payrollStore.find(r => r.id === runId);
  if (!run) throw new Error('Payroll run not found');
  return simulateApiCall(
    { success: true, data: { run: cloneRun(run) } },
    450,
  );
};

export const getPayrollWorksheetAPI = async (
  _periodStart: string,
  _periodEnd: string,
): Promise<ApiEnvelope<PayrollWorksheetResponse>> => {
  return simulateApiCall(
    { success: true, data: { worksheet: getWorksheetSeed() } },
    500,
  );
};

export const processPayrollRunAPI = async (
  input: PayrollRunInput,
): Promise<ApiEnvelope<PayrollRunSingleResponse>> => {
  const worksheetSeed = getWorksheetSeed();

  const worksheet = worksheetSeed.map(seedRow => {
    const inputRow = input.worksheet.find(r => r.employeeId === seedRow.employeeId);
    const hours = inputRow ? inputRow.hours : seedRow.hours;
    return recalculatePayrollRow(seedRow, hours);
  });

  const totals = calculatePayrollTotals(worksheet);
  const now = new Date().toISOString();

  const run: PayrollRunRecord = {
    id: nextPayrollId(),
    companyId: 'comp_001',
    payPeriodStart: input.periodStart,
    payPeriodEnd: input.periodEnd,
    payDate: input.payDate,
    status: 'processed',
    totalGross: round2(totals.gross),
    totalTaxes: round2(totals.taxes),
    totalBenefits: round2(totals.benefits),
    totalDeductions: round2(totals.deductions),
    totalNet: round2(totals.net),
    employeeCount: worksheet.length,
    createdBy: input.createdBy ?? 'admin_001',
    journalEntryId: '',
    worksheet,
    createdAt: now,
    updatedAt: now,
  };

  const journalEntry = appendPayrollJournalEntry(run);
  run.journalEntryId = journalEntry.id;

  payrollStore.unshift(run);
  return simulateApiCall(
    { success: true, data: { run: cloneRun(run) } },
    750,
  );
};

export const getPayStubAPI = async (
  runId: string,
  employeeId: string,
): Promise<ApiEnvelope<PayStubResponse>> => {
  const run = payrollStore.find(r => r.id === runId);
  if (!run) throw new Error('Payroll run not found');

  const row = run.worksheet.find(w => w.employeeId === employeeId);
  if (!row) throw new Error('Employee not included in payroll run');

  const employee = employeesStore.find(e => e.id === employeeId);
  if (!employee) throw new Error('Employee not found');

  const completedRuns = payrollStore
    .filter(r => r.status === 'processed' && r.payDate <= run.payDate)
    .sort((a, b) => a.payDate.localeCompare(b.payDate));

  let ytdGross = 0;
  let ytdTaxes = 0;
  let ytdBenefits = 0;
  let ytdDeductions = 0;
  let ytdNet = 0;

  completedRuns.forEach(r => {
    const rr = r.worksheet.find(w => w.employeeId === employeeId);
    if (!rr) return;
    ytdGross += rr.gross;
    ytdTaxes += rr.taxes;
    ytdBenefits += rr.benefits;
    ytdDeductions += rr.deductions;
    ytdNet += rr.net;
  });

  const stub: PayStub = {
    runId: run.id,
    payDate: run.payDate,
    periodStart: run.payPeriodStart,
    periodEnd: run.payPeriodEnd,
    employeeId,
    employeeCode: row.employeeCode,
    employeeName: row.employeeName,
    department: row.department,
    position: employee.position,
    gross: row.gross,
    taxes: row.taxes,
    benefits: row.benefits,
    deductions: row.deductions,
    net: row.net,
    ytdGross: round2(ytdGross),
    ytdTaxes: round2(ytdTaxes),
    ytdBenefits: round2(ytdBenefits),
    ytdDeductions: round2(ytdDeductions),
    ytdNet: round2(ytdNet),
  };

  return simulateApiCall(
    { success: true, data: { stub } },
    450,
  );
};
