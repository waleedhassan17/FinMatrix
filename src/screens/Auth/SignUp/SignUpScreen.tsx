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

// ═══════════════════════════════════════
// Design Tokens
// ═══════════════════════════════════════
const B = {
  navy: '#0F172A',
  emerald: '#059669',
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

  // ── Live progress ──
  const filled = [fullName, email, phone, password, confirmPassword].filter(
    v => v.length > 0,
  ).length;
  const progress = Math.min((filled / 5) * 100, 100);

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
          fullName: fullName.trim(),
          email: email.trim(),
          phone,
          password,
        }),
      ).unwrap();
      dispatch(setUser(user));
    } catch {
      // Handled by slice
    }
  };

  const clear = (field: string) => {
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={s.flex} edges={['top']}>
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* ══════════════════════════════════
              FIXED HEADER — Back + Progress
             ══════════════════════════════════ */}
          <View style={s.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <View style={s.backBtn}>
                <Text style={s.backChar}>{'\u2039'}</Text>
              </View>
            </TouchableOpacity>

            <View style={s.progressWrap}>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${progress}%` }]} />
              </View>
            </View>

            {/* Spacer to balance back button */}
            <View style={{ width: 36 }} />
          </View>

          {/* ══════════════════════════════════
              SCROLLABLE CONTENT
             ══════════════════════════════════ */}
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* Title section */}
            <Animated.View style={[s.titleWrap, { opacity: fadeAnim }]}>
              <View style={s.roleRow}>
                <View style={s.roleDot} />
                <Text style={s.roleLabel}>Administrator</Text>
              </View>
              <Text style={s.title}>Create your account</Text>
              <Text style={s.subtitle}>
                Start managing your business finances
              </Text>
            </Animated.View>

            {/* ── Form Fields ── */}
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              <CustomInput
                label="Full Name"
                value={fullName}
                onChangeText={t => { dispatch(setFullName(t)); clear('fullName'); }}
                placeholder="Name"
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
                placeholder="+92 3XX XXXXXXX"
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

              {/* Password Strength Bar */}
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
                  <Text style={[s.strengthLabel, { color: strengthInfo.color }]}>
                    {strengthInfo.label}
                  </Text>
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

              {/* ── Terms ── */}
              <TouchableOpacity
                style={s.termsRow}
                onPress={() => {
                  dispatch(setAcceptedTerms(!acceptedTerms));
                  clear('acceptedTerms');
                }}
                activeOpacity={0.7}>
                <View
                  style={[
                    s.chk,
                    acceptedTerms && { backgroundColor: B.navy, borderColor: B.navy },
                  ]}>
                  {acceptedTerms && <Text style={s.chkMark}>{'\u2713'}</Text>}
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

              {/* ── Error ── */}
              {signUpError ? (
                <View style={s.errBox}>
                  <View style={s.errDot} />
                  <Text style={s.errText}>{signUpError}</Text>
                </View>
              ) : null}

              {/* ── CTA ── */}
              <TouchableOpacity
                style={s.cta}
                onPress={handleSignUp}
                activeOpacity={0.85}
                disabled={status === 'loading'}>
                <Text style={s.ctaLabel}>
                  {status === 'loading' ? 'Creating\u2026' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              {/* ── Bottom ── */}
              <View style={s.bottomRow}>
                <Text style={s.bottomText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate(ROUTES.SIGN_IN, { role })}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <Text style={s.bottomLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

// ═══════════════════════════════════════
// Styles
// ═══════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    gap: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center',
  },
  backChar: { fontSize: 22, color: '#0F172A', fontWeight: '300', marginTop: -1 },
  progressWrap: { flex: 1 },
  progressTrack: {
    height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: B.navy, borderRadius: 2 },

  // ── Scroll ──
  scroll: { paddingHorizontal: 24, paddingBottom: 32 },

  // ── Title ──
  titleWrap: { paddingTop: 24, marginBottom: 24 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  roleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: B.navy },
  roleLabel: {
    fontSize: 11, fontWeight: '600', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 1.2,
    fontFamily: typography.fontFamily,
  },
  title: {
    fontSize: 26, fontWeight: '700', color: '#0F172A',
    marginBottom: 6, fontFamily: typography.fontFamily, letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: '#64748B', fontFamily: typography.fontFamily },

  // ── Strength ──
  strengthRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: -8, marginBottom: 16, gap: 10,
  },
  strengthTrack: {
    flex: 1, height: 3, backgroundColor: '#F1F5F9',
    borderRadius: 2, overflow: 'hidden',
  },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthLabel: {
    fontSize: 11, fontWeight: '600', minWidth: 50,
    fontFamily: typography.fontFamily,
  },

  // ── Terms ──
  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 6, marginTop: 12,
  },
  chk: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5,
    borderColor: '#E2E8F0', justifyContent: 'center',
    alignItems: 'center', marginRight: 10, marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  chkMark: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  termsText: {
    flex: 1, fontSize: 13, color: '#64748B', lineHeight: 20,
    fontFamily: typography.fontFamily,
  },
  termsLink: { fontWeight: '600', color: '#0F172A' },
  termsErr: {
    fontSize: 12, color: '#DC2626', marginBottom: 12, marginLeft: 28,
    fontFamily: typography.fontFamily,
  },

  // ── Error ──
  errBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2',
    borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#FECACA', gap: 10,
  },
  errDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
  errText: {
    flex: 1, fontSize: 13, color: '#991B1B',
    fontFamily: typography.fontFamily, lineHeight: 18,
  },

  // ── Security Inline Badge ──
  secInline: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, marginBottom: 20,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: '#F8FAFC', borderRadius: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  secInlineDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669',
  },
  secInlineText: {
    fontSize: 11, color: '#94A3B8', fontFamily: typography.fontFamily,
  },

  // ── CTA ──
  cta: {
    height: 54, borderRadius: 14, backgroundColor: B.navy,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  ctaLabel: {
    fontSize: 16, fontWeight: '600', color: '#FFFFFF',
    fontFamily: typography.fontFamily, letterSpacing: 0.2,
  },

  // ── Bottom ──
  bottomRow: {
    flexDirection: 'row', justifyContent: 'center', paddingVertical: 4,
  },
  bottomText: { fontSize: 14, color: '#64748B', fontFamily: typography.fontFamily },
  bottomLink: {
    fontSize: 14, fontWeight: '600', color: B.navy,
    fontFamily: typography.fontFamily,
  },
});

export default SignUpScreen;