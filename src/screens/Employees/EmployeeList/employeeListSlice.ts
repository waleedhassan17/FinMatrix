// ═══════════════════════════════════════════════════════
// FinMatrix — Employee List Slice (createAppSlice pattern)
// ═══════════════════════════════════════════════════════

import { createSelector, type PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import type {
  CreateEmployeePayload,
  EmployeeDepartment,
  EmployeeRecord,
  UpdateEmployeePayload,
} from '../../../models/employeeModel';
import {
  getEmployeesAPI,
  createEmployeeAPI,
  updateEmployeeAPI,
} from '../../../network/employeeNetwork';
import {
  employeeListSerializer,
  employeeSingleSerializer,
} from '../../../serializers/employeeSerializer';

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
      async () => {
        const envelope = await getEmployeesAPI();
        return employeeListSerializer(envelope);
      },
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
      async (data: CreateEmployeePayload) => {
        const envelope = await createEmployeeAPI(data);
        return employeeSingleSerializer(envelope);
      },
      {
        fulfilled: (state, action) => {
          if (action.payload) state.employees.push(action.payload);
        },
      },
    ),

    editEmployee: create.asyncThunk(
      async ({ id, data }: { id: string; data: UpdateEmployeePayload }) => {
        const envelope = await updateEmployeeAPI(id, data);
        return employeeSingleSerializer(envelope);
      },
      {
        fulfilled: (state, action) => {
          if (!action.payload) return;
          const idx = state.employees.findIndex(e => e.id === action.payload!.id);
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
    selectFilteredEmployees: createSelector(
      [
        (state: EmployeeListState) => state.employees,
        (state: EmployeeListState) => state.searchQuery,
        (state: EmployeeListState) => state.departmentFilter,
        (state: EmployeeListState) => state.sortField,
      ],
      (employees, searchQuery, departmentFilter, sortField) => {
        let list = employees;
        if (departmentFilter !== 'all') {
          list = list.filter(e => e.department === departmentFilter);
        }
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          list = list.filter(
            e =>
              e.fullName.toLowerCase().includes(q) ||
              e.employeeCode.toLowerCase().includes(q) ||
              e.email.toLowerCase().includes(q) ||
              e.position.toLowerCase().includes(q),
          );
        }
        return [...list].sort((a, b) => {
          switch (sortField) {
            case 'name':
              return a.fullName.localeCompare(b.fullName);
            case 'department':
              return a.department.localeCompare(b.department);
            case 'recent':
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            default:
              return 0;
          }
        });
      },
    ),
    selectEmployeeSummary: createSelector(
      [(state: EmployeeListState) => state.employees],
      employees => {
        const total = employees.length;
        const active = employees.filter(e => e.status === 'active').length;
        const monthlyPayroll = employees.reduce((sum, e) => {
          if (e.payType === 'salary') return sum + e.salaryAmount;
          return sum + e.hourlyRate * e.hoursPerWeek * 4;
        }, 0);
        return { total, active, monthlyPayroll };
      },
    ),
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
  selectFilteredEmployees,
  selectEmployeeSummary,
} = employeeListSlice.selectors;
