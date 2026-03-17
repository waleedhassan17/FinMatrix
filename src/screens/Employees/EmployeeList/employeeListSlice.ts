// ═══════════════════════════════════════════════════════
// FinMatrix — Employee List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type { EmployeeDepartment, EmployeeRecord } from '../../../models/employeeModel';
import {
  getEmployeesAPI,
  createEmployeeAPI,
  updateEmployeeAPI,
} from '../../../network/employeeNetwork';

export type EmployeeDepartmentFilter = 'all' | EmployeeDepartment;
export type EmployeeSortField = 'name' | 'department' | 'recent';

export interface EmployeeListState {
  employees: EmployeeRecord[];
  searchQuery: string;
  departmentFilter: EmployeeDepartmentFilter;
  sortField: EmployeeSortField;
  isLoading: boolean;
  error: string;
}

const initialState: EmployeeListState = {
  employees: [],
  searchQuery: '',
  departmentFilter: 'all',
  sortField: 'name',
  isLoading: false,
  error: '',
};

export const employeeListSlice = createAppSlice({
  name: 'employeeList',
  initialState,
  reducers: create => ({
    setEmployeeSearchQuery: create.reducer((state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    }),
    setEmployeeDepartmentFilter: create.reducer((state, action: PayloadAction<EmployeeDepartmentFilter>) => {
      state.departmentFilter = action.payload;
    }),
    setEmployeeSortField: create.reducer((state, action: PayloadAction<EmployeeSortField>) => {
      state.sortField = action.payload;
    }),

    fetchEmployees: create.asyncThunk(
      async () => getEmployeesAPI(),
      {
        pending: state => {
          state.isLoading = true;
          state.error = '';
        },
        fulfilled: (state, action) => {
          state.employees = action.payload;
          state.isLoading = false;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message ?? 'Failed to fetch employees';
        },
      },
    ),

    createEmployee: create.asyncThunk(
      async (data: Omit<EmployeeRecord, 'id' | 'createdAt' | 'updatedAt'>) => createEmployeeAPI(data),
      {
        fulfilled: (state, action) => {
          state.employees.push(action.payload);
        },
      },
    ),

    editEmployee: create.asyncThunk(
      async ({ id, data }: { id: string; data: Partial<EmployeeRecord> }) => updateEmployeeAPI(id, data),
      {
        fulfilled: (state, action) => {
          const idx = state.employees.findIndex(e => e.id === action.payload.id);
          if (idx !== -1) state.employees[idx] = action.payload;
        },
      },
    ),
  }),
  selectors: {
    selectEmployees: state => state.employees,
    selectEmployeeSearchQuery: state => state.searchQuery,
    selectEmployeeDepartmentFilter: state => state.departmentFilter,
    selectEmployeeSortField: state => state.sortField,
    selectEmployeeIsLoading: state => state.isLoading,
    selectEmployeeError: state => state.error,
  },
});

export const {
  setEmployeeSearchQuery,
  setEmployeeDepartmentFilter,
  setEmployeeSortField,
  fetchEmployees,
  createEmployee,
  editEmployee,
} = employeeListSlice.actions;

export const {
  selectEmployees,
  selectEmployeeSearchQuery,
  selectEmployeeDepartmentFilter,
  selectEmployeeSortField,
  selectEmployeeIsLoading,
  selectEmployeeError,
} = employeeListSlice.selectors;
