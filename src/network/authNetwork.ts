// ═══════════════════════════════════════════════════════
// FinMatrix — Auth Network (Dummy APIs)
// ═══════════════════════════════════════════════════════
// When NestJS backend is ready, swap simulateApiCall with real API calls.
// Each function follows the try/catch → throw Error pattern.

import { simulateApiCall } from './apiHelpers';
import {
  dummyAdminUser,
  dummyDeliveryPersonnel,
  validCompanyCodes,
} from '../dummy-data/deliveryPersonnel';
import type { User, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────────

export interface SignInPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  vehicleType?: string;
  vehicleNumber?: string;
  zones?: string[];
  companyCode?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyEmailPayload {
  email: string;
}

export interface ResendVerificationPayload {
  email: string;
}

// In-memory store for users created via signUp (persists during session)
const registeredUsers: Array<{
  email: string;
  password: string;
  user: User;
}> = [];

// ─── Login ────────────────────────────────────────────

export const authLogin = async ({
  signInInfo,
}: {
  signInInfo: SignInPayload;
}) => {
  try {
    const normalizedEmail = signInInfo.email.trim().toLowerCase();

    // Check admin credentials
    if (
      normalizedEmail === dummyAdminUser.email &&
      signInInfo.password === dummyAdminUser.password
    ) {
      const user: User = {
        uid: dummyAdminUser.userId,
        email: dummyAdminUser.email,
        displayName: dummyAdminUser.displayName,
        role: 'admin',
        companyId: dummyAdminUser.companyId,
        phoneNumber: dummyAdminUser.phone,
        photoURL: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = await simulateApiCall({ data: user }, 800);
      return result;
    }

    // Check delivery personnel credentials
    const deliveryPerson = dummyDeliveryPersonnel.find(
      dp => dp.email === normalizedEmail && dp.password === signInInfo.password,
    );
    if (deliveryPerson) {
      const user: User = {
        uid: deliveryPerson.userId,
        email: deliveryPerson.email,
        displayName: deliveryPerson.displayName,
        role: 'delivery',
        companyId: deliveryPerson.companyId,
        phoneNumber: deliveryPerson.phone,
        photoURL: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const result = await simulateApiCall({ data: user }, 800);
      return result;
    }

    // Check registered users (created via signUp)
    const registered = registeredUsers.find(
      u =>
        u.email === normalizedEmail && u.password === signInInfo.password,
    );
    if (registered) {
      const result = await simulateApiCall({ data: registered.user }, 800);
      return result;
    }

    // No match — throw
    throw new Error('Invalid email or password');
  } catch (e: any) {
    const newError = new Error(
      e.message || 'Invalid email or password. Please try again.',
    );
    throw newError;
  }
};

// ─── Register ─────────────────────────────────────────

export const authRegister = async ({
  registerInfo,
}: {
  registerInfo: RegisterPayload;
}) => {
  try {
    const normalizedEmail = registerInfo.email.trim().toLowerCase();

    // Check if email already exists
    const emailExists =
      normalizedEmail === dummyAdminUser.email ||
      dummyDeliveryPersonnel.some(dp => dp.email === normalizedEmail) ||
      registeredUsers.some(u => u.email === normalizedEmail);

    if (emailExists) {
      throw new Error('An account with this email already exists.');
    }

    // For delivery role, validate company code
    let companyId: string | null = null;
    if (registerInfo.role === 'delivery') {
      if (!registerInfo.companyCode) {
        throw new Error('Company invite code is required.');
      }
      const code = registerInfo.companyCode.trim().toUpperCase();
      companyId = validCompanyCodes[code] || null;
      if (!companyId) {
        throw new Error('Invalid company code. Contact your administrator.');
      }
    }

    const user: User = {
      uid: uuidv4(),
      email: normalizedEmail,
      displayName: registerInfo.fullName.trim(),
      role: registerInfo.role,
      companyId,
      phoneNumber: registerInfo.phone || '',
      photoURL: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store for future login
    registeredUsers.push({
      email: normalizedEmail,
      password: registerInfo.password,
      user,
    });

    const result = await simulateApiCall({ data: user }, 1000);
    return result;
  } catch (e: any) {
    const newError = new Error(e.message || 'Registration failed.');
    throw newError;
  }
};

// ─── Forgot Password ─────────────────────────────────

export const authForgotPassword = async ({
  forgotPasswordInfo,
}: {
  forgotPasswordInfo: ForgotPasswordPayload;
}) => {
  try {
    const normalizedEmail = forgotPasswordInfo.email.trim().toLowerCase();

    const emailExists =
      normalizedEmail === dummyAdminUser.email ||
      dummyDeliveryPersonnel.some(dp => dp.email === normalizedEmail) ||
      registeredUsers.some(u => u.email === normalizedEmail);

    if (!emailExists) {
      throw new Error('No account found with this email.');
    }

    const result = await simulateApiCall(
      {
        data: {
          success: true,
          message: `Password reset instructions sent to ${normalizedEmail}`,
        },
      },
      500,
    );
    return result;
  } catch (e: any) {
    const newError = new Error(
      e.message || 'Failed to send reset instructions.',
    );
    throw newError;
  }
};

// ─── Verify Email ─────────────────────────────────────

export const authVerifyEmail = async ({
  verifyEmailInfo,
}: {
  verifyEmailInfo: VerifyEmailPayload;
}) => {
  try {
    const result = await simulateApiCall(
      { data: { success: true } },
      600,
    );
    return result;
  } catch (e: any) {
    const newError = new Error(e.message || 'Email verification failed.');
    throw newError;
  }
};

// ─── Resend Verification ──────────────────────────────

export const authResendVerification = async ({
  resendInfo,
}: {
  resendInfo: ResendVerificationPayload;
}) => {
  try {
    const result = await simulateApiCall(
      {
        data: {
          success: true,
          message: `Verification email resent to ${resendInfo.email}`,
        },
      },
      500,
    );
    return result;
  } catch (e: any) {
    const newError = new Error(
      e.message || 'Failed to resend verification email.',
    );
    throw newError;
  }
};
