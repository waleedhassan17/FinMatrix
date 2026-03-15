import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Linking,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { typography } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser, selectPendingUser, selectSelectedRole } from '../authSlice';
import {
  decrementVerificationCooldown,
  resendVerificationAsync,
  checkVerificationStatusAsync,
  resetVerificationForm,
  selectVerificationCooldown,
  selectVerificationError,
  selectResendStatus,
  selectCanResend,
  selectIsVerificationLoading,
  selectIsVerified,
} from './emailVerificationSlice';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailVerification'>;

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
  blue500: '#3B82F6',
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
// Screen
// ═══════════════════════════════════════════════════════
const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email } = route.params;
  const dispatch = useAppDispatch();

  const resendCooldown = useAppSelector(selectVerificationCooldown);
  const resendStatus = useAppSelector(selectResendStatus);
  const isLoading = useAppSelector(selectIsVerificationLoading);
  const verificationError = useAppSelector(selectVerificationError);
  const isVerified = useAppSelector(selectIsVerified);
  const canResend = useAppSelector(selectCanResend);
  const pendingUser = useAppSelector(selectPendingUser);
  const selectedRole = useAppSelector(selectSelectedRole);

  const isDelivery = selectedRole === 'delivery';

  useEffect(() => {
    return () => {
      dispatch(resetVerificationForm());
    };
  }, [dispatch]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => dispatch(decrementVerificationCooldown()),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown, dispatch]);

  useEffect(() => {
    if (isVerified && pendingUser) {
      dispatch(setUser(pendingUser));
    }
  }, [isVerified, pendingUser, dispatch]);

  const handleOpenEmail = () => Linking.openURL('mailto:');

  const handleResend = () => {
    if (!canResend) return;
    dispatch(resendVerificationAsync({ email }));
  };

  const handleCheckVerification = () => {
    dispatch(checkVerificationStatusAsync({ email }));
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const isResending = resendStatus === 'loading';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={DS.navy900} />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
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
                  Email Verification
                </Text>
              </View>
            </View>

            <View>
              <Text style={s.headerTitle}>Verify your email</Text>
              <Text style={s.headerSub}>
                We've sent a verification link to your inbox
              </Text>
            </View>

            <View style={s.envelopeTagRow}>
              <Ionicons name="mail-outline" size={16} color={DS.green300} />
              <Text style={s.envelopeTagText}>Verification Pending</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* ═══════════════════════════════
            MAIN CARD
           ═══════════════════════════════ */}
        <View style={s.formCard}>
          {/* Email pill */}
          <View style={s.emailPill}>
            <Ionicons
              name="mail-outline"
              size={16}
              color={DS.navy800}
              style={{ marginRight: 8 }}
            />
            <Text style={s.emailVal} numberOfLines={1}>
              {email}
            </Text>
          </View>

          {/* Role badge */}
          {selectedRole && (
            <View style={s.roleBadgeRow}>
              <View style={s.roleBadge}>
                <Ionicons
                  name={
                    selectedRole === 'admin'
                      ? 'briefcase-outline'
                      : 'bicycle-outline'
                  }
                  size={13}
                  color={DS.navy800}
                />
                <Text style={s.roleBadgeText}>
                  {selectedRole === 'admin' ? 'Admin' : 'Delivery'} Account
                </Text>
              </View>
            </View>
          )}

          {/* Hint card */}
          <View style={s.hintCard}>
            <Ionicons
              name="time-outline"
              size={16}
              color={DS.amber800}
              style={{ marginRight: 10, marginTop: 1 }}
            />
            <Text style={s.hintCardText}>
              It may take a minute to arrive. Be sure to check your spam or
              junk folder too.
            </Text>
          </View>

          {/* Error */}
          {verificationError ? (
            <View style={s.errorBanner}>
              <View style={s.errorIconWrap}>
                <Text style={s.errorIconChar}>!</Text>
              </View>
              <View style={s.errorTextWrap}>
                <Text style={s.errorTitle}>Verification failed</Text>
                <Text style={s.errorMsg}>{verificationError}</Text>
              </View>
            </View>
          ) : null}

          {/* CTA — Check Status */}
          <TouchableOpacity
            style={[s.cta, isLoading && s.ctaDisabled]}
            onPress={handleCheckVerification}
            activeOpacity={0.8}
            disabled={isLoading}>
            {isLoading ? (
              <View style={s.ctaLoadingRow}>
                <ActivityIndicator size="small" color={DS.white} />
                <Text style={s.ctaLabel}>Checking…</Text>
              </View>
            ) : (
              <>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={DS.white}
                  style={{ marginRight: 8 }}
                />
                <Text style={s.ctaLabel}>Check Verification Status</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Resend link */}
          <TouchableOpacity
            onPress={handleResend}
            disabled={!canResend || isResending}
            style={s.resendHit}
            hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}>
            <Text
              style={[
                s.resendTxt,
                (!canResend || isResending) && s.resendOff,
              ]}>
              {isResending
                ? 'Sending…'
                : resendCooldown > 0
                ? `Resend available in ${resendCooldown}s`
                : "Didn't receive it? Resend"}
            </Text>
          </TouchableOpacity>
        </View>

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
            onPress={handleOpenEmail}
            activeOpacity={0.7}>
            <Ionicons
              name="open-outline"
              size={16}
              color={DS.navy800}
              style={{ marginRight: 8 }}
            />
            <Text style={s.secondaryBtnLabel}>Open Email App</Text>
          </TouchableOpacity>

          <View style={s.secFooter}>
            <View style={s.secDot} />
            <Text style={s.secText}>Secure verification link</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.slate50 },
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
    backgroundColor: DS.blue500,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: typography.fontFamily,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: DS.white,
    marginBottom: 6,
    fontFamily: typography.fontFamily,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: typography.fontFamily,
    lineHeight: 22,
  },

  envelopeTagRow: {
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
  envelopeTagText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: typography.fontFamily,
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

  // Email pill
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: DS.slate50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: DS.radius.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DS.slate200,
  },
  emailVal: {
    fontSize: 14,
    color: DS.navy800,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },

  // Role badge
  roleBadgeRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.slate50,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: DS.radius.full,
    borderWidth: 1,
    borderColor: DS.slate200,
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.navy800,
    fontFamily: typography.fontFamily,
  },

  // Hint card
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: DS.amber50,
    borderRadius: DS.radius.md,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: DS.amberBorder + '60',
  },
  hintCardText: {
    flex: 1,
    fontSize: 13,
    color: DS.amber800,
    fontFamily: typography.fontFamily,
    lineHeight: 19,
  },

  // Error
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
    fontFamily: typography.fontFamily,
    marginBottom: 2,
  },
  errorMsg: {
    fontSize: 12,
    color: DS.red900,
    fontFamily: typography.fontFamily,
    lineHeight: 18,
    opacity: 0.85,
  },

  // CTA
  cta: {
    height: 52,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.navy800,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...DS.shadowMd,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.white,
    fontFamily: typography.fontFamily,
    letterSpacing: 0.3,
  },
  ctaLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Resend
  resendHit: { alignSelf: 'center', paddingVertical: 14 },
  resendTxt: {
    fontSize: 13,
    color: DS.navy800,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  resendOff: {
    color: DS.slate400,
    fontWeight: '500',
  },

  // Below card
  belowCard: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },

  // Divider
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
    fontFamily: typography.fontFamily,
    fontWeight: '500',
    marginHorizontal: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // Secondary button
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
  secondaryBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.navy800,
    fontFamily: typography.fontFamily,
  },

  // Security footer
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
    fontFamily: typography.fontFamily,
  },
});

export default EmailVerificationScreen;