// ═══════════════════════════════════════════════════════
// FinMatrix — Employee Serializer
// ═══════════════════════════════════════════════════════
// Sits BETWEEN employeeNetwork and the Employee slices.
// Takes raw API envelopes and returns clean, UI-ready
// EmployeeRecord values with inline field mapping &
// defensive defaults. Mirrors `glSerializer.ts`,
// `bankingSerializer.ts`.

import type {
  EmployeeApi,
  EmployeeBankingInfo,
  EmployeeDeductionSet,
  EmployeeDepartment,
  EmployeePayStub,
  EmployeeYTDData,
  EmploymentStatus,
  EmploymentType,
  PayFrequency,
  PayType,
} from '../models/employeeModel';

// ─── Sub-object mappers ──────────────────────────────
const mapDeductions = (raw: any): EmployeeDeductionSet => ({
  tax: typeof raw?.tax === 'number' ? raw.tax : 0,
  insurance: typeof raw?.insurance === 'number' ? raw.insurance : 0,
  retirement: typeof raw?.retirement === 'number' ? raw.retirement : 0,
  other: typeof raw?.other === 'number' ? raw.other : 0,
});

const mapBanking = (raw: any): EmployeeBankingInfo => ({
  bankName: raw?.bankName ?? '',
  accountNumber: raw?.accountNumber ?? '',
  routingNumber: raw?.routingNumber ?? '',
});

const mapYTD = (raw: any): EmployeeYTDData => ({
  grossPay: typeof raw?.grossPay === 'number' ? raw.grossPay : 0,
  deductions: typeof raw?.deductions === 'number' ? raw.deductions : 0,
  netPay: typeof raw?.netPay === 'number' ? raw.netPay : 0,
  overtimeHours: typeof raw?.overtimeHours === 'number' ? raw.overtimeHours : 0,
});

const mapPayStub = (raw: any): EmployeePayStub => ({
  id: raw?.id ?? '',
  payDate: raw?.payDate ?? '',
  grossPay: typeof raw?.grossPay === 'number' ? raw.grossPay : 0,
  totalDeductions: typeof raw?.totalDeductions === 'number' ? raw.totalDeductions : 0,
  netPay: typeof raw?.netPay === 'number' ? raw.netPay : 0,
});

// ─── Raw → UI mapper ─────────────────────────────────
export const mapEmployee = (raw: any): EmployeeApi => ({
  id: raw?.id ?? '',
  companyId: raw?.companyId ?? '',
  employeeCode: raw?.employeeCode ?? '',
  fullName: raw?.fullName ?? '',
  email: raw?.email ?? '',
  phone: raw?.phone ?? '',
  address: raw?.address ?? '',
  taxId: raw?.taxId ?? '',
  department: (raw?.department as EmployeeDepartment) ?? 'Operations',
  position: raw?.position ?? '',
  employmentType: (raw?.employmentType as EmploymentType) ?? 'full_time',
  status: (raw?.status as EmploymentStatus) ?? 'active',
  startDate: raw?.startDate ?? '',
  payType: (raw?.payType as PayType) ?? 'salary',
  payFrequency: (raw?.payFrequency as PayFrequency) ?? 'monthly',
  salaryAmount: typeof raw?.salaryAmount === 'number' ? raw.salaryAmount : 0,
  hourlyRate: typeof raw?.hourlyRate === 'number' ? raw.hourlyRate : 0,
  hoursPerWeek: typeof raw?.hoursPerWeek === 'number' ? raw.hoursPerWeek : 40,
  deductions: mapDeductions(raw?.deductions),
  banking: mapBanking(raw?.banking),
  ytd: mapYTD(raw?.ytd),
  recentPayStubs: Array.isArray(raw?.recentPayStubs)
    ? raw.recentPayStubs.map(mapPayStub)
    : [],
  notes: raw?.notes ?? '',
  createdAt: raw?.createdAt ?? '',
  updatedAt: raw?.updatedAt ?? '',
});

// ─── Envelope serializers ────────────────────────────
export function employeeListSerializer(payload: any): EmployeeApi[] {
  const list = payload?.data?.employees ?? payload?.data ?? [];
  return Array.isArray(list) ? list.map(mapEmployee) : [];
}

export function employeeSingleSerializer(payload: any): EmployeeApi | null {
  const raw = payload?.data?.employee ?? payload?.data;
  if (!raw) return null;
  return mapEmployee(raw);
}
