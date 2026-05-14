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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import CustomInput from '../../../Custom-Components/CustomInput';
import { THEME } from '../../../utils/theme';
import { ROUTES } from '../../../navigations-map/Base';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setPendingUser } from '../authSlice';
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

// ═══════════════════════════════════════════════════════
// Design System
// ═══════════════════════════════════════════════════════
const DS = {
  navy900: '#0B1120',
  navy800: '#0F172A',
  navy700: '#1E293B',

  green500: '#059669',
  green400: '#00875A',
  green50: '#ECFDF5',

  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',

  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red500: '#DE350B',
  red700: '#B91C1C',
  red900: '#7F1D1D',

  amber500: '#FF991F',
  amber600: '#FF8B00',

  white: '#FFFFFF',

  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },

  shadowMd: {
    shadowColor: '#0B1120',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
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
  const slideAnim = useRef(new Animated.Value(20)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-12)).current;

  const passwordStrength = password.length > 0 ? getPasswordStrength(password) : null;
  const strengthInfo = passwordStrength ? strengthConfig[passwordStrength] : null;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(headerSlide, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [fadeAnim, slideAnim, headerFade, headerSlide]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
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

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={DS.navy900} />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}>

          {/* ═══════════════════════════════════
              HEADER — Gradient panel (matches SignIn)
             ═══════════════════════════════════ */}
          <LinearGradient
            colors={[DS.navy900, DS.navy800, DS.navy700]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={s.header}>

            <View style={[s.orb, s.orbTopRight]} />
            <View style={[s.orb, s.orbBottomLeft]} />

            <SafeAreaView edges={['top']} style={s.headerInner}>
              {/* Nav row */}
              <View style={s.navRow}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  activeOpacity={0.7}>
                  <View style={s.backBtn}>
                    <Text style={s.backIcon}>{'\u2190'}</Text>
                  </View>
                </TouchableOpacity>

                <View style={s.rolePill}>
                  <View style={s.rolePillDot} />
                  <Text style={s.rolePillText}>New Account</Text>
                </View>
              </View>

              {/* Brand + heading */}
              <Animated.View
                style={{
                  opacity: headerFade,
                  transform: [{ translateY: headerSlide }],
                }}>
                <Text style={s.brand}>
                  <Text style={s.brandFin}>Fin</Text>
                  <Text style={s.brandMatrix}>Matrix</Text>
                </Text>
                <Text style={s.headerTitle}>Create your account</Text>
                <Text style={s.headerSub}>
                  Start managing your business finances with confidence
                </Text>
              </Animated.View>
            </SafeAreaView>
          </LinearGradient>

          {/* ═══════════════════════════════════
              FORM CARD — Elevated surface
             ═══════════════════════════════════ */}
          <Animated.View
            style={[
              s.formCard,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { translateX: shakeAnim },
                ],
              },
            ]}>
              <CustomInput
                label="Full Name"
                value={fullName}
                onChangeText={t => { dispatch(setFullName(t)); clear('fullName'); }}
                placeholder="Your full name"
                error={errors.fullName}
              />

              <CustomInput
                label="Email Address"
                value={email}
                onChangeText={t => { dispatch(setSignUpEmail(t)); clear('email'); }}
                placeholder="name@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />

              <CustomInput
                label="Phone Number"
                value={phone}
                onChangeText={t => { dispatch(setPhone(t)); clear('phone'); }}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                error={errors.phone}
              />

              <CustomInput
                label="Password"
                value={password}
                onChangeText={t => { dispatch(setSignUpPassword(t)); clear('password'); }}
                placeholder="Minimum 6 characters"
                secureTextEntry
                error={errors.password}
              />

              {/* Password strength — refined bar */}
              {passwordStrength && strengthInfo && (
                <View style={s.strengthRow}>
                  <View style={s.strengthTrack}>
                    <View
                      style={[
                        s.strengthFill,
                        {
                          width: strengthInfo.width as `${number}%`,
                          backgroundColor: strengthInfo.color,
                        },
                      ]}
                    />
                  </View>
                  <View
                    style={[
                      s.strengthPill,
                      { backgroundColor: strengthInfo.color + '18' },
                    ]}>
                    <Text style={[s.strengthLabel, { color: strengthInfo.color }]}>
                      {strengthInfo.label}
                    </Text>
                  </View>
                </View>
              )}

              <CustomInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={t => { dispatch(setConfirmPassword(t)); clear('confirmPassword'); }}
                placeholder="Re-enter your password"
                secureTextEntry
                error={errors.confirmPassword}
              />
          </Animated.View>

          {/* ═══════════════════════════════════
              BELOW CARD — Terms, CTA, Links
             ═══════════════════════════════════ */}
          <View style={s.belowCard}>
            {/* ── Terms ── */}
            <View style={s.termsSection}>
              <TouchableOpacity
                style={s.termsRow}
                onPress={() => {
                  dispatch(setAcceptedTerms(!acceptedTerms));
                  clear('acceptedTerms');
                }}
                activeOpacity={0.7}>
                <View
                  style={[
                    s.checkbox,
                    acceptedTerms && s.checkboxActive,
                  ]}>
                  {acceptedTerms && <Text style={s.checkMark}>{'\u2713'}</Text>}
                </View>
                <Text style={s.termsText}>
                  I agree to the{' '}
                  <Text style={s.termsLink}>Terms of Service</Text>
                  {' and '}
                  <Text style={s.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {errors.acceptedTerms ? (
                <Text style={s.termsErr}>{errors.acceptedTerms}</Text>
              ) : null}
            </View>

            {/* Error banner */}
            {signUpError ? (
              <View style={s.errorBanner}>
                <View style={s.errorIconWrap}>
                  <Text style={s.errorIconChar}>!</Text>
                </View>
                <View style={s.errorTextWrap}>
                  <Text style={s.errorTitle}>Registration error</Text>
                  <Text style={s.errorMsg}>{signUpError}</Text>
                </View>
              </View>
            ) : null}

            {/* ── CTA ── */}
            <TouchableOpacity
              style={[s.cta, isLoading && s.ctaDisabled]}
              onPress={handleSignUp}
              activeOpacity={0.8}
              disabled={isLoading}>
              {isLoading ? (
                <View style={s.ctaLoadingRow}>
                  <ActivityIndicator size="small" color={DS.white} />
                  <Text style={s.ctaLabel}>Creating account…</Text>
                </View>
              ) : (
                <Text style={s.ctaLabel}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Bottom link */}
            <View style={s.bottomRow}>
              <Text style={s.bottomText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate(ROUTES.SIGN_IN, { role })}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <Text style={s.bottomLink}>Sign in</Text>
              </TouchableOpacity>
            </View>

            {/* Security footer */}
            <View style={s.secFooter}>
              <View style={s.secDot} />
              <Text style={s.secText}>Your data is encrypted and secure</Text>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.slate50 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },

  // ── Header (gradient) ──
  header: {
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  orbTopRight: {
    width: 180, height: 180,
    top: -60, right: -40,
  },
  orbBottomLeft: {
    width: 100, height: 100,
    bottom: -30, left: -20,
  },
  headerInner: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 8,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: DS.radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: DS.white,
    fontWeight: '400',
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: DS.radius.full,
    gap: 6,
  },
  rolePillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DS.green400,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: THEME.typography.fontFamily,
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    fontFamily: THEME.typography.fontFamily,
  },
  brandFin: { color: DS.green400 },
  brandMatrix: { color: DS.white },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: DS.white,
    marginBottom: 6,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: THEME.typography.fontFamily,
    lineHeight: 22,
  },

  // ── Form card ──
  formCard: {
    backgroundColor: DS.white,
    marginHorizontal: 16,
    marginTop: -1,
    borderRadius: DS.radius.xl,
    padding: 24,
    paddingTop: 28,
    shadowColor: '#0B1120',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },

  // ── Strength ──
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -6,
    marginBottom: 16,
    gap: 10,
  },

  // ── Below card wrapper ──
  belowCard: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    backgroundColor: DS.slate100,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Terms ──
  termsSection: {
    marginBottom: 20,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: DS.slate300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
    backgroundColor: DS.white,
  },
  checkboxActive: {
    backgroundColor: DS.navy800,
    borderColor: DS.navy800,
  },
  checkMark: {
    color: DS.white,
    fontSize: 12,
    fontWeight: '700',
    marginTop: -1,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: DS.slate500,
    lineHeight: 20,
    fontFamily: THEME.typography.fontFamily,
  },
  termsLink: {
    fontWeight: '700',
    color: DS.navy800,
  },
  termsErr: {
    fontSize: 12,
    color: DS.red500,
    marginTop: 6,
    marginLeft: 32,
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Error banner ──
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: DS.red50,
    borderRadius: DS.radius.md,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: DS.red100,
    gap: 12,
    alignItems: 'flex-start',
  },
  errorIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DS.red500,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconChar: {
    color: DS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  errorTextWrap: { flex: 1 },
  errorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.red700,
    fontFamily: THEME.typography.fontFamily,
    marginBottom: 2,
  },
  errorMsg: {
    fontSize: 12,
    color: DS.red900,
    fontFamily: THEME.typography.fontFamily,
    lineHeight: 18,
    opacity: 0.85,
  },

  // ── CTA ──
  cta: {
    height: 52,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.navy800,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    ...DS.shadowMd,
  },
  ctaDisabled: { opacity: 0.7 },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.white,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: 0.3,
  },
  ctaLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // ── Bottom ──
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 2,
    marginBottom: 8,
  },
  bottomText: {
    fontSize: 14,
    color: DS.slate500,
    fontFamily: THEME.typography.fontFamily,
  },
  bottomLink: {
    fontSize: 14,
    fontWeight: '700',
    color: DS.navy800,
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Security ──
  secFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  secDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DS.green500,
  },
  secText: {
    fontSize: 11,
    color: DS.slate400,
    fontFamily: THEME.typography.fontFamily,
    fontWeight: '500',
  },
});

export default SignUpScreen;