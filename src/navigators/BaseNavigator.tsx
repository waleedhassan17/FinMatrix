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

// Splash Overlay
import SplashOverlay from '../screens/Splash/SplashScreen';

// Tab Navigators
import AdminTabNavigator from './AdminTabNavigator';
import DeliveryTabNavigator from './DeliveryTabNavigator';

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

  // ─── Auth Flow Logic ─────────────────────────────────
  // 1. Not seen onboarding → Onboarding
  // 2. Not authenticated → RoleSelection → Sign In/Up
  // 3. Authenticated + delivery role → DeliveryTabs
  // 4. Authenticated, no company → CompanySetup
  // 5. Authenticated + company → AdminTabs

  return (
    <View style={styles.container}>
      <Stack.Navigator
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
          </>
        ) : isDeliveryUser ? (
          // ── Delivery Personnel (skip CompanySetup) ──
          <>
            <Stack.Screen
              name="DeliveryTabs"
              component={DeliveryTabNavigator}
              options={{ animation: 'none' }}
            />
          </>
        ) : (
          // ── Admin Flow ──
          <>
            {hasCompany ? (
              <Stack.Screen
                name="AdminTabs"
                component={AdminTabNavigator}
                options={{ animation: 'none' }}
              />
            ) : (
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
                  name="AdminTabs"
                  component={AdminTabNavigator}
                  options={{ animation: 'none' }}
                />
              </>
            )}
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
