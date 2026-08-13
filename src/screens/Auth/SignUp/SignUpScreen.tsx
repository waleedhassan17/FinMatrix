// ═══════════════════════════════════════════════════════
// FinMatrix — Create Account
// ═══════════════════════════════════════════════════════
// Admin signup. On success the account exists but is unverified, so the user
// is handed to the email-verification gate with their address.

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ROUTES } from '../../../navigations-maps/Base';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setPendingUser, selectSelectedRole } from '../authSlice';
import {
  setFullName,
  setSignUpEmail,
  setPhone,
  setSignUpPassword,
  setConfirmPassword,
  setAcceptedTerms,
  clearSignUpError,
  submitSignUpAsync,
  selectSignUpFullName,
  selectSignUpEmail,
  selectSignUpPhone,
  selectSignUpPassword,
  selectSignUpConfirmPassword,
  selectSignUpAcceptedTerms,
  selectSignUpStatus,
  selectSignUpError,
} from './signUpSlice';
import {
  validateSignUp,
  getPasswordStrength,
  strengthConfig,
} from '../../../models/authModel';
import type { RootStackParamList, UserRole } from '../../../types';
import {
  AuthScreen,
  AuthBrand,
  AuthBackLink,
  AuthHeading,
  AuthField,
  AuthPrimaryButton,
  AuthTextLink,
  AuthFooter,
  InlineBanner,
  AUTH,
} from '../../../components/auth/AuthUI';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const SignUpScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  // Same guard as SignInScreen — never assume route.params exists (see the
  // note on RootStackParamList.SignIn).
  const selectedRole = useAppSelector(selectSelectedRole);
  const role: UserRole = route.params?.role ?? selectedRole ?? 'admin';

  const fullName = useAppSelector(selectSignUpFullName);
  const email = useAppSelector(selectSignUpEmail);
  const phone = useAppSelector(selectSignUpPhone);
  const password = useAppSelector(selectSignUpPassword);
  const confirmPassword = useAppSelector(selectSignUpConfirmPassword);
  const acceptedTerms = useAppSelector(selectSignUpAcceptedTerms);
  const status = useAppSelector(selectSignUpStatus);
  const signUpError = useAppSelector(selectSignUpError);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  // useMemo, not useRef: reading .current during render is what the React
  // refs lint rule forbids, and the value is create-once either way.
  const shakeAnim = useMemo(() => new Animated.Value(0), []);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleSignUp = async () => {
    dispatch(clearSignUpError());
    const validationErrors = validateSignUp({
      fullName, email, phone, password, confirmPassword, acceptedTerms,
    });
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      triggerShake();
      return;
    }

    try {
      const user = await dispatch(
        submitSignUpAsync({
          fullName: fullName.trim(),
          email: email.trim(),
          phone,
          password,
        }),
      ).unwrap();
      dispatch(setPendingUser(user));
      navigation.navigate(ROUTES.EMAIL_VERIFICATION as any, { email: email.trim() });
    } catch {
      /* handled by slice */
    }
  };

  const clear = (field: string) => {
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  const isLoading = status === 'loading';
  const strength = password ? getPasswordStrength(password) : null;
  const strengthMeta = strength ? strengthConfig[strength] : null;

  return (
    <AuthScreen>
      <AuthBrand />
      <AuthBackLink onPress={() => navigation.goBack()} />

      <AuthHeading
        title="Create your account"
        subtitle="Start managing your business finances with confidence."
      />

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        {signUpError ? (
          <InlineBanner
            tone="error"
            title="Registration error"
            message={signUpError}
            style={s.banner}
          />
        ) : null}

        <AuthField
          label="Full name"
          value={fullName}
          onChangeText={t => {
            dispatch(setFullName(t));
            clear('fullName');
          }}
          placeholder="Your full name"
          autoCapitalize="words"
          error={errors.fullName}
        />

        <AuthField
          label="Email address"
          value={email}
          onChangeText={t => {
            dispatch(setSignUpEmail(t));
            clear('email');
          }}
          placeholder="name@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email}
        />

        <AuthField
          label="Phone number"
          value={phone}
          onChangeText={t => {
            dispatch(setPhone(t));
            clear('phone');
          }}
          placeholder="0312 3456789"
          keyboardType="phone-pad"
          error={errors.phone}
          hint={errors.phone ? undefined : 'Optional'}
        />

        <AuthField
          label="Password"
          value={password}
          onChangeText={t => {
            dispatch(setSignUpPassword(t));
            clear('password');
          }}
          placeholder="Create a password"
          secure
          autoCapitalize="none"
          error={errors.password}
        />

        {/* Strength is a thin rule with a label, not a coloured bar chart. */}
        {password && strengthMeta ? (
          <View style={s.strength}>
            <View style={s.strengthTrack}>
              <View
                style={[
                  s.strengthFill,
                  {
                    width: strengthMeta.width as never,
                    backgroundColor: strengthMeta.color,
                  },
                ]}
              />
            </View>
            <Text style={[s.strengthLabel, { color: strengthMeta.color }]}>
              {strengthMeta.label}
            </Text>
          </View>
        ) : null}

        <AuthField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={t => {
            dispatch(setConfirmPassword(t));
            clear('confirmPassword');
          }}
          placeholder="Re-enter your password"
          secure
          autoCapitalize="none"
          error={errors.confirmPassword}
          onSubmitEditing={handleSignUp}
          returnKeyType="go"
        />

        <Pressable
          style={s.termsRow}
          onPress={() => {
            dispatch(setAcceptedTerms(!acceptedTerms));
            clear('acceptedTerms');
          }}
          hitSlop={6}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}>
          <View style={[s.checkbox, acceptedTerms && s.checkboxOn]}>
            {acceptedTerms ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
          </View>
          <Text style={s.termsText}>
            I agree to the <Text style={s.termsStrong}>Terms of Service</Text> and{' '}
            <Text style={s.termsStrong}>Privacy Policy</Text>
          </Text>
        </Pressable>
        {errors.acceptedTerms ? (
          <Text style={s.termsError}>{errors.acceptedTerms}</Text>
        ) : null}

        <AuthPrimaryButton
          label="Create Account"
          loading={isLoading}
          loadingLabel="Creating account"
          onPress={handleSignUp}
          style={s.cta}
        />

        <View style={s.bottomRow}>
          <Text style={s.bottomText}>Already have an account? </Text>
          <AuthTextLink
            label="Sign in"
            onPress={() => navigation.navigate(ROUTES.SIGN_IN, { role })}
            align="left"
            style={s.inlineLink}
          />
        </View>
      </Animated.View>

      <AuthFooter />
    </AuthScreen>
  );
};

const s = StyleSheet.create({
  banner: { marginBottom: AUTH.space.lg },

  strength: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AUTH.space.md,
    marginTop: -AUTH.space.sm,
    marginBottom: AUTH.space.lg,
  },
  strengthTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: AUTH.line.DEFAULT,
    overflow: 'hidden',
  },
  strengthFill: { height: 3, borderRadius: 2 },
  strengthLabel: { ...AUTH.type.caption, fontWeight: '600' },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AUTH.space.md,
    marginBottom: AUTH.space.lg,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: AUTH.radius.sm - 2,
    borderWidth: 1,
    borderColor: AUTH.line.strong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: AUTH.brand.DEFAULT,
    borderColor: AUTH.brand.DEFAULT,
  },
  termsText: { ...AUTH.type.small, color: AUTH.ink[600], flex: 1, lineHeight: 20 },
  termsStrong: { color: AUTH.ink[900], fontWeight: '600' },
  termsError: {
    ...AUTH.type.caption,
    color: AUTH.status.error.fg,
    marginTop: -AUTH.space.sm,
    marginBottom: AUTH.space.md,
  },

  cta: { marginTop: AUTH.space.xs },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: AUTH.space.lg,
  },
  bottomText: { ...AUTH.type.small, color: AUTH.ink[500] },
  inlineLink: { paddingVertical: 0 },
});

export default SignUpScreen;
