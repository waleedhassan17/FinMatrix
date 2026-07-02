import React, { useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../hooks/useReduxHooks';
import type { RootStackParamList } from '../types';

// Screens — Auth
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import RoleSelectionScreen from '../screens/RoleSelection/RoleSelectionScreen';
import SignInScreen from '../screens/Auth/SignIn/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUp/SignUpScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPassword/ForgotPasswordScreen';
import EmailVerificationScreen from '../screens/Auth/EmailVerification/EmailVerificationScreen';
import CompanySetupScreen from '../screens/Auth/CompanySetup/CompanySetupScreen';
import CreateCompanyScreen from '../screens/Auth/CreateCompany/CreateCompanyScreen';
import JoinCompanyScreen from '../screens/Auth/JoinCompany/JoinCompanyScreen';
import SubscriptionSelectScreen from '../screens/Auth/SubscriptionSelect/SubscriptionSelectScreen';
import PendingApprovalScreen from '../screens/Auth/PendingApproval/PendingApprovalScreen';
import CompanyRejectedScreen from '../screens/Auth/CompanyRejected/CompanyRejectedScreen';
import RenewSubscriptionScreen from '../screens/Subscription/RenewSubscriptionScreen';
import SubscriptionPayScreen from '../screens/Subscription/SubscriptionPayScreen';

// Splash Overlay
import SplashOverlay from '../screens/Splash/SplashScreen';

// Tab Navigators
import AdminTabNavigator from './AdminTabNavigator';
import DeliveryTabNavigator from './DeliveryTabNavigator';
import SuperAdminNavigator from './SuperAdminNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Module-level flag: splash plays only once per app cold start
let splashHasPlayed = false;

const BaseNavigator: React.FC = () => {
  const shouldShowSplash = useRef(!splashHasPlayed).current;
  const [showSplash, setShowSplash] = useState(shouldShowSplash);
  const { isAuthenticated, hasSeenOnboarding, user } = useAppSelector(
    state => state.auth,
  );
  const hasCompany = Boolean(user?.companyId);
  const isDeliveryUser = user?.role === 'delivery';
  const isSuperAdmin = user?.role === 'super_admin';

  // ─── Stage 1: company-admin onboarding/approval gate ───
  const companyStatus = user?.companyStatus ?? null;
  const emailVerified = user?.isEmailVerified !== false; // default true (legacy)
  const isApproved =
    companyStatus === 'approved' || companyStatus === 'active';
  const isPending =
    companyStatus === 'pending_approval' || companyStatus === 'pending';
  const isRejected = companyStatus === 'rejected';
  // Mid-session deactivation (server sets status → inactive) routes the user out.
  const isInactive = companyStatus === 'inactive' || companyStatus === 'suspended';
  // A created-but-not-submitted company resumes at plan selection + submit.
  const isDraftCompany = hasCompany && companyStatus === 'email_verified';

  return (
    <View style={styles.container}>
      <Stack.Navigator
        id="BaseNavigator"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F8FAFC' },
          animation: 'none',
        }}>
        {!isAuthenticated ? (
          // ── Unauthenticated Flow ──
          <>
            {!hasSeenOnboarding && (
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ animation: 'none' }}
              />
            )}
            <Stack.Screen
              name="RoleSelection"
              component={RoleSelectionScreen}
              options={{ animation: 'none' }}
            />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
            <Stack.Screen
              name="EmailVerification"
              component={EmailVerificationScreen}
            />
            {/* Reachable from SignIn when the server blocks a non-active login. */}
            <Stack.Screen
              name="PendingApproval"
              component={PendingApprovalScreen}
            />
            <Stack.Screen
              name="CompanyRejected"
              component={CompanyRejectedScreen}
            />
          </>
        ) : isSuperAdmin ? (
          // ── Super Admin → Platform Control Panel ──
          <>
            <Stack.Screen
              name="SuperAdminTabs"
              component={SuperAdminNavigator}
              options={{ animation: 'none' }}
            />
          </>
        ) : isDeliveryUser ? (
          // ── Delivery Personnel → straight to home ──
          <>
            <Stack.Screen
              name="DeliveryTabs"
              component={DeliveryTabNavigator}
              options={{ animation: 'none' }}
            />
          </>
        ) : !emailVerified ? (
          // ── Admin: email not verified ──
          <>
            <Stack.Screen
              name="EmailVerification"
              component={EmailVerificationScreen}
              options={{ animation: 'none' }}
            />
          </>
        ) : isPending ? (
          // ── Admin: company submitted, awaiting approval ──
          <>
            <Stack.Screen
              name="PendingApproval"
              component={PendingApprovalScreen}
              options={{ animation: 'none' }}
            />
          </>
        ) : isInactive ? (
          // ── Admin: subscription expired / account deactivated → renew-only ──
          // (phase2.md Flow 2) The ONLY reachable screens are the renew flow;
          // every business screen stays blocked. Renewing restores the exact
          // same data on approval.
          <>
            <Stack.Screen
              name="RenewSubscription"
              component={RenewSubscriptionScreen}
              options={{ animation: 'none' }}
              initialParams={{ mode: 'renew' }}
            />
            <Stack.Screen name="SubscriptionPay" component={SubscriptionPayScreen} />
          </>
        ) : isRejected ? (
          // ── Admin: company registration rejected ──
          <>
            <Stack.Screen
              name="CompanyRejected"
              component={CompanyRejectedScreen}
              options={{ animation: 'none' }}
              initialParams={{ mode: 'rejected' }}
            />
          </>
        ) : isApproved ? (
          // ── Admin: approved → full app ──
          <>
            <Stack.Screen
              name="AdminTabs"
              component={AdminTabNavigator}
              options={{ animation: 'none' }}
            />
          </>
        ) : isDraftCompany ? (
          // ── Admin: company drafted, resume at plan selection + submit ──
          <>
            <Stack.Screen
              name="SubscriptionSelect"
              component={SubscriptionSelectScreen}
              options={{ animation: 'none' }}
            />
            <Stack.Screen
              name="AdminTabs"
              component={AdminTabNavigator}
              options={{ animation: 'none' }}
            />
          </>
        ) : (
          // ── Admin: onboarding (no company yet) ──
          <>
            <Stack.Screen
              name="CompanySetup"
              component={CompanySetupScreen}
              options={{ animation: 'none' }}
            />
            <Stack.Screen
              name="CreateCompany"
              component={CreateCompanyScreen}
              options={{ animation: 'none' }}
            />
            <Stack.Screen
              name="JoinCompany"
              component={JoinCompanyScreen}
              options={{ animation: 'none' }}
            />
            <Stack.Screen
              name="SubscriptionSelect"
              component={SubscriptionSelectScreen}
            />
            <Stack.Screen
              name="AdminTabs"
              component={AdminTabNavigator}
              options={{ animation: 'none' }}
            />
          </>
        )}
      </Stack.Navigator>

      {showSplash && (
        <SplashOverlay
          onFinish={() => {
            splashHasPlayed = true;
            setShowSplash(false);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});

export default BaseNavigator;
