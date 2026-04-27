// ═══════════════════════════════════════════════════════
// FinMatrix — Employees Dummy Data (10 records)
// ═══════════════════════════════════════════════════════

import type { EmployeeRecord } from '../models/employeeModel';

const now = '2026-03-16T00:00:00.000Z';

export const employees: EmployeeRecord[] = [
  {
    id: 'emp_001', companyId: 'comp_001', employeeCode: 'EMP-001', fullName: 'Ayesha Khan', email: 'ayesha.khan@finmatrix.com', phone: '+92-300-1112233',
    address: 'House 12, Street 4, F-8/3, Islamabad', taxId: 'CNIC-3520112345671',
    department: 'Finance', position: 'Senior Accountant', employmentType: 'full_time', status: 'active', startDate: '2024-01-10', payType: 'salary', payFrequency: 'monthly', salaryAmount: 185000, hourlyRate: 0, hoursPerWeek: 40,
    deductions: { tax: 18000, insurance: 3500, retirement: 5000, other: 1200 },
    banking: { bankName: 'United Bank', accountNumber: 'PK12-0001-223344', routingNumber: '021000021' },
    ytd: { grossPay: 555000, deductions: 83100, netPay: 471900, overtimeHours: 0 },
    recentPayStubs: [
      { id: 'stub_001_1', payDate: '2026-03-01', grossPay: 185000, totalDeductions: 27700, netPay: 157300 },
      { id: 'stub_001_2', payDate: '2026-02-01', grossPay: 185000, totalDeductions: 27700, netPay: 157300 },
    ],
    notes: 'Manages monthly close and vendor reconciliations.', createdAt: now, updatedAt: now,
  },
  {
    id: 'emp_002', companyId: 'comp_001', employeeCode: 'EMP-002', fullName: 'Bilal Ahmed', email: 'bilal.ahmed@finmatrix.com', phone: '+92-300-2223344',
    address: 'Flat 7B, Diamond Heights, Gulshan-e-Iqbal, Karachi', taxId: 'CNIC-4220112233445',
    department: 'Sales', position: 'Sales Executive', employmentType: 'full_time', status: 'active', startDate: '2024-03-05', payType: 'salary', payFrequency: 'monthly', salaryAmount: 120000, hourlyRate: 0, hoursPerWeek: 40,
    deductions: { tax: 9500, insurance: 3000, retirement: 2500, other: 700 },
    banking: { bankName: 'Meezan Bank', accountNumber: 'PK12-0002-223355', routingNumber: '021000022' },
    ytd: { grossPay: 360000, deductions: 47100, netPay: 312900, overtimeHours: 0 },
    recentPayStubs: [
      { id: 'stub_002_1', payDate: '2026-03-01', grossPay: 120000, totalDeductions: 15700, netPay: 104300 },
      { id: 'stub_002_2', payDate: '2026-02-01', grossPay: 120000, totalDeductions: 15700, netPay: 104300 },
    ],
    notes: 'Handles north-region enterprise accounts.', createdAt: now, updatedAt: now,
  },
  {
    id: 'emp_003', companyId: 'comp_001', employeeCode: 'EMP-003', fullName: 'Hamza Rauf', email: 'hamza.rauf@finmatrix.com', phone: '+92-300-3334455',
    address: 'House 22, DHA Phase 5, Lahore', taxId: 'CNIC-3520087654321',
    department: 'IT', position: 'Systems Engineer', employmentType: 'full_time', status: 'active', startDate: '2023-11-15', payType: 'salary', payFrequency: 'monthly', salaryAmount: 210000, hourlyRate: 0, hoursPerWeek: 40,
    deductions: { tax: 24000, insurance: 4200, retirement: 6000, other: 1500 },
    banking: { bankName: 'HBL', accountNumber: 'PK12-0003-223366', routingNumber: '021000023' },
    ytd: { grossPay: 630000, deductions: 107100, netPay: 522900, overtimeHours: 5 },
    recentPayStubs: [
      { id: 'stub_003_1', payDate: '2026-03-01', grossPay: 210000, totalDeductions: 35700, netPay: 174300 },
      { id: 'stub_003_2', payDate: '2026-02-01', grossPay: 210000, totalDeductions: 35700, netPay: 174300 },
    ],
    notes: 'Leads infrastructure and ERP integrations.', createdAt: now, updatedAt: now,
  },
  {
    id: 'emp_004', companyId: 'comp_001', employeeCode: 'EMP-004', fullName: 'Nimra Javed', email: 'nimra.javed@finmatrix.com', phone: '+92-300-4445566',
    address: 'House 5, Bahria Town Phase 2, Rawalpindi', taxId: 'CNIC-3740012345678',
    department: 'Human Resources', position: 'HR Business Partner', employmentType: 'full_time', status: 'on_leave', startDate: '2024-05-22', payType: 'salary', payFrequency: 'monthly', salaryAmount: 135000, hourlyRate: 0, hoursPerWeek: 40,
    deductions: { tax: 11000, insurance: 3200, retirement: 3000, other: 900 },
    banking: { bankName: 'MCB', accountNumber: 'PK12-0004-223377', routingNumber: '021000024' },
    ytd: { grossPay: 405000, deductions: 54300, netPay: 350700, overtimeHours: 0 },
    recentPayStubs: [
      { id: 'stub_004_1', payDate: '2026-03-01', grossPay: 135000, totalDeductions: 18100, netPay: 116900 },
      { id: 'stub_004_2', payDate: '2026-02-01', grossPay: 135000, totalDeductions: 18100, netPay: 116900 },
    ],
    notes: 'On planned leave till end of month.', createdAt: now, updatedAt: now,
  },
  {
    id: 'emp_005', companyId: 'comp_001', employeeCode: 'EMP-005', fullName: 'Sara Iqbal', email: 'sara.iqbal@finmatrix.com', phone: '+92-300-5556677',
    address: 'House 18, Model Town, Lahore', taxId: 'CNIC-3520099887766',
    department: 'Operations', position: 'Operations Coordinator', employmentType: 'full_time', status: 'active', startDate: '2025-01-08', payType: 'hourly', payFrequency: 'biweekly', salaryAmount: 0, hourlyRate: 1450, hoursPerWeek: 45,
    deductions: { tax: 7200, insurance: 2100, retirement: 1800, other: 500 },
    banking: { bankName: 'Bank Alfalah', accountNumber: 'PK12-0005-223388', routingNumber: '021000025' },
    ytd: { grossPay: 261000, deductions: 34800, netPay: 226200, overtimeHours: 24 },
    recentPayStubs: [
      { id: 'stub_005_1', payDate: '2026-03-01', grossPay: 87000, totalDeductions: 11600, netPay: 75400 },
      { id: 'stub_005_2', payDate: '2026-02-01', grossPay: 87000, totalDeductions: 11600, netPay: 75400 },
    ],
    notes: 'Eligible for overtime pay.', createdAt: now, updatedAt: now,
  },
  {
    id: 'emp_006', companyId: 'comp_001', employeeCode: 'EMP-006', fullName: 'Usman Tariq', email: 'usman.tariq@finmatrix.com', phone: '+92-300-6667788',
    address: 'House 41, Satellite Town, Rawalpindi', taxId: 'CNIC-3740055443322',
    department: 'Logistics', position: 'Warehouse Supervisor', employmentType: 'full_time', status: 'active', startDate: '2023-09-12', payType: 'salary', payFrequency: 'monthly', salaryAmount: 128000, hourlyRate: 0, hoursPerWeek: 40,
    deductions: { tax: 9800, insurance: 2600, retirement: 2800, other: 600 },
    banking: { bankName: 'UBL', accountNumber: 'PK12-0006-223399', routingNumber: '021000026' },
    ytd: { grossPay: 384000, deductions: 45600, netPay: 338400, overtimeHours: 10 },
    recentPayStubs: [
      { id: 'stub_006_1', payDate: '2026-03-01', grossPay: 128000, totalDeductions: 15200, netPay: 112800 },
      { id: 'stub_006_2', payDate: '2026-02-01', grossPay: 128000, totalDeductions: 15200, netPay: 112800 },
    ],
    notes: 'Oversees dispatch scheduling.', createdAt: now, updatedAt: now,
  },
  {
    id: 'emp_007', companyId: 'comp_001', employeeCode: 'EMP-007', fullName: 'Farhan Malik', email: 'farhan.malik@finmatrix.com', phone: '+92-300-7778899',
    address: 'Apt 3C, Clifton Block 4, Karachi', taxId: 'CNIC-4220155667788',
    department: 'Sales', position: 'Inside Sales Rep', employmentType: 'part_time', status: 'active', startDate: '2025-07-01', payType: 'hourly', payFrequency: 'weekly', salaryAmount: 0, hourlyRate: 1050, hoursPerWeek: 30,
    deductions: { tax: 3600, insurance: 1200, retirement: 900, other: 300 },
    banking: { bankName: 'HBL', accountNumber: 'PK12-0007-224400', routingNumber: '021000023' },
    ytd: { grossPay: 189000, deductions: 18000, netPay: 171000, overtimeHours: 4 },
    recentPayStubs: [
      { id: 'stub_007_1', payDate: '2026-03-01', grossPay: 63000, totalDeductions: 6000, netPay: 57000 },
      { id: 'stub_007_2', payDate: '2026-02-01', grossPay: 63000, totalDeductions: 6000, netPay: 57000 },
    ],
    notes: 'Part-time coverage for inbound leads.', createdAt: now, updatedAt: now,
  },
  {
    id: 'emp_008', companyId: 'comp_001', employeeCode: 'EMP-008', fullName: 'Hira Yousaf', email: 'hira.yousaf@finmatrix.com', phone: '+92-300-8889900',
    address: 'House 9, G-11/3, Islamabad', taxId: 'CNIC-3520122334455',
    department: 'Finance', position: 'Payroll Specialist', employmentType: 'contract', status: 'active', startDate: '2025-10-20', payType: 'salary', payFrequency: 'monthly', salaryAmount: 98000, hourlyRate: 0, hoursPerWeek: 40,
    deductions: { tax: 6500, insurance: 2000, retirement: 1500, other: 400 },
    banking: { bankName: 'Meezan Bank', accountNumber: 'PK12-0008-224411', routingNumber: '021000022' },
    ytd: { grossPay: 294000, deductions: 31200, netPay: 262800, overtimeHours: 0 },
    recentPayStubs: [
      { id: 'stub_008_1', payDate: '2026-03-01', grossPay: 98000, totalDeductions: 10400, netPay: 87600 },
      { id: 'stub_008_2', payDate: '2026-02-01', grossPay: 98000, totalDeductions: 10400, netPay: 87600 },
    ],
    notes: 'Contract renews in Q4.', createdAt: now, updatedAt: now,
  },
  {
    id: 'emp_009', companyId: 'comp_001', employeeCode: 'EMP-009', fullName: 'Danish Ali', email: 'danish.ali@finmatrix.com', phone: '+92-300-9990011',
    address: 'House 16, Wapda Town, Lahore', taxId: 'CNIC-3520077665544',
    department: 'IT', position: 'Support Analyst', employmentType: 'full_time', status: 'active', startDate: '2024-08-04', payType: 'hourly', payFrequency: 'biweekly', salaryAmount: 0, hourlyRate: 1250, hoursPerWeek: 42,
    deductions: { tax: 5900, insurance: 2300, retirement: 1700, other: 500 },
    banking: { bankName: 'Allied Bank', accountNumber: 'PK12-0009-224422', routingNumber: '021000027' },
    ytd: { grossPay: 236250, deductions: 31200, netPay: 205050, overtimeHours: 16 },
    recentPayStubs: [
      { id: 'stub_009_1', payDate: '2026-03-01', grossPay: 78750, totalDeductions: 10400, netPay: 68350 },
      { id: 'stub_009_2', payDate: '2026-02-01', grossPay: 78750, totalDeductions: 10400, netPay: 68350 },
    ],
    notes: 'Night support rotation.', createdAt: now, updatedAt: now,
  },
  {
    id: 'emp_010', companyId: 'comp_001', employeeCode: 'EMP-010', fullName: 'Maham Qureshi', email: 'maham.qureshi@finmatrix.com', phone: '+92-300-1011122',
    address: 'House 33, North Nazimabad, Karachi', taxId: 'CNIC-4220199887766',
    department: 'Operations', position: 'Admin Assistant', employmentType: 'full_time', status: 'terminated', startDate: '2023-04-17', payType: 'salary', payFrequency: 'monthly', salaryAmount: 82000, hourlyRate: 0, hoursPerWeek: 40,
    deductions: { tax: 4200, insurance: 1600, retirement: 1200, other: 300 },
    banking: { bankName: 'MCB', accountNumber: 'PK12-0010-224433', routingNumber: '021000024' },
    ytd: { grossPay: 164000, deductions: 14600, netPay: 149400, overtimeHours: 0 },
    recentPayStubs: [
      { id: 'stub_010_1', payDate: '2026-02-01', grossPay: 82000, totalDeductions: 7300, netPay: 74700 },
      { id: 'stub_010_2', payDate: '2026-01-01', grossPay: 82000, totalDeductions: 7300, netPay: 74700 },
    ],
    notes: 'Resigned effective 2026-02-15.', createdAt: now, updatedAt: now,
  },
];
