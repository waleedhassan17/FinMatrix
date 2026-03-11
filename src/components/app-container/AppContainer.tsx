// ═══════════════════════════════════════════════════════
// FinMatrix — Root AppContainer
// ═══════════════════════════════════════════════════════
// This is the top-level app shell rendered inside Provider/PersistGate.
// Handles: navigation container, status bar, network error overlay,
// app readiness, and toast notifications.

import React, { useEffect, useCallback } from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { colors } from '../../theme';
import BaseNavigator from '../../navigators/BaseNavigator';
import {
  setAppIsReady,
  selectIsAppReady,
  selectNetworkIsDown,
  setNetworkIsDown,
} from './appContainerSlice';
import {
  selectIsAuthenticated,
  selectUser,
} from '../../store/authSlice';
import { resetSignInForm } from '../../screens/Auth/SignIn/signInSlice';
import { resetSignUpForm } from '../../screens/Auth/SignUp/signUpSlice';
import { resetForgotPasswordForm } from '../../screens/Auth/ForgotPassword/forgotPasswordSlice';
import { resetVerificationForm } from '../../screens/Auth/EmailVerification/emailVerificationSlice';

export const AppContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAppReady = useAppSelector(selectIsAppReady);
  const networkIsDown = useAppSelector(selectNetworkIsDown);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentUser = useAppSelector(selectUser);

  // ─── Mark app ready once mounted (PersistGate already handles rehydration) ──
  useEffect(() => {
    dispatch(setAppIsReady(true));
  }, [dispatch]);

  // ─── Clear auth form slices when user becomes authenticated ──
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      dispatch(resetSignInForm());
      dispatch(resetSignUpForm());
      dispatch(resetForgotPasswordForm());
      dispatch(resetVerificationForm());
    }
  }, [isAuthenticated, currentUser, dispatch]);

  if (!isAppReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <NavigationContainer>
        <BaseNavigator />
      </NavigationContainer>
      <Toast />
    </SafeAreaProvider>
  );
};

export default AppContainer;
