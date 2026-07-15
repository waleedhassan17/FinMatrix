// ═══════════════════════════════════════════════════════
// FinMatrix — Root AppContainer
// ═══════════════════════════════════════════════════════
// Top-level app shell rendered inside Provider/PersistGate
// (Consultant_Mobile convention). Owns: session bootstrap (fetch-me),
// the renderNavigator() role/tier switch, navigation container, deep
// linking, status bar, splash overlay, and toast notifications.

import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import {
  NavigationContainer,
  LinkingOptions,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../types';

import BaseNavigator from '../../navigators/BaseNavigator';
import AdminTabNavigator from '../../navigators/AdminTabNavigator';
import DeliveryTabNavigator from '../../navigators/DeliveryTabNavigator';
import SuperAdminNavigator from '../../navigators/SuperAdminNavigator';
import SmallBusinessNavigator from '../../navigators/tiers/SmallBusinessNavigator';
import LargeOrgNavigator from '../../navigators/tiers/LargeOrgNavigator';
import SplashOverlay from '../../screens/Splash/SplashScreen';

import { bootstrapSession, selectIsAppReady } from './appContainerSlice';
import {
  selectIsAuthenticated,
  selectUser,
  signOut,
} from '../../screens/Auth/authSlice';
import {
  setSessionExpiredHandler,
  setCompanyStatusStaleHandler,
} from '../../utils/authEvents';
import { resetSignInForm } from '../../screens/Auth/SignIn/signInSlice';
import { resetSignUpForm } from '../../screens/Auth/SignUp/signUpSlice';
import { resetForgotPasswordForm } from '../../screens/Auth/ForgotPassword/forgotPasswordSlice';
import { resetVerificationForm } from '../../screens/Auth/EmailVerification/emailVerificationSlice';

// ─── Deep linking (Stage 1) ──────────────────────────
// finmatrix://verify-email?token=...  → Email verification screen
// finmatrix://reset-password          → Forgot-password (OTP) screen
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['finmatrix://'],
  config: {
    screens: {
      EmailVerification: 'verify-email',
      ForgotPassword: 'reset-password',
    },
  },
};

// Splash plays only once per app cold start (module-level flag survives
// AppContainer remounts, resets on process restart).
let splashHasPlayed = false;

export const AppContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAppReady = useAppSelector(selectIsAppReady);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const [showSplash, setShowSplash] = React.useState(!splashHasPlayed);

  // ─── Session restore on cold start (Consultant_Mobile fetchMe pattern):
  // stored token → GET /auth/me refreshes the user and the app opens on
  // their view; missing/invalid token → sign-in. Sets isAppReady when done.
  useEffect(() => {
    dispatch(bootstrapSession());
  }, [dispatch]);

  // ─── Session-expired bridge: when the axios 401-refresh flow gives up it
  // has already cleared the stored tokens; this handler resets the store so
  // the navigator switches back to sign-in instead of leaving the user on
  // authenticated screens whose every request fails.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      dispatch(signOut());
      Toast.show({
        type: 'info',
        text1: 'Session expired',
        text2: 'Please sign in again.',
      });
    });
    return () => setSessionExpiredHandler(null);
  }, [dispatch]);

  // ─── Company-status-stale bridge: a business request 403'd with
  // COMPANY_NOT_ACTIVE (subscription expired mid-session, account
  // deactivated, …). Re-run the session bootstrap — /auth/me returns the
  // fresh companyStatus, setUser updates Redux, and renderNavigator swaps to
  // the matching gate (RenewSubscription for inactive). Debounced: a screen
  // firing several requests at once must trigger only one refresh.
  const statusRefreshAt = React.useRef(0);
  useEffect(() => {
    setCompanyStatusStaleHandler(() => {
      const now = Date.now();
      if (now - statusRefreshAt.current < 5000) return;
      statusRefreshAt.current = now;
      dispatch(bootstrapSession());
    });
    return () => setCompanyStatusStaleHandler(null);
  }, [dispatch]);

  // ─── Clear auth form slices when user becomes authenticated ──
  useEffect(() => {
    if (isAuthenticated && user) {
      dispatch(resetSignInForm());
      dispatch(resetSignUpForm());
      dispatch(resetForgotPasswordForm());
      dispatch(resetVerificationForm());
    }
  }, [isAuthenticated, user, dispatch]);

  // ─── Which top-level navigator mounts (was BaseNavigator's role switch).
  // Role first (riders/super-admins have no company gates); an approved,
  // email-verified admin gets their tier's app; every other state —
  // unauthenticated, email verify, pending, inactive, rejected, draft,
  // onboarding — is a session gate handled inside BaseNavigator.
  const renderNavigator = () => {
    if (!isAuthenticated || !user) {
      return <BaseNavigator key="base-unauthenticated" />;
    }
    if (user.role === 'super_admin') {
      return <SuperAdminNavigator key="super-admin" />;
    }
    if (user.role === 'delivery') {
      return <DeliveryTabNavigator key="delivery" />;
    }

    const companyStatus = user.companyStatus ?? null;
    const emailVerified = user.isEmailVerified !== false; // default true (legacy)
    const isApproved =
      companyStatus === 'approved' || companyStatus === 'active';

    if (emailVerified && isApproved) {
      // ── Three-tier model (FinMatrix.md): small_business / large_org mount
      // their own navigators; warehouse and legacy (no companyType) keep the
      // full AdminTabNavigator. Server-side FeatureGuard 403s remain the real
      // enforcement — this is the matching UX.
      switch (user.companyType ?? null) {
        case 'small_business':
          return <SmallBusinessNavigator key="tier-small-business" />;
        case 'large_org':
          return <LargeOrgNavigator key="tier-large-org" />;
        default:
          return <AdminTabNavigator key="tier-admin" />;
      }
    }

    return <BaseNavigator key="base-gates" />;
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.container}>
        {isAppReady ? (
          <NavigationContainer linking={linking}>
            {renderNavigator()}
          </NavigationContainer>
        ) : (
          // Session restore still in flight after the splash finished.
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        {showSplash && (
          <SplashOverlay
            onFinish={() => {
              splashHasPlayed = true;
              setShowSplash(false);
            }}
          />
        )}
      </View>
      <Toast />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default AppContainer;
