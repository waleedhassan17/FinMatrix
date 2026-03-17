// ═══════════════════════════════════════════════════════
// FinMatrix — Employee Model & Validation
// ═══════════════════════════════════════════════════════

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
  department: EmployeeDepartment;
  position: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  startDate: string;
  payType: PayType;
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

export interface EmployeeFormData {
  fullName: string;
  email: string;
  phone: string;
  department: EmployeeDepartment | '';
  position: string;
  employmentType: EmploymentType;
  status: EmploymentStatus;
  startDate: string;
  payType: PayType;
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

export const validateEmployee = (data: EmployeeFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!data.fullName.trim()) errors.fullName = 'Employee name is required';

  if (!data.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (!data.department) errors.department = 'Department is required';
  if (!data.position.trim()) errors.position = 'Position is required';
  if (!data.startDate.trim()) errors.startDate = 'Start date is required';

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
