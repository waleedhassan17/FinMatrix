import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import { authLogin } from '@network/authNetwork';
import type { SignInPayload } from '@network/authNetwork';
import type { User } from '@/types';

export interface SignInSliceState {
  email: string;
  password: string;
  rememberMe: boolean;
  error: string;
  status: 'idle' | 'loading' | 'failed';
}

const initialState: SignInSliceState = {
  email: '',
  password: '',
  rememberMe: false,
  error: '',
  status: 'idle',
};

export const signInSlice = createAppSlice({
  name: 'signIn',
  initialState,
  reducers: create => ({
    setEmail: create.reducer((state, action: PayloadAction<string>) => {
      state.email = action.payload;
    }),
    setPassword: create.reducer((state, action: PayloadAction<string>) => {
      state.password = action.payload;
    }),
    setRememberMe: create.reducer((state, action: PayloadAction<boolean>) => {
      state.rememberMe = action.payload;
    }),
    clearSignInError: create.reducer(state => {
      state.error = '';
    }),
    resetSignInForm: create.reducer(state => {
      state.email = '';
      state.password = '';
      state.rememberMe = false;
      state.error = '';
      state.status = 'idle';
    }),

    submitSignInAsync: create.asyncThunk(
      async ({ email, password }: { email: string; password: string }) => {
        const payload: SignInPayload = { email, password };
        const result = await authLogin({ signInInfo: payload });
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
          state.error = action.error.message ?? 'Sign in failed';
        },
      },
    ),
  }),

  selectors: {
    selectSignInEmail: state => state.email,
    selectSignInPassword: state => state.password,
    selectSignInRememberMe: state => state.rememberMe,
    selectSignInStatus: state => state.status,
    selectSignInError: state => state.error,
  },
});

export const {
  setEmail,
  setPassword,
  setRememberMe,
  clearSignInError,
  resetSignInForm,
  submitSignInAsync,
} = signInSlice.actions;

export const {
  selectSignInEmail,
  selectSignInPassword,
  selectSignInRememberMe,
  selectSignInStatus,
  selectSignInError,
} = signInSlice.selectors;
