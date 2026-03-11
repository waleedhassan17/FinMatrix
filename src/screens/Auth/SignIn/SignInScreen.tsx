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
import CustomButton from '../../../Custom-Components/CustomButton';
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

// ── Design Tokens ──
const BRAND = {
  navy: '#0F172A',
  navyLight: '#1E293B',
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

  const accentColor = role === 'admin' ? BRAND.navy : BRAND.emerald;
  const roleLabel = role === 'admin' ? 'Administrator' : 'Delivery Personnel';
  const isDelivery = role === 'delivery';

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.navy} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          {/* ── Brand Header ── */}
          <View style={styles.brandHeader}>
            {/* Decorative circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            <SafeAreaView edges={['top']} style={styles.brandHeaderInner}>
              {/* Back */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <View style={styles.backIconContainer}>
                  <Text style={styles.backArrow}>{'‹'}</Text>
                </View>
              </TouchableOpacity>

              {/* Brand + Role */}
              <View style={styles.brandInfo}>
                <View style={styles.brandLogoRow}>
                  <View style={styles.miniLogo}>
                    <Text style={styles.miniLogoText}>FM</Text>
                  </View>
                  <Text style={styles.roleLabel}>{roleLabel}</Text>
                </View>

                <Text style={styles.brandTitle}>Welcome back</Text>
                <Text style={styles.brandSubtitle}>
                  {isDelivery
                    ? 'Sign in with your company credentials'
                    : 'Sign in to manage your business'}
                </Text>
              </View>
            </SafeAreaView>
          </View>

          {/* ── Form Area ── */}
          <Animated.View
            style={[
              styles.formArea,
              {
                opacity: fadeAnim,
                transform: [{ translateX: shakeAnim }],
              },
            ]}>
            {isDelivery ? (
              <CustomInput
                label="Username"
                value={username}
                onChangeText={text => {
                  dispatch(setUsername(text));
                  if (errors.username) setErrors(prev => ({ ...prev, username: '' }));
                }}
                placeholder="e.g., FM2024.saim"
                autoCapitalize="none"
                error={errors.username}
              />
            ) : (
              <CustomInput
                label="Email Address"
                value={email}
                onChangeText={text => {
                  dispatch(setEmail(text));
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
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
              onChangeText={text => {
                dispatch(setPassword(text));
                if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
              }}
              placeholder="Enter your password"
              secureTextEntry
              error={errors.password}
            />

            {/* Remember + Forgot */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => dispatch(setRememberMe(!rememberMe))}
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && {
                      backgroundColor: BRAND.navy,
                      borderColor: BRAND.navy,
                    },
                  ]}>
                  {rememberMe && (
                    <Text style={styles.checkmark}>{'\u2713'}</Text>
                  )}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
              {!isDelivery && (
                <TouchableOpacity
                  onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Error */}
            {signInError ? (
              <View style={styles.errorBox}>
                <View style={styles.errorDot} />
                <Text style={styles.errorBoxText}>{signInError}</Text>
              </View>
            ) : null}

            {/* Sign In Button */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSignIn}
              activeOpacity={0.85}
              disabled={status === 'loading'}>
              {status === 'loading' ? (
                <Text style={styles.primaryButtonText}>Signing in...</Text>
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Demo Credentials */}
            {__DEV__ && (
              <TouchableOpacity
                style={styles.demoBox}
                onPress={handleDemoFill}
                activeOpacity={0.7}>
                <View style={styles.demoRow}>
                  <View style={styles.devBadge}>
                    <Text style={styles.devBadgeText}>DEV</Text>
                  </View>
                  <Text style={styles.demoText}>Tap to auto-fill demo credentials</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login */}
            <View style={styles.socialRow}>
              {['Google', 'Apple'].map(provider => (
                <TouchableOpacity
                  key={provider}
                  style={styles.socialButton}
                  disabled
                  activeOpacity={0.7}>
                  <Text style={styles.socialButtonLabel}>{provider}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.comingSoonText}>Coming soon</Text>

            {/* Bottom link — admin only */}
            {!isDelivery && (
              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate(ROUTES.SIGN_UP, { role })}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <Text style={styles.bottomLink}>Create account</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Delivery hint */}
            {isDelivery && (
              <View style={styles.deliveryHintBox}>
                <Text style={styles.deliveryHintText}>
                  Your company administrator creates your login credentials.
                  Contact them if you don't have your username.
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Brand Header ──
  brandHeader: {
    backgroundColor: BRAND.navy,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(5,150,105,0.07)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  brandHeaderInner: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '300',
    marginTop: -1,
  },
  brandInfo: {},
  brandLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  miniLogo: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniLogoText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    fontFamily: typography.fontFamily,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: typography.fontFamily,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: typography.fontFamily,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: typography.fontFamily,
  },

  // ── Form Area ──
  formArea: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: -4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  rememberText: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: typography.fontFamily,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.navy,
    fontFamily: typography.fontFamily,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
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
    marginBottom: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
    letterSpacing: 0.2,
  },

  // Demo
  demoBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  devBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  devBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: typography.fontFamily,
  },
  demoText: {
    fontSize: 13,
    color: '#92400E',
    fontFamily: typography.fontFamily,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: typography.fontFamily,
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  socialButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
  },
  socialButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: typography.fontFamily,
  },
  comingSoonText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: typography.fontFamily,
  },

  // Bottom
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
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

  // Delivery hint
  deliveryHintBox: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  deliveryHintText: {
    fontSize: 13,
    color: '#0F766E',
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
});

export default SignInScreen;