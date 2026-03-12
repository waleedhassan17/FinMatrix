import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../hooks/useReduxHooks';
import { selectActiveCompany } from '../screens/Auth/companySlice';
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
import DeliveryOnboardingScreen from '../screens/Auth/DeliveryOnboarding/DeliveryOnboardingScreen';

// Tab Navigators
import AdminTabNavigator from './AdminTabNavigator';
import DeliveryTabNavigator from './DeliveryTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

const BaseNavigator: React.FC = () => {
  const { isAuthenticated, hasSeenOnboarding, hasSeenDeliveryOnboarding, user } = useAppSelector(
    state => state.auth,
  );
  const activeCompany = useAppSelector(selectActiveCompany);

  // ─── Auth Flow Logic ─────────────────────────────────
  // 1. Not seen onboarding → Onboarding
  // 2. Not authenticated → RoleSelection → Sign In/Up
  // 3. Authenticated + delivery role → DeliveryOnboarding / DeliveryTabs
  // 4. Authenticated, no company → CompanySetup
  // 5. Authenticated + company → AdminTabs

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // ── Unauthenticated Flow ──
        <>
          {!hasSeenOnboarding && (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )}
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
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
        </>
      ) : user?.role === 'delivery' ? (
        // ── Delivery Personnel (skip CompanySetup) ──
        <>
          {!hasSeenDeliveryOnboarding && (
            <Stack.Screen
              name="DeliveryOnboarding"
              component={DeliveryOnboardingScreen}
            />
          )}
          <Stack.Screen
            name="DeliveryTabs"
            component={DeliveryTabNavigator}
          />
        </>
      ) : !activeCompany ? (
        // ── Authenticated admin but no company ──
        <>
          <Stack.Screen name="CompanySetup" component={CompanySetupScreen} />
          <Stack.Screen name="CreateCompany" component={CreateCompanyScreen} />
          <Stack.Screen name="JoinCompany" component={JoinCompanyScreen} />
        </>
      ) : (
        // ── Admin ──
        <>
          <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default BaseNavigator;
