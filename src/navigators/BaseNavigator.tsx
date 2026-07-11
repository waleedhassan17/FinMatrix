// ═══════════════════════════════════════════════════════
// FinMatrix — BaseNavigator (auth / onboarding / status gates)
// ═══════════════════════════════════════════════════════
// Dumb mapper over the route arrays in navigations-maps/Auth.ts
// (Consultant_Mobile convention). Which top-level navigator mounts —
// this one, the rider app, super-admin, or a company tier — is decided
// by AppContainer.renderNavigator(); this navigator only handles the
// session-gate branches for admins that are not (yet) inside the app:
// sign-in, email verification, approval, renewal, rejection, onboarding.

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../hooks/useReduxHooks';
import type { RootStackParamList } from '../types';
import type { IRoute } from '../navigations-maps/types';
import {
  ONBOARDING_ROUTE,
  UNAUTHENTICATED_ROUTES,
  EMAIL_VERIFY_ROUTES,
  PENDING_ROUTES,
  RENEW_ROUTES,
  REJECTED_ROUTES,
  DRAFT_COMPANY_ROUTES,
  COMPANY_ONBOARDING_ROUTES,
} from '../navigations-maps/Auth';

const Stack = createNativeStackNavigator<RootStackParamList>();

const BaseNavigator: React.FC = () => {
  const { isAuthenticated, hasSeenOnboarding, user } = useAppSelector(
    state => state.auth,
  );
  const hasCompany = Boolean(user?.companyId);

  // ─── Stage 1: company-admin onboarding/approval gates ───
  const companyStatus = user?.companyStatus ?? null;
  const emailVerified = user?.isEmailVerified !== false; // default true (legacy)
  const isPending =
    companyStatus === 'pending_approval' || companyStatus === 'pending';
  const isRejected = companyStatus === 'rejected';
  // Mid-session deactivation (server sets status → inactive) routes the user out.
  const isInactive = companyStatus === 'inactive' || companyStatus === 'suspended';
  // A created-but-not-submitted company resumes at plan selection + submit.
  const isDraftCompany = hasCompany && companyStatus === 'email_verified';

  // Same branch conditions as before the refactor — only the route lists
  // moved into navigations-maps/Auth.ts.
  const routes: IRoute[] = !isAuthenticated
    ? [...(!hasSeenOnboarding ? [ONBOARDING_ROUTE] : []), ...UNAUTHENTICATED_ROUTES]
    : !emailVerified
      ? EMAIL_VERIFY_ROUTES
      : isPending
        ? PENDING_ROUTES
        : isInactive
          ? RENEW_ROUTES
          : isRejected
            ? REJECTED_ROUTES
            : isDraftCompany
              ? DRAFT_COMPANY_ROUTES
              : COMPANY_ONBOARDING_ROUTES;

  return (
    <Stack.Navigator
      id="BaseNavigator"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8FAFC' },
        animation: 'none',
      }}>
      {routes.map(route => (
        <Stack.Screen
          key={route.title}
          name={route.title as keyof RootStackParamList}
          component={route.component}
          options={route.options}
          initialParams={route.initialParams as never}
        />
      ))}
    </Stack.Navigator>
  );
};

export default BaseNavigator;
