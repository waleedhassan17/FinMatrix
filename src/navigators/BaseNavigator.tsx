import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
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

// Splash Overlay
import SplashOverlay from '../screens/Splash/SplashScreen';

// Tab Navigators
import AdminTabNavigator from './AdminTabNavigator';
import DeliveryTabNavigator from './DeliveryTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

const BaseNavigator: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
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
    <View style={styles.container}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B1120' },
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

      {showSplash && <SplashOverlay onFinish={() => setShowSplash(false)} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
});

export default BaseNavigator;
