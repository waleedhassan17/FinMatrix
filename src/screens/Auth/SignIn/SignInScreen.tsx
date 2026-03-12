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
import type { RootStackParamList } from '../../../types';

// ═══════════════════════════════════════
// Design Tokens
// ═══════════════════════════════════════
const B = {
  navy: '#0F172A',
  emerald: '#059669',
  emeraldLight: '#10B981',
};

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const SignInScreen: React.FC<Props> = ({ navigation, route }) => {
  const { role } = route.params;
  const dispatch = useAppDispatch();

  const email = useAppSelector(selectSignInEmail);
  const username = useAppSelector(selectSignInUsername);
  const password = useAppSelector(selectSignInPassword);
  const rememberMe = useAppSelector(selectSignInRememberMe);
  const status = useAppSelector(selectSignInStatus);
  const signInError = useAppSelector(selectSignInError);

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isDelivery = role === 'delivery';
  const roleLabel = isDelivery ? 'Delivery Personnel' : 'Administrator';
  const ctaColor = isDelivery ? B.emerald : B.navy;

  const demoEmail = 'admin@finmatrix.pk';
  const demoUsername = 'FM2024.saim';
  const demoPassword = role === 'admin' ? 'admin123' : 'deliver123';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
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
        // Error handled by slice
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
      } catch {
        // Error handled by slice
      }
    }
  };

  const handleDemoFill = () => {
    if (isDelivery) {
      dispatch(setUsername(demoUsername));
    } else {
      dispatch(setEmail(demoEmail));
    }
    dispatch(setPassword(demoPassword));
    setErrors({});
    dispatch(clearSignInError());
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={B.navy} />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}>

          {/* ══════════════════════════════════
              BRAND HEADER
             ══════════════════════════════════ */}
          <View style={s.header}>
            <View
              style={[
                s.headerDecor1,
                isDelivery && { backgroundColor: 'rgba(16,185,129,0.08)' },
              ]}
            />
            <View style={s.headerDecor2} />

            <SafeAreaView edges={['top']} style={s.headerInner}>
              {/* Back */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={s.backWrap}>
                <View style={s.backBtn}>
                  <Text style={s.backChar}>{'\u2039'}</Text>
                </View>
              </TouchableOpacity>

              {/* Brand row */}
              <View style={s.brandRow}>
                <View
                  style={[
                    s.logo,
                    isDelivery && { backgroundColor: 'rgba(16,185,129,0.2)' },
                  ]}>
                  <Text
                    style={[
                      s.logoChar,
                      isDelivery && { color: B.emeraldLight },
                    ]}>
                    FM
                  </Text>
                </View>
                <Text style={s.roleBadge}>{roleLabel}</Text>
              </View>

              <Text style={s.headerTitle}>Welcome back</Text>
              <Text style={s.headerSub}>
                {isDelivery
                  ? 'Sign in with your company credentials'
                  : 'Sign in to manage your business'}
              </Text>
            </SafeAreaView>
          </View>

          {/* ══════════════════════════════════
              FORM
             ══════════════════════════════════ */}
          <Animated.View
            style={[
              s.form,
              { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] },
            ]}>

            {/* Identity field */}
            {isDelivery ? (
              <CustomInput
                label="Username"
                value={username}
                onChangeText={t => {
                  dispatch(setUsername(t));
                  if (errors.username) setErrors(p => ({ ...p, username: '' }));
                }}
                placeholder="e.g., FM2024.saim"
                autoCapitalize="none"
                error={errors.username}
              />
            ) : (
              <CustomInput
                label="Email Address"
                value={email}
                onChangeText={t => {
                  dispatch(setEmail(t));
                  if (errors.email) setErrors(p => ({ ...p, email: '' }));
                }}
                placeholder="name@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />
            )}

            <CustomInput
              label="Password"
              value={password}
              onChangeText={t => {
                dispatch(setPassword(t));
                if (errors.password) setErrors(p => ({ ...p, password: '' }));
              }}
              placeholder="Enter your password"
              secureTextEntry
              error={errors.password}
            />

            {/* Remember + Forgot */}
            <View style={s.optRow}>
              <TouchableOpacity
                style={s.remRow}
                onPress={() => dispatch(setRememberMe(!rememberMe))}
                activeOpacity={0.7}>
                <View
                  style={[
                    s.chk,
                    rememberMe && { backgroundColor: ctaColor, borderColor: ctaColor },
                  ]}>
                  {rememberMe && <Text style={s.chkMark}>{'\u2713'}</Text>}
                </View>
                <Text style={s.remLabel}>Remember me</Text>
              </TouchableOpacity>

              {!isDelivery && (
                <TouchableOpacity
                  onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={s.forgotLabel}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Error */}
            {signInError ? (
              <View style={s.errBox}>
                <View style={s.errDot} />
                <Text style={s.errText}>{signInError}</Text>
              </View>
            ) : null}

            {/* ── CTA ── */}
            <TouchableOpacity
              style={[s.cta, { backgroundColor: ctaColor }]}
              onPress={handleSignIn}
              activeOpacity={0.85}
              disabled={status === 'loading'}>
              <Text style={s.ctaLabel}>
                {status === 'loading' ? 'Signing in\u2026' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Dev demo fill */}
            {__DEV__ && (
              <TouchableOpacity
                style={s.demoBox}
                onPress={handleDemoFill}
                activeOpacity={0.7}>
                <View style={s.demoInner}>
                  <View style={s.devPill}>
                    <Text style={s.devPillText}>DEV</Text>
                  </View>
                  <Text style={s.demoLabel}>Tap to auto-fill demo credentials</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* ══════════════════════════════════
                DELIVERY — Credential Guidance
               ══════════════════════════════════ */}
            {isDelivery && (
              <View style={s.deliveryCard}>
                <Text style={s.deliveryCardTitle}>Need your credentials?</Text>
                <Text style={s.deliveryCardBody}>
                  Your company administrator creates your login. Contact them if
                  you don't have your username and password.
                </Text>
              </View>
            )}

            {/* ── Bottom Link (admin only) ── */}
            {!isDelivery && (
              <View style={s.bottomRow}>
                <Text style={s.bottomText}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate(ROUTES.SIGN_UP, { role })}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <Text style={s.bottomLink}>Create account</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ═══════════════════════════════════════
// Styles
// ═══════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },

  // ── Header ──
  header: {
    backgroundColor: B.navy,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  headerDecor1: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(5,150,105,0.07)',
  },
  headerDecor2: {
    position: 'absolute', bottom: -20, left: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  headerInner: {
    paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12,
  },
  backWrap: { alignSelf: 'flex-start', marginBottom: 24 },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  backChar: { fontSize: 22, color: '#FFFFFF', fontWeight: '300', marginTop: -1 },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  logo: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoChar: {
    fontSize: 11, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: 1, fontFamily: typography.fontFamily,
  },
  roleBadge: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase', letterSpacing: 1.2,
    fontFamily: typography.fontFamily,
  },
  headerTitle: {
    fontSize: 28, fontWeight: '700', color: '#FFFFFF',
    marginBottom: 4, fontFamily: typography.fontFamily, letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.5)',
    fontFamily: typography.fontFamily,
  },

  // ── Form ──
  form: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 },

  // ── Options ──
  optRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 28, marginTop: -4,
  },
  remRow: { flexDirection: 'row', alignItems: 'center' },
  chk: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5,
    borderColor: '#E2E8F0', justifyContent: 'center',
    alignItems: 'center', marginRight: 8, backgroundColor: '#FFFFFF',
  },
  chkMark: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  remLabel: { fontSize: 13, color: '#64748B', fontFamily: typography.fontFamily },
  forgotLabel: {
    fontSize: 13, fontWeight: '600', color: B.navy,
    fontFamily: typography.fontFamily,
  },

  // ── Error ──
  errBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2',
    borderRadius: 12, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#FECACA', gap: 10,
  },
  errDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
  errText: {
    flex: 1, fontSize: 13, color: '#991B1B',
    fontFamily: typography.fontFamily, lineHeight: 18,
  },

  // ── CTA ──
  cta: {
    height: 54, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  ctaLabel: {
    fontSize: 16, fontWeight: '600', color: '#FFFFFF',
    fontFamily: typography.fontFamily, letterSpacing: 0.2,
  },

  // ── Demo ──
  demoBox: {
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12,
    marginBottom: 20, borderWidth: 1, borderColor: '#FDE68A',
  },
  demoInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  devPill: {
    backgroundColor: '#F59E0B', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 5,
  },
  devPillText: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '700',
    letterSpacing: 0.5, fontFamily: typography.fontFamily,
  },
  demoLabel: { fontSize: 13, color: '#92400E', fontFamily: typography.fontFamily },

  // ── Delivery Info Card ──
  deliveryCard: {
    backgroundColor: '#F0FDFA', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#99F6E4', marginBottom: 16,
  },
  deliveryCardTitle: {
    fontSize: 13, fontWeight: '600', color: '#0F766E',
    marginBottom: 6, fontFamily: typography.fontFamily,
  },
  deliveryCardBody: {
    fontSize: 12, color: '#0F766E', lineHeight: 20,
    fontFamily: typography.fontFamily, opacity: 0.85,
  },

  // ── Security Badge ──
  secBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 24,
  },
  secIcon: {
    width: 34, height: 34, borderRadius: 9, backgroundColor: '#ECFDF5',
    justifyContent: 'center', alignItems: 'center',
  },
  secDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#059669' },
  secTextWrap: { flex: 1 },
  secTitle: {
    fontSize: 12, fontWeight: '600', color: '#0F172A',
    fontFamily: typography.fontFamily,
  },
  secSub: {
    fontSize: 11, color: '#94A3B8', fontFamily: typography.fontFamily,
    marginTop: 1,
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

export default SignInScreen;