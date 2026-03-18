import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CustomInput from '../../../Custom-Components/CustomInput';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import {
  setForgotEmail,
  clearForgotPasswordError,
  decrementCooldown,
  submitForgotPasswordAsync,
  resetForgotPasswordForm,
  selectForgotEmail,
  selectEmailSent,
  selectSentEmail,
  selectForgotResendCooldown,
  selectForgotPasswordError,
  selectForgotPasswordIsLoading,
  selectIsFormComplete,
} from './forgotPasswordSlice';
import { selectSelectedRole } from '../authSlice';
import type { RootStackParamList } from '../../../types';
import { ROUTES } from '../../../navigations-map/Base';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

// ═══════════════════════════════════════════════════════
// Design System
// ═══════════════════════════════════════════════════════
const DS = {
  navy900: '#0B1120',
  navy800: '#0F172A',
  navy700: '#1E293B',

  green500: '#059669',
  green400: '#10B981',
  green300: '#34D399',
  green50: '#ECFDF5',
  greenBorder: '#A7F3D0',

  blue600: '#2563EB',
  blue100: '#DBEAFE',
  blue50: '#EFF6FF',

  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',

  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red500: '#EF4444',
  red700: '#B91C1C',
  red900: '#7F1D1D',

  amber50: '#FFFBEB',
  amberBorder: '#FDE68A',
  amber800: '#92400E',

  white: '#FFFFFF',

  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },

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

// ═══════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════
const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const AUTH_ANIM = {
    stagger: 140,
    duration: 420,
    contentDuration: 460,
    springFriction: 8,
    springTension: 46,
  };
  const dispatch = useAppDispatch();

  const email = useAppSelector(selectForgotEmail);
  const emailSent = useAppSelector(selectEmailSent);
  const sentEmail = useAppSelector(selectSentEmail);
  const resendCooldown = useAppSelector(selectForgotResendCooldown);
  const isLoading = useAppSelector(selectForgotPasswordIsLoading);
  const forgotError = useAppSelector(selectForgotPasswordError);
  const isFormComplete = useAppSelector(selectIsFormComplete);
  const selectedRole = useAppSelector(selectSelectedRole);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-12)).current;
  const sentFade = useRef(new Animated.Value(0)).current;
  const sentScale = useRef(new Animated.Value(0.5)).current;

  const isDelivery = selectedRole === 'delivery';
  const roleLabel = isDelivery ? 'Delivery Portal' : 'Password Recovery';

  useEffect(() => {
    Animated.stagger(AUTH_ANIM.stagger, [
      Animated.parallel([
        Animated.timing(headerFade, {
          toValue: 1,
          duration: AUTH_ANIM.duration,
          useNativeDriver: true,
        }),
        Animated.timing(headerSlide, {
          toValue: 0,
          duration: AUTH_ANIM.duration,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: AUTH_ANIM.contentDuration,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: AUTH_ANIM.contentDuration,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    return () => {
      dispatch(resetForgotPasswordForm());
    };
  }, [dispatch, fadeAnim, slideAnim, headerFade, headerSlide]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => dispatch(decrementCooldown()), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown, dispatch]);

  useEffect(() => {
    if (emailSent) {
      Animated.parallel([
        Animated.timing(sentFade, {
          toValue: 1,
          duration: AUTH_ANIM.duration,
          useNativeDriver: true,
        }),
        Animated.spring(sentScale, {
          toValue: 1,
          friction: AUTH_ANIM.springFriction,
          tension: AUTH_ANIM.springTension,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [emailSent, sentFade, sentScale]);

  const handleSendReset = () => {
    if (!isFormComplete || isLoading) return;
    dispatch(clearForgotPasswordError());
    dispatch(submitForgotPasswordAsync({ email: email.trim() }));
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    dispatch(clearForgotPasswordError());
    dispatch(submitForgotPasswordAsync({ email: sentEmail }));
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  /* ══════════════════════════════════════
     SENT CONFIRMATION STATE
     ══════════════════════════════════════ */
  if (emailSent) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor={DS.navy900} />
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          {/* Header */}
          <LinearGradient
            colors={[DS.navy900, DS.navy800, DS.navy700]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={s.header}>
            <View style={[s.orb, s.orbTopRight]} />
            <View style={[s.orb, s.orbBottomLeft]} />

            <SafeAreaView edges={['top']} style={s.headerInner}>
              <View style={s.navRow}>
                <TouchableOpacity
                  onPress={handleGoBack}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  activeOpacity={0.7}>
                  <View style={s.backBtn}>
                    <Text style={s.backIcon}>{'\u2190'}</Text>
                  </View>
                </TouchableOpacity>

                <View style={s.rolePill}>
                  <View
                    style={[s.rolePillDot, { backgroundColor: DS.green400 }]}
                  />
                  <Text style={s.rolePillText}>Email Sent</Text>
                </View>
              </View>

              <Animated.View style={{ opacity: sentFade }}>
                <Text style={s.headerTitle}>Check your inbox</Text>
                <Text style={s.headerSub}>
                  We've sent password reset instructions to your email
                </Text>
              </Animated.View>

              <View style={s.heroTagRow}>
                <Ionicons name="lock-open-outline" size={16} color={DS.green300} />
                <Text style={s.heroTagText}>Recovery Email Sent</Text>
              </View>
            </SafeAreaView>
          </LinearGradient>

          {/* Sent card */}
          <Animated.View
            style={[
              s.formCard,
              { opacity: sentFade, transform: [{ scale: sentScale }] },
            ]}>
            {/* Email pill */}
            <View style={sentS.emailPill}>
              <Ionicons
                name="mail-outline"
                size={16}
                color={DS.navy800}
                style={{ marginRight: 8 }}
              />
              <Text style={sentS.emailVal} numberOfLines={1}>
                {sentEmail}
              </Text>
            </View>

            {/* Steps mini-guide */}
            <View style={sentS.stepsCard}>
              <View style={sentS.stepsRow}>
                <View style={sentS.stepDot}>
                  <Ionicons name="mail-open-outline" size={14} color={DS.blue600} />
                </View>
                <Text style={sentS.stepsText}>
                  Open the email and tap the reset link
                </Text>
              </View>
              <View style={sentS.stepConnector} />
              <View style={sentS.stepsRow}>
                <View style={sentS.stepDot}>
                  <Ionicons name="key-outline" size={14} color={DS.blue600} />
                </View>
                <Text style={sentS.stepsText}>
                  Create a new secure password
                </Text>
              </View>
            </View>

            {/* Timer card */}
            <View style={sentS.timerCard}>
              <Ionicons
                name="time-outline"
                size={16}
                color={DS.amber800}
                style={{ marginRight: 10, marginTop: 1 }}
              />
              <Text style={sentS.timerText}>
                The reset link will expire in 30 minutes. Check your spam
                folder if you don't see the email.
              </Text>
            </View>

            {/* Resend */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0}
              hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
              style={sentS.resendHit}>
              <Text
                style={[
                  sentS.resendTxt,
                  resendCooldown > 0 && sentS.resendOff,
                ]}>
                {resendCooldown > 0
                  ? `Resend available in ${resendCooldown}s`
                  : "Didn't receive it? Resend"}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Below-card section */}
          <View style={s.belowCard}>
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divText}>or</Text>
              <View style={s.divLine} />
            </View>

            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={handleGoBack}
              activeOpacity={0.7}>
              <Text style={s.secondaryBtnIcon}>{'\u2190'}</Text>
              <Text style={s.secondaryBtnLabel}>Back to Sign In</Text>
            </TouchableOpacity>

            <View style={s.secFooter}>
              <View style={s.secDot} />
              <Text style={s.secText}>256-bit SSL encrypted connection</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ══════════════════════════════════════
     FORM STATE
     ══════════════════════════════════════ */
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
          {/* ═══════════════════════════════
              HEADER — Gradient panel
             ═══════════════════════════════ */}
          <LinearGradient
            colors={[DS.navy900, DS.navy800, DS.navy700]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={s.header}>
            <View style={[s.orb, s.orbTopRight]} />
            <View style={[s.orb, s.orbBottomLeft]} />

            <SafeAreaView edges={['top']} style={s.headerInner}>
              <View style={s.navRow}>
                <TouchableOpacity
                  onPress={handleGoBack}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  activeOpacity={0.7}>
                  <View style={s.backBtn}>
                    <Text style={s.backIcon}>{'\u2190'}</Text>
                  </View>
                </TouchableOpacity>

                <View
                  style={[
                    s.rolePill,
                    isDelivery && {
                      backgroundColor: 'rgba(16,185,129,0.15)',
                    },
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

              <Animated.View
                style={{
                  opacity: headerFade,
                  transform: [{ translateY: headerSlide }],
                }}>
                <Text style={s.headerTitle}>Reset Password</Text>
                <Text style={s.headerSub}>
                  Enter your email to receive a password reset link
                </Text>
              </Animated.View>

              <View style={s.heroTagRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={DS.green300} />
                <Text style={s.heroTagText}>Secure Password Reset</Text>
              </View>
            </SafeAreaView>
          </LinearGradient>

          {/* ═══════════════════════════════
              FORM CARD
             ═══════════════════════════════ */}
          <Animated.View
            style={[
              s.formCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}>
            {/* Error banner */}
            {forgotError ? (
              <View style={s.errorBanner}>
                <View style={s.errorIconWrap}>
                  <Text style={s.errorIconChar}>!</Text>
                </View>
                <View style={s.errorTextWrap}>
                  <Text style={s.errorTitle}>Unable to send</Text>
                  <Text style={s.errorMsg}>{forgotError}</Text>
                </View>
              </View>
            ) : null}

            {/* Info card */}
            <View style={s.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={DS.blue600}
                style={{ marginRight: 10, marginTop: 1 }}
              />
              <Text style={s.infoText}>
                Enter the email address linked to your account and we'll send
                you a link to reset your password.
              </Text>
            </View>

            {/* Email input */}
            <CustomInput
              label="Email Address"
              value={email}
              onChangeText={(text: string) => {
                dispatch(setForgotEmail(text));
                if (forgotError) dispatch(clearForgotPasswordError());
              }}
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* CTA */}
            <TouchableOpacity
              style={[
                s.cta,
                (!isFormComplete || isLoading) && s.ctaDisabled,
              ]}
              onPress={handleSendReset}
              activeOpacity={0.8}
              disabled={!isFormComplete || isLoading}>
              {isLoading ? (
                <View style={s.ctaLoadingRow}>
                  <ActivityIndicator size="small" color={DS.white} />
                  <Text style={s.ctaLabel}>Sending…</Text>
                </View>
              ) : (
                <>
                  <Ionicons
                    name="paper-plane-outline"
                    size={16}
                    color={DS.white}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={s.ctaLabel}>Send Reset Link</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* ═══════════════════════════════
              BELOW CARD
             ═══════════════════════════════ */}
          <View style={s.belowCard}>
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divText}>or</Text>
              <View style={s.divLine} />
            </View>

            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={handleGoBack}
              activeOpacity={0.7}>
              <Text style={s.secondaryBtnIcon}>{'\u2190'}</Text>
              <Text style={s.secondaryBtnLabel}>Back to Sign In</Text>
            </TouchableOpacity>

            <View style={s.secFooter}>
              <View style={s.secDot} />
              <Text style={s.secText}>
                Link expires in 30 minutes for security
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════
// Sent-state card styles
// ═══════════════════════════════════════════════════════
const sentS = StyleSheet.create({
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: DS.slate50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: DS.radius.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: DS.slate200,
  },
  emailVal: {
    fontSize: 14,
    color: DS.navy800,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  stepsCard: {
    backgroundColor: DS.slate50,
    borderRadius: DS.radius.md,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DS.slate100,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: DS.blue50,
    borderWidth: 1,
    borderColor: DS.blue100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepConnector: {
    width: 2,
    height: 16,
    backgroundColor: DS.slate200,
    marginLeft: 15,
    marginVertical: 4,
    borderRadius: 1,
  },
  stepsText: {
    flex: 1,
    fontSize: 13,
    color: DS.slate500,
    fontFamily: THEME.typography.fontFamily,
    lineHeight: 19,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: DS.amber50,
    borderRadius: DS.radius.md,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: DS.amberBorder + '60',
  },
  timerText: {
    flex: 1,
    fontSize: 13,
    color: DS.amber800,
    fontFamily: THEME.typography.fontFamily,
    lineHeight: 19,
  },
  resendHit: { alignSelf: 'center', paddingVertical: 6 },
  resendTxt: {
    fontSize: 13,
    color: DS.navy800,
    fontWeight: '600',
    fontFamily: THEME.typography.fontFamily,
  },
  resendOff: { color: DS.slate400, fontWeight: '500' },
});

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
    width: 180,
    height: 180,
    top: -60,
    right: -40,
  },
  orbBottomLeft: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -20,
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

  heroTagRow: {
    marginTop: 18,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: DS.radius.full,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  heroTagText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: 0.3,
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

  // ── Info card ──
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: DS.blue50,
    borderRadius: DS.radius.md,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: DS.blue100,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: DS.slate500,
    fontFamily: THEME.typography.fontFamily,
    lineHeight: 19,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...DS.shadowMd,
  },
  ctaDisabled: { opacity: 0.5 },
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

  // ── Below card ──
  belowCard: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },

  // ── Divider ──
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: DS.slate200,
  },
  divText: {
    fontSize: 11,
    color: DS.slate400,
    fontFamily: THEME.typography.fontFamily,
    fontWeight: '500',
    marginHorizontal: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // ── Secondary button ──
  secondaryBtn: {
    height: 48,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.white,
    borderWidth: 1.5,
    borderColor: DS.slate200,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...DS.shadowMd,
  },
  secondaryBtnIcon: {
    fontSize: 16,
    color: DS.navy800,
    marginRight: 8,
    fontWeight: '400',
  },
  secondaryBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.navy800,
    fontFamily: THEME.typography.fontFamily,
  },

  // ── Security footer ──
  secFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DS.green500,
  },
  secText: {
    fontSize: 12,
    color: DS.slate400,
    fontFamily: THEME.typography.fontFamily,
  },
});

export default ForgotPasswordScreen;