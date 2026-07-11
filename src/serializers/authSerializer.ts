// ═══════════════════════════════════════════════════════
// FinMatrix — Auth Serializer
// ═══════════════════════════════════════════════════════
// Defensive backend→app mapping for the session user (Consultant_Mobile
// serializer convention). Extracted verbatim from authNetwork's mapUser —
// every auth response (signin, signup, /auth/me) funnels through this.

import type { User } from '../types';

export const userResponseSerializer = (
  backendUser: any,
  companyStatus?: string | null,
  tier?: { companyType?: string | null; features?: Record<string, boolean> | null },
): User => ({
  uid: backendUser.id,
  email: backendUser.email,
  displayName: backendUser.displayName,
  role: backendUser.role,
  companyId: backendUser.companyId || backendUser.defaultCompanyId || null,
  phoneNumber: backendUser.phone || '',
  photoURL: backendUser.photoURL || null,
  username: backendUser.username,
  isActive: true,
  isEmailVerified: backendUser.isEmailVerified ?? true,
  companyStatus: companyStatus ?? null,
  companyType: tier?.companyType ?? null,
  features: tier?.features ?? null,
  createdAt: backendUser.createdAt || new Date().toISOString(),
  updatedAt: backendUser.updatedAt || new Date().toISOString(),
});
