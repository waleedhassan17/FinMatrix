// ═══════════════════════════════════════════════════════
// FinMatrix — Employee Network (Dummy API)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { employees as seedEmployees } from '../dummy-data/employees';
import type { EmployeeRecord } from '../models/employeeModel';

let employeeStore: EmployeeRecord[] = seedEmployees.map(e => ({
  ...e,
  deductions: { ...e.deductions },
  banking: { ...e.banking },
  ytd: { ...e.ytd },
  recentPayStubs: e.recentPayStubs.map(s => ({ ...s })),
}));

const cloneEmployee = (e: EmployeeRecord): EmployeeRecord => ({
  ...e,
  deductions: { ...e.deductions },
  banking: { ...e.banking },
  ytd: { ...e.ytd },
  recentPayStubs: e.recentPayStubs.map(s => ({ ...s })),
});

export const getEmployeesAPI = async (): Promise<EmployeeRecord[]> =>
  simulateApiCall(employeeStore.map(cloneEmployee), 700);

export const getEmployeeByIdAPI = async (id: string): Promise<EmployeeRecord> => {
  const employee = employeeStore.find(e => e.id === id);
  if (!employee) throw new Error('Employee not found');
  return simulateApiCall(cloneEmployee(employee), 450);
};

export const createEmployeeAPI = async (
  data: Omit<EmployeeRecord, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<EmployeeRecord> => {
  const now = new Date().toISOString();
  const newEmployee: EmployeeRecord = {
    ...data,
    id: `emp_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    deductions: { ...data.deductions },
    banking: { ...data.banking },
    ytd: { ...data.ytd },
    recentPayStubs: data.recentPayStubs.map(s => ({ ...s })),
  };
  employeeStore.push(newEmployee);
  return simulateApiCall(cloneEmployee(newEmployee), 600);
};

export const updateEmployeeAPI = async (
  id: string,
  data: Partial<EmployeeRecord>,
): Promise<EmployeeRecord> => {
  const idx = employeeStore.findIndex(e => e.id === id);
  if (idx === -1) throw new Error('Employee not found');

  employeeStore[idx] = {
    ...employeeStore[idx],
    ...data,
    deductions: { ...employeeStore[idx].deductions, ...(data.deductions ?? {}) },
    banking: { ...employeeStore[idx].banking, ...(data.banking ?? {}) },
    ytd: { ...employeeStore[idx].ytd, ...(data.ytd ?? {}) },
    recentPayStubs: data.recentPayStubs
      ? data.recentPayStubs.map(s => ({ ...s }))
      : employeeStore[idx].recentPayStubs.map(s => ({ ...s })),
    updatedAt: new Date().toISOString(),
  };

  return simulateApiCall(cloneEmployee(employeeStore[idx]), 600);
};
