// ═══════════════════════════════════════════════════════
// FinMatrix — Sign In
// ═══════════════════════════════════════════════════════
// Serves all three portals (models/signInPortalModel). The Business Portal
// signs in with an email; the Staff and Delivery Portals with the username the
// company issued. The portal is posted with the credentials and the server
// refuses an account that belongs on another door (WRONG_PORTAL) before any
// token exists — the notice then names the right door and switches to it in
// one tap, carrying what was typed. The server's other gate codes (unverified
// email, pending/rejected/inactive company) route to the matching screen
// rather than surfacing as a generic error.

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ROUTES } from '../../../navigations-maps/Base';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser, selectSelectedRole, setSelectedRole } from '../authSlice';
import { setRole } from '../../RoleSelection/roleSelectionSlice';
import {
  setEmail,
  setUsername,
  setPassword,
  setRememberMe,
  clearSignInError,
  submitSignInAsync,
  submitDeliverySignInAsync,
  selectSignInEmail,
  selectSignInUsername,
  selectSignInPassword,
  selectSignInRememberMe,
  selectSignInStatus,
  selectSignInError,
  selectSignInErrorCode,
  selectWrongPortalAccount
} from './signInSlice';
import {
  SIGN_IN_PORTALS,
  portalForRole,
  wrongPortalNotice,
  type SignInPortal,
} from '../../../models/signInPortalModel';
import { validateSignIn, validateDeliverySignIn } from '../../../models/authModel';
import type { RootStackParamList } from '../../../types';
import { THEME } from '../../../theme';

// Design-system tokens (see src/theme/theme.ts).
const { colors } = THEME;
import {
  AuthLayout,
  AuthHeader,
  AuthFooterBar,
  AuthField,
  AuthNotice,
  AuthHelpCard,
  AuthPrompt,
  AUTH
} from '../../../components/auth/AuthUI';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const SignInScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  // Never destructure route.params directly: screens that send the user back
  // here (password reset, "Back to Sign In") pass no params, and RN v7 pushes
  // a fresh route rather than reusing the one RoleSelection created. Fall back
  // to the portal the user picked on RoleSelection so a rider isn't silently
  // moved to the Business Portal.
  const selectedRole = useAppSelector(selectSelectedRole);
  const portal: SignInPortal = portalForRole(route.params?.role ?? selectedRole);
  const door = SIGN_IN_PORTALS[portal];
  const isUsernamePortal = door.credential === 'username';

  const email = useAppSelector(selectSignInEmail);
  const username = useAppSelector(selectSignInUsername);
  const password = useAppSelector(selectSignInPassword);
  const rememberMe = useAppSelector(selectSignInRememberMe);
  const status = useAppSelector(selectSignInStatus);
  const signInError = useAppSelector(selectSignInError);
  const signInErrorCode = useAppSelector(selectSignInErrorCode);
  const wrongPortalAccount = useAppSelector(selectWrongPortalAccount);

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // useMemo, not useRef: reading .current during render is what the React
  // refs lint rule forbids, and the value is create-once either way.
  const shakeAnim = useMemo(() => new Animated.Value(0), []);

  // Back to the door choice. A route pushed fresh (after a password reset)
  // has nothing under it, so it goes to RoleSelection by name.
  const handleBack = () => {
    dispatch(clearSignInError());
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate(ROUTES.ROLE_SELECTION);
  };

  // A short nudge on validation failure — the one motion in the flow, and it
  // carries meaning rather than decorating the entrance.
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleSignIn = async () => {
    dispatch(clearSignInError());

    if (isUsernamePortal) {
      const validationErrors = validateDeliverySignIn({ username, password });
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) {
        triggerShake();
        return;
      }
      try {
        const user = await dispatch(
          submitDeliverySignInAsync({
            username: username.trim(),
            password,
            portal: portal === 'delivery' ? 'delivery' : 'staff',
          }),
        ).unwrap();
        dispatch(setUser(user));
      } catch {
        /* handled by slice */
      }
      return;
    }

    const validationErrors = validateSignIn({ email, password });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      triggerShake();
      return;
    }
    try {
      const user = await dispatch(
        submitSignInAsync({ email: email.trim(), password }),
      ).unwrap();
      dispatch(setUser(user));
    } catch (err) {
      const e = err as {
        code?: string;
        rejectionReason?: string | null;
        pendingKind?: 'trial' | 'payment' | null;
      };
      // Route the server's gate codes to the screen that explains them.
      if (e?.code === 'EMAIL_NOT_VERIFIED') {
        navigation.navigate('EmailVerification', { email: email.trim() });
      } else if (e?.code === 'COMPANY_PENDING') {
        navigation.navigate('PendingApproval', {
          fromLogin: true,
          pendingKind: e?.pendingKind ?? undefined,
        });
      } else if (e?.code === 'COMPANY_INACTIVE') {
        navigation.navigate('CompanyRejected', { fromLogin: true, mode: 'inactive' });
      } else if (e?.code === 'COMPANY_REJECTED') {
        navigation.navigate('CompanyRejected', {
          fromLogin: true,
          mode: 'rejected',
          reason: e?.rejectionReason ?? undefined,
        });
      }
      /* other errors handled by slice */
    }
  };

  const isLoading = status === 'loading';

  // The password was right but the account belongs on another door. Switch to
  // it here rather than sending the user back to RoleSelection, carrying what
  // they typed: an owner who typed their email on the Staff Portal lands on
  // the Business Portal with it already in the email field.
  const wrongPortal =
    signInErrorCode === 'WRONG_PORTAL' ? wrongPortalNotice(wrongPortalAccount) : null;
  const switchPortal = (target: SignInPortal) => {
    const typed = (isUsernamePortal ? username : email).trim();
    if (SIGN_IN_PORTALS[target].credential === 'email') {
      if (typed.includes('@')) dispatch(setEmail(typed));
    } else if (!typed.includes('@')) {
      dispatch(setUsername(typed));
    }
    dispatch(setRole(target));
    dispatch(setSelectedRole(target));
    dispatch(clearSignInError());
    setErrors({});
    navigation.setParams({ role: target });
  };

  return (
    <AuthLayout
      header={
        <AuthHeader
          pill={door.title}
          title="Welcome back"
          subtitle={door.signInSubtitle}
          onBack={handleBack}
        />
      }
      footer={
        <AuthFooterBar
          primary={{
            label: 'Sign In',
            onPress: handleSignIn,
            loading: isLoading,
            loadingLabel: 'Signing in',
          }}
          note="256-bit SSL encrypted connection"
        />
      }>
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        {wrongPortal ? (
          <AuthNotice
            tone="warning"
            icon="alert-triangle"
            title={wrongPortal.title}
            message={wrongPortal.message}
            action={
              wrongPortal.switchTo && wrongPortal.switchLabel
                ? {
                    label: wrongPortal.switchLabel,
                    onPress: () => switchPortal(wrongPortal.switchTo as SignInPortal),
                  }
                : undefined
            }
          />
        ) : signInError ? (
          <AuthNotice
            tone={signInErrorCode === 'RATE_LIMITED' ? 'warning' : 'error'}
            title={signInErrorCode === 'RATE_LIMITED' ? 'Please wait' : 'Authentication failed'}
            message={signInError}
          />
        ) : null}

        {isUsernamePortal ? (
          <AuthField
            label="Username"
            value={username}
            onChangeText={t => {
              dispatch(setUsername(t));
              if (errors.username) setErrors(p => ({ ...p, username: '' }));
            }}
            placeholder="Enter your username"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.username}
          />
        ) : (
          <AuthField
            label="Email address"
            value={email}
            onChangeText={t => {
              dispatch(setEmail(t));
              if (errors.email) setErrors(p => ({ ...p, email: '' }));
            }}
            placeholder="name@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
          />
        )}

        <AuthField
          label="Password"
          value={password}
          onChangeText={t => {
            dispatch(setPassword(t));
            if (errors.password) setErrors(p => ({ ...p, password: '' }));
          }}
          placeholder="Enter your password"
          secure
          autoCapitalize="none"
          error={errors.password}
          onSubmitEditing={handleSignIn}
          returnKeyType="go"
        />

        <View style={s.optRow}>
          <Pressable
            style={s.remRow}
            onPress={() => dispatch(setRememberMe(!rememberMe))}
            hitSlop={6}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rememberMe }}>
            <View style={[s.checkbox, rememberMe && s.checkboxOn]}>
              {rememberMe ? <Feather name="check" size={12} color={colors.neutral0} /> : null}
            </View>
            <Text style={s.remLabel}>Remember me</Text>
          </Pressable>

          {!isUsernamePortal && (
            <Text
              style={s.link}
              onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
              accessibilityRole="button">
              Forgot password?
            </Text>
          )}
        </View>

        {/* Staff and rider accounts have no inbox to reset through: only the
            owner can reset them (AuthService.forgotPassword refuses them), so
            say who to ask instead of offering a link that would fail. */}
        {isUsernamePortal ? (
          <View style={s.helpGap}>
            <AuthHelpCard message="Forgot your username or password? Ask your company's FinMatrix administrator to reset it." />
          </View>
        ) : (
          <AuthPrompt
            text="Don't have an account?"
            action="Create account"
            onPress={() => navigation.navigate(ROUTES.SIGN_UP, { role: portal })}
            style={s.bottomRow}
          />
        )}
      </Animated.View>
    </AuthLayout>
  );
};

const s = StyleSheet.create({
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -AUTH.space.xs,
  },
  remRow: { flexDirection: 'row', alignItems: 'center', gap: AUTH.space.md },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: AUTH.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: AUTH.brand, borderColor: AUTH.brand },
  remLabel: { ...THEME.typography.bodySm, fontFamily: AUTH.font, color: AUTH.ink[700] },
  link: {
    ...THEME.typography.h5,
    fontFamily: AUTH.font,
    color: AUTH.brand,
  },
  bottomRow: { marginTop: AUTH.space.xxl },
  helpGap: { marginTop: AUTH.space.xxl }
});

export default SignInScreen;
