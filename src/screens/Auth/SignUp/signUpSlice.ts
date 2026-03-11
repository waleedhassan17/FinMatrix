import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import { authRegister } from '@network/authNetwork';
import type { RegisterPayload } from '@network/authNetwork';
import type { User, UserRole } from '@/types';

export interface SignUpSliceState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
  vehicleType: string;
  vehicleNumber: string;
  selectedZones: string[];
  companyCode: string[];
  error: string;
  status: 'idle' | 'loading' | 'failed';
}

const initialState: SignUpSliceState = {
  fullName: '',
  email: '',
  phone: '+92 ',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
  vehicleType: '',
  vehicleNumber: '',
  selectedZones: [],
  companyCode: ['', '', '', '', '', ''],
  error: '',
  status: 'idle',
};

export const signUpSlice = createAppSlice({
  name: 'signUp',
  initialState,
  reducers: create => ({
    setFullName: create.reducer((state, action: PayloadAction<string>) => {
      state.fullName = action.payload;
    }),
    setSignUpEmail: create.reducer((state, action: PayloadAction<string>) => {
      state.email = action.payload;
    }),
    setPhone: create.reducer((state, action: PayloadAction<string>) => {
      state.phone = action.payload;
    }),
    setSignUpPassword: create.reducer(
      (state, action: PayloadAction<string>) => {
        state.password = action.payload;
      },
    ),
    setConfirmPassword: create.reducer(
      (state, action: PayloadAction<string>) => {
        state.confirmPassword = action.payload;
      },
    ),
    setAcceptedTerms: create.reducer(
      (state, action: PayloadAction<boolean>) => {
        state.acceptedTerms = action.payload;
      },
    ),
    setVehicleType: create.reducer((state, action: PayloadAction<string>) => {
      state.vehicleType = action.payload;
    }),
    setVehicleNumber: create.reducer(
      (state, action: PayloadAction<string>) => {
        state.vehicleNumber = action.payload;
      },
    ),
    setSelectedZones: create.reducer(
      (state, action: PayloadAction<string[]>) => {
        state.selectedZones = action.payload;
      },
    ),
    setCompanyCode: create.reducer(
      (state, action: PayloadAction<string[]>) => {
        state.companyCode = action.payload;
      },
    ),
    clearSignUpError: create.reducer(state => {
      state.error = '';
    }),
    resetSignUpForm: create.reducer(state => {
      Object.assign(state, initialState);
    }),

    submitSignUpAsync: create.asyncThunk(
      async ({
        fullName,
        email,
        phone,
        password,
        role,
        vehicleType,
        vehicleNumber,
        zones,
        companyCode,
      }: {
        fullName: string;
        email: string;
        phone: string;
        password: string;
        role: UserRole;
        vehicleType?: string;
        vehicleNumber?: string;
        zones?: string[];
        companyCode?: string;
      }) => {
        const payload: RegisterPayload = {
          fullName,
          email,
          phone,
          password,
          role,
          vehicleType,
          vehicleNumber,
          zones,
          companyCode,
        };
        const result = await authRegister({ registerInfo: payload });
        return result?.data;
      },
      {
        pending: state => {
          state.status = 'loading';
          state.error = '';
        },
        fulfilled: (state, _action) => {
          state.status = 'idle';
          state.error = '';
        },
        rejected: (state, action) => {
          state.status = 'failed';
          state.error = action.error.message ?? 'Registration failed';
        },
      },
    ),
  }),

  selectors: {
    selectSignUpFullName: state => state.fullName,
    selectSignUpEmail: state => state.email,
    selectSignUpPhone: state => state.phone,
    selectSignUpPassword: state => state.password,
    selectSignUpConfirmPassword: state => state.confirmPassword,
    selectSignUpAcceptedTerms: state => state.acceptedTerms,
    selectSignUpVehicleType: state => state.vehicleType,
    selectSignUpVehicleNumber: state => state.vehicleNumber,
    selectSignUpSelectedZones: state => state.selectedZones,
    selectSignUpCompanyCode: state => state.companyCode,
    selectSignUpStatus: state => state.status,
    selectSignUpError: state => state.error,
  },
});

export const {
  setFullName,
  setSignUpEmail,
  setPhone,
  setSignUpPassword,
  setConfirmPassword,
  setAcceptedTerms,
  setVehicleType,
  setVehicleNumber,
  setSelectedZones,
  setCompanyCode,
  clearSignUpError,
  resetSignUpForm,
  submitSignUpAsync,
} = signUpSlice.actions;

export const {
  selectSignUpFullName,
  selectSignUpEmail,
  selectSignUpPhone,
  selectSignUpPassword,
  selectSignUpConfirmPassword,
  selectSignUpAcceptedTerms,
  selectSignUpVehicleType,
  selectSignUpVehicleNumber,
  selectSignUpSelectedZones,
  selectSignUpCompanyCode,
  selectSignUpStatus,
  selectSignUpError,
} = signUpSlice.selectors;
