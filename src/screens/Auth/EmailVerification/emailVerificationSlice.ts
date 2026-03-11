import type { PayloadAction } from '@reduxjs/toolkit';
import { createAppSlice } from '@store/createAppSlice';
import {
  authVerifyEmail,
  authResendVerification,
} from '@network/authNetwork';
import type {
  VerifyEmailPayload,
  ResendVerificationPayload,
} from '@network/authNetwork';

export interface EmailVerificationSliceState {
  resendCooldown: number;
  isVerified: boolean;
  error: string;
  resendStatus: 'idle' | 'loading' | 'failed';
  verifyStatus: 'idle' | 'loading' | 'failed';
}

const initialState: EmailVerificationSliceState = {
  resendCooldown: 0,
  isVerified: false,
  error: '',
  resendStatus: 'idle',
  verifyStatus: 'idle',
};

export const emailVerificationSlice = createAppSlice({
  name: 'emailVerification',
  initialState,
  reducers: create => ({
    setVerificationCooldown: create.reducer(
      (state, action: PayloadAction<number>) => {
        state.resendCooldown = action.payload;
      },
    ),
    decrementVerificationCooldown: create.reducer(state => {
      if (state.resendCooldown > 0) {
        state.resendCooldown -= 1;
      }
    }),
    clearVerificationError: create.reducer(state => {
      state.error = '';
    }),
    resetVerificationForm: create.reducer(state => {
      Object.assign(state, initialState);
    }),

    resendVerificationAsync: create.asyncThunk(
      async ({ email }: { email: string }) => {
        const payload: ResendVerificationPayload = { email };
        const result = await authResendVerification({ resendInfo: payload });
        return result?.data;
      },
      {
        pending: state => {
          state.resendStatus = 'loading';
          state.error = '';
        },
        fulfilled: state => {
          state.resendStatus = 'idle';
          state.resendCooldown = 30;
          state.error = '';
        },
        rejected: (state, action) => {
          state.resendStatus = 'failed';
          state.error =
            action.error.message ?? 'Failed to resend verification';
        },
      },
    ),

    verifyEmailAsync: create.asyncThunk(
      async ({ email }: { email: string }) => {
        const payload: VerifyEmailPayload = { email };
        const result = await authVerifyEmail({ verifyEmailInfo: payload });
        return result?.data;
      },
      {
        pending: state => {
          state.verifyStatus = 'loading';
          state.error = '';
        },
        fulfilled: state => {
          state.verifyStatus = 'idle';
          state.isVerified = true;
          state.error = '';
        },
        rejected: (state, action) => {
          state.verifyStatus = 'failed';
          state.error =
            action.error.message ?? 'Email verification failed';
        },
      },
    ),
  }),

  selectors: {
    selectVerificationCooldown: state => state.resendCooldown,
    selectIsVerified: state => state.isVerified,
    selectVerificationError: state => state.error,
    selectResendStatus: state => state.resendStatus,
    selectVerifyStatus: state => state.verifyStatus,
  },
});

export const {
  setVerificationCooldown,
  decrementVerificationCooldown,
  clearVerificationError,
  resetVerificationForm,
  resendVerificationAsync,
  verifyEmailAsync,
} = emailVerificationSlice.actions;

export const {
  selectVerificationCooldown,
  selectIsVerified,
  selectVerificationError,
  selectResendStatus,
  selectVerifyStatus,
} = emailVerificationSlice.selectors;
