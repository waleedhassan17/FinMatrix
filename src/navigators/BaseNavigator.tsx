import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../hooks/useReduxHooks';
import { colors, typography, spacing } from '../theme';
import type { RootStackParamList } from '../types';

// Screens — Real
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import RoleSelectionScreen from '../screens/RoleSelection/RoleSelectionScreen';
import SignInScreen from '../screens/Auth/SignIn/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUp/SignUpScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPassword/ForgotPasswordScreen';
import EmailVerificationScreen from '../screens/Auth/EmailVerification/EmailVerificationScreen';

// Placeholder screens for flows not yet built
const PlaceholderScreen: React.FC<{ name: string }> = ({ name }) => (
  <View style={placeholderStyles.container}>
    <Text style={placeholderStyles.title}>{name}</Text>
    <Text style={placeholderStyles.subtitle}>Coming in next prompt</Text>
  </View>
);

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
  },
});

// Placeholder wrappers (future prompts)
const CompanySetupScreen = () => <PlaceholderScreen name="Company Setup" />;
const CreateCompanyScreen = () => <PlaceholderScreen name="Create Company" />;
const JoinCompanyScreen = () => <PlaceholderScreen name="Join Company" />;
const DeliveryOnboardingScreen = () => <PlaceholderScreen name="Delivery Onboarding" />;
const AdminTabsPlaceholder = () => <PlaceholderScreen name="Admin Dashboard" />;
const DeliveryTabsPlaceholder = () => <PlaceholderScreen name="Delivery Dashboard" />;

const Stack = createNativeStackNavigator<RootStackParamList>();

const BaseNavigator: React.FC = () => {
  const { isAuthenticated, hasSeenOnboarding, user } = useAppSelector(
    state => state.auth,
  );
  const { company } = useAppSelector(state => state.company);

  // ─── Auth Flow Logic ─────────────────────────────────
  // 1. Not seen onboarding → Onboarding
  // 2. Not authenticated → RoleSelection → Sign In/Up
  // 3. Authenticated, no company → CompanySetup
  // 4. Authenticated + company → AdminTabs or DeliveryTabs based on role

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
      ) : !company ? (
        // ── Authenticated but no company ──
        <>
          <Stack.Screen name="CompanySetup" component={CompanySetupScreen} />
          <Stack.Screen name="CreateCompany" component={CreateCompanyScreen} />
          <Stack.Screen name="JoinCompany" component={JoinCompanyScreen} />
        </>
      ) : user?.role === 'delivery' ? (
        // ── Delivery Personnel ──
        <>
          <Stack.Screen
            name="DeliveryOnboarding"
            component={DeliveryOnboardingScreen}
          />
          <Stack.Screen
            name="DeliveryTabs"
            component={DeliveryTabsPlaceholder}
          />
        </>
      ) : (
        // ── Admin ──
        <Stack.Screen name="AdminTabs" component={AdminTabsPlaceholder} />
      )}
    </Stack.Navigator>
  );
};

export default BaseNavigator;
