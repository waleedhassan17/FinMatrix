// ═══════════════════════════════════════════════════════
// FinMatrix — Employee Model & Validation
// ═══════════════════════════════════════════════════════
// Defines the API contract + UI form contract for the
// Employee Management feature. Mirrors the GL/Banking
// pattern: Model → Serializer → Network → Slice → Screen.
//
// Backed by activity diagram "Add New Employee":
//   Personal info (Name, Address, Phone, Tax ID)
//   → Department, Position, Hire Date
//   → Pay Type (Salary/Hourly), rate
//   → Pay Frequency (Weekly / Bi-weekly / Monthly)
//   → Deductions (Tax, Insurance, Retirement, Other)
//   → Banking info for direct deposit
//   → Save (employee ready for payroll)

export type EmployeeDepartment =
  | 'Operations'
  | 'Sales'
  | 'Finance'
  | 'Human Resources'
  | 'IT'
  | 'Logistics';

export type EmploymentStatus = 'active' | 'on_leave' | 'terminated';
export type EmploymentType = 'full_time' | 'part_time' | 'contract';
export type PayType = 'salary' | 'hourly';
export type PayFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface EmployeeDeductionSet {
  tax: number;
  insurance: number;
  retirement: number;
  other: number;
}

export interface EmployeeYTDData {
  grossPay: number;
  deductions: number;
  netPay: number;
  overtimeHours: number;
}

export interface EmployeePayStub {
  id: string;
  payDate: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
}

export interface EmployeeBankingInfo {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
}

export interface EmployeeRecord {
  id: string;
  companyId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  department: EmployeeDepartment;
  position: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  startDate: string;
  payType: PayType;
  payFrequency: PayFrequency;
  salaryAmount: number;
  hourlyRate: number;
  hoursPerWeek: number;
  deductions: EmployeeDeductionSet;
  banking: EmployeeBankingInfo;
  ytd: EmployeeYTDData;
  recentPayStubs: EmployeePayStub[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API entity & envelope types ─────────────────────
export type EmployeeApi = EmployeeRecord;

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface EmployeeListResponse {
  employees: EmployeeApi[];
}
export interface EmployeeSingleResponse {
  employee: EmployeeApi;
}

export type CreateEmployeePayload = Omit<
  EmployeeRecord,
  'id' | 'createdAt' | 'updatedAt'
>;
export type UpdateEmployeePayload = Partial<EmployeeRecord>;

export interface EmployeeFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  department: EmployeeDepartment | '';
  position: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  startDate: string;
  payType: PayType;
  payFrequency: PayFrequency;
  salaryAmount: string;
  hourlyRate: string;
  hoursPerWeek: string;
  deductionTax: string;
  deductionInsurance: string;
  deductionRetirement: string;
  deductionOther: string;
  bankName: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
  notes: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const DEPARTMENT_OPTIONS: { label: string; value: EmployeeDepartment }[] = [
  { label: 'Operations', value: 'Operations' },
  { label: 'Sales', value: 'Sales' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Human Resources', value: 'Human Resources' },
  { label: 'IT', value: 'IT' },
  { label: 'Logistics', value: 'Logistics' },
];

export const EMPLOYMENT_TYPE_OPTIONS: { label: string; value: EmploymentType }[] = [
  { label: 'Full Time', value: 'full_time' },
  { label: 'Part Time', value: 'part_time' },
  { label: 'Contract', value: 'contract' },
];

export const STATUS_OPTIONS: { label: string; value: EmploymentStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'On Leave', value: 'on_leave' },
  { label: 'Terminated', value: 'terminated' },
];

export const PAY_TYPE_OPTIONS: { label: string; value: PayType }[] = [
  { label: 'Salary', value: 'salary' },
  { label: 'Hourly', value: 'hourly' },
];

export const PAY_FREQUENCY_OPTIONS: { label: string; value: PayFrequency }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

// Number of pay periods per year per frequency.
export const PAY_PERIODS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
};

export const validateEmployee = (data: EmployeeFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.fullName.trim()) errors.fullName = 'Employee name is required';

  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (!data.phone.trim()) errors.phone = 'Phone is required';
  if (!data.address.trim()) errors.address = 'Address is required';
  if (!data.taxId.trim()) errors.taxId = 'Tax ID is required';

  if (!data.department) errors.department = 'Department is required';
  if (!data.position.trim()) errors.position = 'Position is required';
  if (!data.startDate.trim()) errors.startDate = 'Hire date is required';
  if (!data.payFrequency) errors.payFrequency = 'Pay frequency is required';

  if (data.payType === 'salary') {
    const salary = parseFloat(data.salaryAmount);
    if (!(salary > 0)) errors.salaryAmount = 'Salary amount must be greater than 0';
  }

  if (data.payType === 'hourly') {
    const hourly = parseFloat(data.hourlyRate);
    const hours = parseFloat(data.hoursPerWeek);
    if (!(hourly > 0)) errors.hourlyRate = 'Hourly rate must be greater than 0';
    if (!(hours > 0)) errors.hoursPerWeek = 'Hours per week must be greater than 0';
  }

  if (!data.bankName.trim()) errors.bankName = 'Bank name is required';
  if (!data.bankAccountNumber.trim()) errors.bankAccountNumber = 'Account number is required';

  return errors;
};
