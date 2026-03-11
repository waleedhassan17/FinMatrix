import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CustomInput from '../../../Custom-Components/CustomInput';
import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { ROUTES } from '../../../navigations-map/Base';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser } from '../authSlice';
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
import type { RootStackParamList } from '../../../types';

// ── Design Tokens ──
const BRAND = {
  navy: '#0F172A',
  navyLight: '#1E293B',
  emerald: '#059669',
  emeraldLight: '#10B981',
};

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const SignUpScreen: React.FC<Props> = ({ navigation, route }) => {
  const { role } = route.params;
  const dispatch = useAppDispatch();

  const fullName = useAppSelector(selectSignUpFullName);
  const email = useAppSelector(selectSignUpEmail);
  const phone = useAppSelector(selectSignUpPhone);
  const password = useAppSelector(selectSignUpPassword);
  const confirmPassword = useAppSelector(selectSignUpConfirmPassword);
  const acceptedTerms = useAppSelector(selectSignUpAcceptedTerms);
  const status = useAppSelector(selectSignUpStatus);
  const signUpError = useAppSelector(selectSignUpError);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const passwordStrength =
    password.length > 0 ? getPasswordStrength(password) : null;
  const strengthInfo = passwordStrength
    ? strengthConfig[passwordStrength]
    : null;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ── Progress calculation ──
  const filledFields = [fullName, email, phone, password, confirmPassword].filter(
    v => v.length > 0,
  ).length;
  const progressPercent = Math.min((filledFields / 5) * 100, 100);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
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
          fullName: fullName.trim(), email: email.trim(), phone, password,
        }),
      ).unwrap();
      dispatch(setUser(user));
    } catch {
      // Handled by slice
    }
  };

  const clearField = (field: string) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.flex} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* ── Fixed Header ── */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <View style={styles.backIconContainer}>
                <Text style={styles.backArrow}>{'‹'}</Text>
              </View>
            </TouchableOpacity>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
            </View>

            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* ── Title ── */}
            <Animated.View style={[styles.titleSection, { opacity: fadeAnim }]}>
              <View style={styles.roleRow}>
                <View
                  style={[styles.roleDot, { backgroundColor: BRAND.navy }]}
                />
                <Text style={styles.roleLabelText}>Administrator</Text>
              </View>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>
                Start managing your business finances
              </Text>
            </Animated.View>

            {/* ── Form ── */}
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <CustomInput
                label="Full Name"
                value={fullName}
                onChangeText={text => { dispatch(setFullName(text)); clearField('fullName'); }}
                placeholder="John Doe"
                error={errors.fullName}
              />

              <CustomInput
                label="Email Address"
                value={email}
                onChangeText={text => { dispatch(setSignUpEmail(text)); clearField('email'); }}
                placeholder="name@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />

              <CustomInput
                label="Phone Number"
                value={phone}
                onChangeText={text => { dispatch(setPhone(text)); clearField('phone'); }}
                placeholder="+92 3XX XXXXXXX"
                keyboardType="phone-pad"
                error={errors.phone}
              />

              <CustomInput
                label="Password"
                value={password}
                onChangeText={text => { dispatch(setSignUpPassword(text)); clearField('password'); }}
                placeholder="Minimum 6 characters"
                secureTextEntry
                error={errors.password}
              />

              {/* Password Strength */}
              {passwordStrength && strengthInfo && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBarBg}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        {
                          width: strengthInfo.width as `${number}%`,
                          backgroundColor: strengthInfo.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strengthInfo.color }]}>
                    {strengthInfo.label}
                  </Text>
                </View>
              )}

              <CustomInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={text => { dispatch(setConfirmPassword(text)); clearField('confirmPassword'); }}
                placeholder="Re-enter your password"
                secureTextEntry
                error={errors.confirmPassword}
              />

              {/* ── Terms ── */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => { dispatch(setAcceptedTerms(!acceptedTerms)); clearField('acceptedTerms'); }}
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.checkbox,
                    acceptedTerms && {
                      backgroundColor: BRAND.navy,
                      borderColor: BRAND.navy,
                    },
                  ]}>
                  {acceptedTerms && (
                    <Text style={styles.checkmark}>{'\u2713'}</Text>
                  )}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' and '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {errors.acceptedTerms ? (
                <Text style={styles.termsError}>{errors.acceptedTerms}</Text>
              ) : null}

              {/* Error */}
              {signUpError ? (
                <View style={styles.errorBox}>
                  <View style={styles.errorDot} />
                  <Text style={styles.errorBoxText}>{signUpError}</Text>
                </View>
              ) : null}

              {/* CTA */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSignUp}
                activeOpacity={0.85}
                disabled={status === 'loading'}>
                <Text style={styles.primaryButtonText}>
                  {status === 'loading' ? 'Creating...' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              {/* Bottom */}
              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate(ROUTES.SIGN_IN, { role })}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <Text style={styles.bottomLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {},
  backIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#0F172A',
    fontWeight: '300',
    marginTop: -1,
  },
  progressContainer: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: BRAND.navy,
    borderRadius: 2,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // Title
  titleSection: {
    paddingTop: 24,
    marginBottom: 24,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  roleLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    fontFamily: typography.fontFamily,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: typography.fontFamily,
  },

  // Strength
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 16,
    gap: 10,
  },
  strengthBarBg: {
    flex: 1,
    height: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 50,
    fontFamily: typography.fontFamily,
  },

  // Terms
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    marginTop: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    fontFamily: typography.fontFamily,
  },
  termsLink: {
    fontWeight: '600',
    color: '#0F172A',
  },
  termsError: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 12,
    marginLeft: 28,
    fontFamily: typography.fontFamily,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 10,
  },
  errorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  errorBoxText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    fontFamily: typography.fontFamily,
    lineHeight: 18,
  },

  // Primary Button
  primaryButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: BRAND.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
    letterSpacing: 0.2,
  },

  // Bottom
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bottomText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: typography.fontFamily,
  },
  bottomLink: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.navy,
    fontFamily: typography.fontFamily,
  },
});

export default SignUpScreen;