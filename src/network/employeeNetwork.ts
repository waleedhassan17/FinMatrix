// ═══════════════════════════════════════════════════════
// FinMatrix — Employee Network (Dummy API)
// ═══════════════════════════════════════════════════════

import { simulateApiCall } from './apiHelpers';
import { employees as seedEmployees } from '../dummy-data/employees';
import type {
  ApiEnvelope,
  CreateEmployeePayload,
  EmployeeListResponse,
  EmployeeRecord,
  EmployeeSingleResponse,
  UpdateEmployeePayload,
} from '../models/employeeModel';

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

export const getEmployeesAPI = async (): Promise<
  ApiEnvelope<EmployeeListResponse>
> =>
  simulateApiCall(
    { success: true, data: { employees: employeeStore.map(cloneEmployee) } },
    700,
  );

export const getEmployeeByIdAPI = async (
  id: string,
): Promise<ApiEnvelope<EmployeeSingleResponse>> => {
  const employee = employeeStore.find(e => e.id === id);
  if (!employee) throw new Error('Employee not found');
  return simulateApiCall(
    { success: true, data: { employee: cloneEmployee(employee) } },
    450,
  );
};

export const createEmployeeAPI = async (
  data: CreateEmployeePayload,
): Promise<ApiEnvelope<EmployeeSingleResponse>> => {
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
  return simulateApiCall(
    { success: true, data: { employee: cloneEmployee(newEmployee) } },
    600,
  );
};

export const updateEmployeeAPI = async (
  id: string,
  data: UpdateEmployeePayload,
): Promise<ApiEnvelope<EmployeeSingleResponse>> => {
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

  return simulateApiCall(
    { success: true, data: { employee: cloneEmployee(employeeStore[idx]) } },
    600,
  );
};

// Re-export payload types for slice import convenience.
export type { CreateEmployeePayload, UpdateEmployeePayload } from '../models/employeeModel';
