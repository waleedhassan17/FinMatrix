import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import { authLogin, authDeliveryLogin, AuthError } from '@networks/auth/authNetwork';
import type { SignInPayload, DeliverySignInPayload } from '@networks/auth/authNetwork';
import type { User } from '@/types';

/** What a failed sign-in hands the screen, beyond the message. */
interface SignInRejection {
  code?: string;
  message?: string;
  accountType?: string | null;
}

export interface SignInSliceState {
  email: string;
  username: string;
  password: string;
  rememberMe: boolean;
  error: string;
  /** The server's refusal code (WRONG_PORTAL, RATE_LIMITED, …), when it gave one. */
  errorCode: string | null;
  /** WRONG_PORTAL only: the kind of account it was, so the screen can name its door. */
  wrongPortalAccount: string | null;
  status: 'idle' | 'loading' | 'failed';
}

const initialState: SignInSliceState = {
  email: '',
  username: '',
  password: '',
  rememberMe: false,
  error: '',
  errorCode: null,
  wrongPortalAccount: null,
  status: 'idle',
};

const clearError = (state: SignInSliceState) => {
  state.error = '';
  state.errorCode = null;
  state.wrongPortalAccount = null;
};

const applyRejection = (
  state: SignInSliceState,
  payload: SignInRejection | undefined,
  fallback: string | undefined,
) => {
  state.status = 'failed';
  state.error = payload?.message ?? fallback ?? 'Sign in failed';
  state.errorCode = payload?.code ?? null;
  state.wrongPortalAccount = payload?.code === 'WRONG_PORTAL' ? payload.accountType ?? null : null;
};

export const signInSlice = createAppSlice({
  name: 'signIn',
  initialState,
  reducers: create => ({
    setEmail: create.reducer((state, action: PayloadAction<string>) => {
      state.email = action.payload;
    }),
    setUsername: create.reducer((state, action: PayloadAction<string>) => {
      state.username = action.payload;
    }),
    setPassword: create.reducer((state, action: PayloadAction<string>) => {
      state.password = action.payload;
    }),
    setRememberMe: create.reducer((state, action: PayloadAction<boolean>) => {
      state.rememberMe = action.payload;
    }),
    clearSignInError: create.reducer(state => {
      clearError(state);
    }),
    resetSignInForm: create.reducer(state => {
      state.email = '';
      state.username = '';
      state.password = '';
      state.rememberMe = false;
      clearError(state);
      state.status = 'idle';
    }),

    submitSignInAsync: create.asyncThunk(
      async (
        { email, password }: { email: string; password: string },
        { rejectWithValue },
      ) => {
        const payload: SignInPayload = { email, password };
        try {
          const result = await authLogin({ signInInfo: payload });
          return result?.data;
        } catch (e: any) {
          // Preserve the structured login-gate info (code + reason) through the
          // thunk; the default error serialization would drop custom fields.
          if (e instanceof AuthError) {
            return rejectWithValue({
              code: e.code,
              message: e.message,
              email: e.email,
              companyStatus: e.companyStatus,
              rejectionReason: e.rejectionReason,
              pendingKind: e.pendingKind,
              accountType: e.accountType,
            });
          }
          return rejectWithValue({ message: e?.message ?? 'Sign in failed' });
        }
      },
      {
        pending: state => {
          state.status = 'loading';
          clearError(state);
        },
        fulfilled: (state, _action) => {
          state.status = 'idle';
          clearError(state);
        },
        rejected: (state, action) => {
          applyRejection(state, action.payload as SignInRejection | undefined, action.error.message);
        },
      },
    ),

    // Staff and riders: a username, and the exact door they chose — the server
    // refuses a staff account on the Delivery Portal and the reverse.
    submitDeliverySignInAsync: create.asyncThunk(
      async (payload: DeliverySignInPayload, { rejectWithValue }) => {
        try {
          const result = await authDeliveryLogin({ signInInfo: payload });
          return result?.data;
        } catch (e: any) {
          if (e instanceof AuthError) {
            return rejectWithValue({
              code: e.code,
              message: e.message,
              accountType: e.accountType,
            });
          }
          return rejectWithValue({ message: e?.message ?? 'Sign in failed' });
        }
      },
      {
        pending: state => {
          state.status = 'loading';
          clearError(state);
        },
        fulfilled: (state, _action) => {
          state.status = 'idle';
          clearError(state);
        },
        rejected: (state, action) => {
          applyRejection(state, action.payload as SignInRejection | undefined, action.error.message);
        },
      },
    ),
  }),

  selectors: {
    selectSignInEmail: state => state.email,
    selectSignInUsername: state => state.username,
    selectSignInPassword: state => state.password,
    selectSignInRememberMe: state => state.rememberMe,
    selectSignInStatus: state => state.status,
    selectSignInError: state => state.error,
    selectSignInErrorCode: state => state.errorCode,
    selectWrongPortalAccount: state => state.wrongPortalAccount,
  },
});

export const {
  setEmail,
  setUsername,
  setPassword,
  setRememberMe,
  clearSignInError,
  resetSignInForm,
  submitSignInAsync,
  submitDeliverySignInAsync,
} = signInSlice.actions;

export const {
  selectSignInEmail,
  selectSignInUsername,
  selectSignInPassword,
  selectSignInRememberMe,
  selectSignInStatus,
  selectSignInError,
  selectSignInErrorCode,
  selectWrongPortalAccount,
} = signInSlice.selectors;
