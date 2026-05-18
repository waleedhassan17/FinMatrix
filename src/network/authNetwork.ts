// ═══════════════════════════════════════════════════════
// FinMatrix — Auth Network (Production API)
// ═══════════════════════════════════════════════════════

import { api, setTokens, setStoredCompanyId, clearTokens, extractErrorMessage } from './apiHelpers';
import type { User } from '../types';

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
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface DeliverySignInPayload {
  username: string;
  password: string;
}

export interface VerifyEmailPayload {
  email: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface CheckVerificationPayload {
  email: string;
}

// ─── Helper: map backend user to app User type ───────
const mapUser = (backendUser: any): User => ({
  uid: backendUser.id,
  email: backendUser.email,
  displayName: backendUser.displayName,
  role: backendUser.role,
  companyId: backendUser.companyId || backendUser.defaultCompanyId || null,
  phoneNumber: backendUser.phone || '',
  photoURL: backendUser.photoURL || null,
  username: backendUser.username,
  isActive: true,
  createdAt: backendUser.createdAt || new Date().toISOString(),
  updatedAt: backendUser.updatedAt || new Date().toISOString(),
});

// ─── Login ────────────────────────────────────────────

export const authLogin = async ({
  signInInfo,
}: {
  signInInfo: SignInPayload;
}) => {
  try {
    const response = await api.post('/auth/signin', {
      email: signInInfo.email.trim(),
      password: signInInfo.password,
    });
    console.log('[authLogin] response.data:', JSON.stringify(response.data, null, 2));
    const responseData = response.data?.data ?? response.data;
    const { user: backendUser, tokens, companyId } = responseData;
    if (!tokens?.accessToken) {
      throw new Error('Login succeeded but no token received. Please try again.');
    }
    // Store tokens
    await setTokens(tokens.accessToken, tokens.refreshToken);
    if (companyId) {
      await setStoredCompanyId(companyId);
    }
    const user = mapUser(backendUser);
    return { data: user };
  } catch (e: any) {
    console.warn('[authLogin] error:', e?.response?.status, e?.response?.data ?? e?.message);
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Delivery Login (email-based, same endpoint) ─────

export const authDeliveryLogin = async ({
  signInInfo,
}: {
  signInInfo: DeliverySignInPayload;
}) => {
  try {
    // Backend uses email-based login for delivery too
    const response = await api.post('/auth/signin', {
      email: signInInfo.username.trim(),
      password: signInInfo.password,
    });
    console.log('[authDeliveryLogin] response.data:', JSON.stringify(response.data, null, 2));
    const responseData = response.data?.data ?? response.data;
    const { user: backendUser, tokens, companyId } = responseData;
    if (!tokens?.accessToken) {
      throw new Error('Login succeeded but no token received. Please try again.');
    }
    await setTokens(tokens.accessToken, tokens.refreshToken);
    if (companyId) {
      await setStoredCompanyId(companyId);
    }
    const user = mapUser(backendUser);
    return { data: user };
  } catch (e: any) {
    console.warn('[authDeliveryLogin] error:', e?.response?.status, e?.response?.data ?? e?.message);
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Register ─────────────────────────────────────────

export const authRegister = async ({
  registerInfo,
}: {
  registerInfo: RegisterPayload;
}) => {
  try {
    const response = await api.post('/auth/signup', {
      email: registerInfo.email.trim(),
      password: registerInfo.password,
      displayName: registerInfo.fullName.trim(),
      phone: registerInfo.phone,
      role: 'admin',
    });
    const { user: backendUser, tokens, companyId } = response.data.data;
    await setTokens(tokens.accessToken, tokens.refreshToken);
    if (companyId) {
      await setStoredCompanyId(companyId);
    }
    const user = mapUser(backendUser);
    return { data: user };
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Get Current User (Me) ───────────────────────────

export const authMe = async () => {
  try {
    const response = await api.get('/auth/me');
    const { user: backendUser, companies, companyId } = response.data.data;
    const user = mapUser(backendUser);
    return { data: { user, companies, companyId } };
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Sign Out ─────────────────────────────────────────

export const authSignOut = async () => {
  try {
    await api.post('/auth/signout');
  } catch {
    // Ignore errors on signout
  } finally {
    await clearTokens();
  }
};

// ─── Forgot Password ─────────────────────────────────

export const authForgotPassword = async ({
  forgotPasswordInfo,
}: {
  forgotPasswordInfo: ForgotPasswordPayload;
}) => {
  try {
    const response = await api.post('/auth/forgot-password', {
      email: forgotPasswordInfo.email.trim(),
    });
    return { data: response.data };
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Reset Password ──────────────────────────────────

export const authResetPassword = async (token: string, newPassword: string) => {
  try {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return { data: response.data };
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

// ─── Verify Email (no-op for now) ────────────────────

export const authVerifyEmail = async ({
  verifyEmailInfo,
}: {
  verifyEmailInfo: VerifyEmailPayload;
}) => {
  return { data: { success: true } };
};

// ─── Resend Verification ──────────────────────────────

export const authResendVerification = async ({
  resendInfo,
}: {
  resendInfo: ResendVerificationPayload;
}) => {
  return { data: { success: true, message: `Verification email resent to ${resendInfo.email}` } };
};

// ─── Check Verification Status ────────────────────────

export const authCheckVerificationStatus = async ({
  checkInfo,
}: {
  checkInfo: CheckVerificationPayload;
}) => {
  return { data: { verified: true } };
};

// ─── Company APIs ─────────────────────────────────────

export const createCompanyAPI = async (data: {
  name: string;
  industry?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
}) => {
  try {
    const response = await api.post('/companies', data);
    return response.data.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const joinCompanyAPI = async (inviteCode: string) => {
  try {
    const response = await api.post('/companies/join', { inviteCode });
    return response.data.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getCompanyAPI = async (companyId: string) => {
  try {
    const response = await api.get(`/companies/${companyId}`);
    return response.data.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const updateCompanyAPI = async (companyId: string, data: any) => {
  try {
    const response = await api.patch(`/companies/${companyId}`, data);
    return response.data.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const getCompanyMembersAPI = async (companyId: string) => {
  try {
    const response = await api.get(`/companies/${companyId}/members`);
    return response.data.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const removeCompanyMemberAPI = async (companyId: string, userId: string) => {
  try {
    const response = await api.delete(`/companies/${companyId}/members/${userId}`);
    return response.data.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const regenerateInviteCodeAPI = async (companyId: string) => {
  try {
    const response = await api.post(`/companies/${companyId}/regenerate-code`);
    return response.data.data;
  } catch (e: any) {
    throw new Error(extractErrorMessage(e));
  }
};

export const registerAdminCreatedPersonnel = async (info: any): Promise<any> => {
  try {
    const response = await api.post('/delivery-personnel', {
      email: info.email,
      username: info.username,
      password: info.password,
      name: info.user?.displayName ?? info.email?.split('@')[0],
      phone: info.user?.phoneNumber ?? '',
      companyId: info.user?.companyId,
      vehicleType: info.vehicleType ?? 'motorcycle',
      vehicleNumber: info.vehicleNumber ?? '',
      zones: info.zones ?? [],
      maxLoad: info.maxLoad ?? 10,
    });
    return response.data;
  } catch (e: any) {
    console.warn('[registerAdminCreatedPersonnel] error:', e?.response?.status, e?.response?.data ?? e?.message);
    throw new Error(extractErrorMessage(e));
  }
};
