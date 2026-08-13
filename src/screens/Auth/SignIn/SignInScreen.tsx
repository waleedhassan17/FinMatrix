// ═══════════════════════════════════════════════════════
// FinMatrix — Sign In
// ═══════════════════════════════════════════════════════
// Serves both portals: `role === 'delivery'` signs in with a username against
// the delivery endpoint, everyone else with an email. The server's gate codes
// (unverified email, pending/rejected/inactive company) route to the matching
// screen rather than surfacing as a generic error.

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ROUTES } from '../../../navigations-maps/Base';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser, selectSelectedRole } from '../authSlice';
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
} from './signInSlice';
import { validateSignIn, validateDeliverySignIn } from '../../../models/authModel';
import type { RootStackParamList, UserRole } from '../../../types';
import {
  AuthScreen,
  AuthBrand,
  AuthHeading,
  AuthField,
  AuthPrimaryButton,
  AuthTextLink,
  AuthFooter,
  InlineBanner,
  AUTH,
} from '../../../components/auth/AuthUI';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const SignInScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  // Never destructure route.params directly: screens that send the user back
  // here (password reset, "Back to Sign In") pass no params, and RN v7 pushes
  // a fresh route rather than reusing the one RoleSelection created. Fall back
  // to the role the user picked on RoleSelection so a delivery user isn't
  // silently downgraded to the admin portal.
  const selectedRole = useAppSelector(selectSelectedRole);
  const role: UserRole = route.params?.role ?? selectedRole ?? 'admin';

  const email = useAppSelector(selectSignInEmail);
  const username = useAppSelector(selectSignInUsername);
  const password = useAppSelector(selectSignInPassword);
  const rememberMe = useAppSelector(selectSignInRememberMe);
  const status = useAppSelector(selectSignInStatus);
  const signInError = useAppSelector(selectSignInError);

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // useMemo, not useRef: reading .current during render is what the React
  // refs lint rule forbids, and the value is create-once either way.
  const shakeAnim = useMemo(() => new Animated.Value(0), []);

  const isDelivery = role === 'delivery';
  const roleLabel = isDelivery ? 'Delivery Portal' : 'Business Portal';

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

    if (isDelivery) {
      const validationErrors = validateDeliverySignIn({ username, password });
      setErrors(validationErrors);
      if (Object.keys(validationErrors).length > 0) {
        triggerShake();
        return;
      }
      try {
        const user = await dispatch(
          submitDeliverySignInAsync({ username: username.trim(), password }),
        ).unwrap();
        dispatch(setUser(user));
      } catch {
        /* handled by slice */
      }
    } else {
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
        const e = err as { code?: string; rejectionReason?: string | null };
        // Route unverified company admins to the verification screen.
        if (e?.code === 'EMAIL_NOT_VERIFIED') {
          navigation.navigate('EmailVerification', { email: email.trim() });
        } else if (e?.code === 'COMPANY_PENDING') {
          navigation.navigate('PendingApproval', { fromLogin: true });
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
    }
  };

  const isLoading = status === 'loading';

  return (
    <AuthScreen>
      <View style={s.topRow}>
        <AuthBrand style={s.brandFlush} />
        <View style={s.rolePill}>
          <Text style={s.rolePillText}>{roleLabel}</Text>
        </View>
      </View>

      <AuthHeading
        title="Welcome back"
        subtitle={
          isDelivery
            ? 'Sign in with your company credentials'
            : 'Sign in to manage your business'
        }
      />

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        {signInError ? (
          <InlineBanner
            tone="error"
            title="Authentication failed"
            message={signInError}
            style={s.banner}
          />
        ) : null}

        {isDelivery ? (
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
              {rememberMe ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
            </View>
            <Text style={s.remLabel}>Remember me</Text>
          </Pressable>

          {!isDelivery && (
            <AuthTextLink
              label="Forgot password?"
              onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
              align="left"
              style={s.forgotLink}
            />
          )}
        </View>

        <AuthPrimaryButton
          label="Sign In"
          loading={isLoading}
          loadingLabel="Signing in"
          onPress={handleSignIn}
        />

        {!isDelivery && (
          <View style={s.bottomRow}>
            <Text style={s.bottomText}>Don&apos;t have an account? </Text>
            <AuthTextLink
              label="Create account"
              onPress={() => navigation.navigate(ROUTES.SIGN_UP, { role })}
              align="left"
              style={s.inlineLink}
            />
          </View>
        )}
      </Animated.View>

      <AuthFooter label="256-bit SSL encrypted connection" />
    </AuthScreen>
  );
};

const s = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AUTH.space.xxl,
  },
  brandFlush: { marginBottom: 0 },
  rolePill: {
    borderWidth: 1,
    borderColor: AUTH.line.DEFAULT,
    borderRadius: AUTH.radius.sm,
    paddingHorizontal: AUTH.space.sm,
    paddingVertical: 3,
  },
  rolePillText: {
    ...AUTH.type.caption,
    fontSize: 11,
    fontWeight: '600',
    color: AUTH.ink[500],
  },
  banner: { marginBottom: AUTH.space.lg },

  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AUTH.space.xl,
    marginTop: -AUTH.space.xs,
  },
  remRow: { flexDirection: 'row', alignItems: 'center', gap: AUTH.space.sm },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: AUTH.radius.sm - 2,
    borderWidth: 1,
    borderColor: AUTH.line.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: AUTH.brand.DEFAULT,
    borderColor: AUTH.brand.DEFAULT,
  },
  remLabel: { ...AUTH.type.small, color: AUTH.ink[600] },
  forgotLink: { paddingVertical: 0 },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: AUTH.space.lg,
  },
  bottomText: { ...AUTH.type.small, color: AUTH.ink[500] },
  inlineLink: { paddingVertical: 0 },
});

export default SignInScreen;
