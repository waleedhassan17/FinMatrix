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

// ═══════════════════════════════════════════════════════
// Design System — Unified Auth Palette
// ═══════════════════════════════════════════════════════
const DS = {
  // Core brand
  navy900: '#0B1120',
  navy800: '#0F172A',
  navy700: '#1E293B',
  navy600: '#334155',

  // Accent
  green500: '#059669',
  green400: '#00875A',
  green300: '#34D399',
  green50: '#ECFDF5',

  // Neutrals
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',

  // Feedback
  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red500: '#DE350B',
  red700: '#B91C1C',
  red900: '#7F1D1D',

  // Surface
  white: '#FFFFFF',
  black: '#000000',

  // Radius system
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },

  // Shadow
  shadowSm: {
    shadowColor: '#0B1120',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  shadowMd: {
    shadowColor: '#0B1120',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  shadowLg: {
    shadowColor: '#0B1120',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
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
  const slideAnim = useRef(new Animated.Value(24)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-12)).current;

  const isDelivery = role === 'delivery';
  const roleLabel = isDelivery ? 'Delivery Portal' : 'Business Portal';


  // ── Orchestrated entrance animation ──
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
        // Stage 1: route unverified company admins to the verification screen.
        if ((err as { code?: string })?.code === 'EMAIL_NOT_VERIFIED') {
          navigation.navigate('EmailVerification', { email: email.trim() });
        }
        /* other errors handled by slice */
      }
    }
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
              HEADER — Refined gradient panel
             ═══════════════════════════════════ */}
          <LinearGradient
            colors={[DS.navy900, DS.navy800, DS.navy700]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={s.header}>

            {/* Subtle decorative orbs */}
            <View style={[s.orb, s.orbTopRight, isDelivery && s.orbGreen]} />
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

                <View
                  style={[
                    s.rolePill,
                    isDelivery && { backgroundColor: 'rgba(16,185,129,0.15)' },
                  ]}>
                  <View
                    style={[
                      s.rolePillDot,
                      isDelivery && { backgroundColor: DS.green400 },
                    ]}
                  />
                  <Text
                    style={[
                      s.rolePillText,
                      isDelivery && { color: DS.green300 },
                    ]}>
                    {roleLabel}
                  </Text>
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
                <Text style={s.headerTitle}>Welcome back</Text>
                <Text style={s.headerSub}>
                  {isDelivery
                    ? 'Sign in with your company credentials'
                    : 'Sign in to manage your business'}
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

            {/* Identity field */}
            {isDelivery ? (
              <CustomInput
                label="Username"
                value={username}
                onChangeText={t => {
                  dispatch(setUsername(t));
                  if (errors.username) setErrors(p => ({ ...p, username: '' }));
                }}
                placeholder="Enter your username"
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

            {/* Remember + Forgot — refined row */}
            <View style={s.optRow}>
              <TouchableOpacity
                style={s.remRow}
                onPress={() => dispatch(setRememberMe(!rememberMe))}
                activeOpacity={0.7}>
                <View
                  style={[
                    s.checkbox,
                    rememberMe && {
                      backgroundColor: isDelivery ? DS.green500 : DS.navy800,
                      borderColor: isDelivery ? DS.green500 : DS.navy800,
                    },
                  ]}>
                  {rememberMe && <Text style={s.checkMark}>{'\u2713'}</Text>}
                </View>
                <Text style={s.remLabel}>Remember me</Text>
              </TouchableOpacity>

              {!isDelivery && (
                <TouchableOpacity
                  onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={s.forgotLabel}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Error banner */}
            {signInError ? (
              <View style={s.errorBanner}>
                <View style={s.errorIconWrap}>
                  <Text style={s.errorIconChar}>!</Text>
                </View>
                <View style={s.errorTextWrap}>
                  <Text style={s.errorTitle}>Authentication failed</Text>
                  <Text style={s.errorMsg}>{signInError}</Text>
                </View>
              </View>
            ) : null}

            {/* ── Primary CTA ── */}
            <TouchableOpacity
              style={[
                s.cta,
                isDelivery && s.ctaGreen,
                isLoading && s.ctaDisabled,
              ]}
              onPress={handleSignIn}
              activeOpacity={0.8}
              disabled={isLoading}>
              {isLoading ? (
                <View style={s.ctaLoadingRow}>
                  <ActivityIndicator size="small" color={DS.white} />
                  <Text style={s.ctaLabel}>Signing in…</Text>
                </View>
              ) : (
                <Text style={s.ctaLabel}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Delivery credential guidance */}
            {isDelivery && (
              <View style={s.infoCard}>
                <View style={s.infoIconWrap}>
                  <Text style={s.infoIcon}>i</Text>
                </View>
                <View style={s.infoTextWrap}>
                  <Text style={s.infoTitle}>Need your credentials?</Text>
                  <Text style={s.infoBody}>
                    Your company administrator creates your login. Contact them
                    if you don't have your username and password.
                  </Text>
                </View>
              </View>
            )}

            {/* Admin — bottom link */}
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


          {/* Security footer */}
          <View style={s.secFooter}>
            <View style={s.secDot} />
            <Text style={s.secText}>
              256-bit SSL encrypted connection
            </Text>
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

  // ── Header ──
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
  orbGreen: {
    backgroundColor: 'rgba(16,185,129,0.06)',
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
    backgroundColor: DS.slate400,
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
    ...DS.shadowLg,
  },

  // ── Options row ──
  optRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: -2,
  },
  remRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: DS.slate300,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: DS.white,
  },
  checkMark: {
    color: DS.white,
    fontSize: 12,
    fontWeight: '700',
    marginTop: -1,
  },
  remLabel: {
    fontSize: 13,
    color: DS.slate500,
    fontFamily: THEME.typography.fontFamily,
    fontWeight: '500',
  },
  forgotLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.navy800,
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
    marginBottom: 24,
    ...DS.shadowMd,
  },
  ctaGreen: {
    backgroundColor: DS.green500,
  },
  ctaDisabled: {
    opacity: 0.7,
  },
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

  // ── Info card (delivery) ──
  infoCard: {
    flexDirection: 'row',
    backgroundColor: DS.green50,
    borderRadius: DS.radius.md,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 12,
    alignItems: 'flex-start',
  },
  infoIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: DS.green500,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIcon: {
    color: DS.white,
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  infoTextWrap: { flex: 1 },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
    fontFamily: THEME.typography.fontFamily,
    marginBottom: 3,
  },
  infoBody: {
    fontSize: 12,
    color: '#065F46',
    fontFamily: THEME.typography.fontFamily,
    lineHeight: 19,
    opacity: 0.8,
  },

  // ── Bottom link ──
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 2,
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

  // ── Dev banner ──
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: DS.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  devPill: {
    backgroundColor: '#FF991F',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  devPillLabel: {
    color: DS.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: THEME.typography.fontFamily,
  },
  devText: {
    fontSize: 13,
    color: '#92400E',
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Security footer ──
  secFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
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

export default SignInScreen;