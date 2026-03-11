import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
  Switch,
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
import { setUser } from '../../../store/authSlice';
import {
  setEmail,
  setPassword,
  setRememberMe,
  clearSignInError,
  submitSignInAsync,
  selectSignInEmail,
  selectSignInPassword,
  selectSignInRememberMe,
  selectSignInStatus,
  selectSignInError,
} from './signInSlice';
import { validateSignIn } from '../../../models/authModel';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const SignInScreen: React.FC<Props> = ({ navigation, route }) => {
  const { role } = route.params;
  const dispatch = useAppDispatch();

  // ── Slice selectors ──
  const email = useAppSelector(selectSignInEmail);
  const password = useAppSelector(selectSignInPassword);
  const rememberMe = useAppSelector(selectSignInRememberMe);
  const status = useAppSelector(selectSignInStatus);
  const signInError = useAppSelector(selectSignInError);

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Shake animation
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const accentColor = role === 'admin' ? colors.primary : colors.success;
  const roleLabel = role === 'admin' ? 'Administrator' : 'Delivery Personnel';

  const demoEmail =
    role === 'admin' ? 'admin@finmatrix.pk' : 'saim@finmatrix.pk';
  const demoPassword = role === 'admin' ? 'admin123' : 'deliver123';

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleSignIn = async () => {
    dispatch(clearSignInError());
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
  };

  const handleDemoFill = () => {
    dispatch(setEmail(demoEmail));
    dispatch(setPassword(demoPassword));
    setErrors({});
    dispatch(clearSignInError());
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sign In</Text>
            <View
              style={[styles.roleBadge, { backgroundColor: accentColor + '18' }]}>
              <Text style={[styles.roleBadgeText, { color: accentColor }]}>
                {roleLabel}
              </Text>
            </View>
          </View>

          {/* Form */}
          <Animated.View
            style={[styles.formContainer, { transform: [{ translateX: shakeAnim }] }]}>
            <CustomInput
              label="Email"
              value={email}
              onChangeText={text => {
                dispatch(setEmail(text));
                if (errors.email) {
                  setErrors(prev => ({ ...prev, email: '' }));
                }
              }}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon={<Text style={styles.inputIcon}>✉️</Text>}
            />

            <CustomInput
              label="Password"
              value={password}
              onChangeText={text => {
                dispatch(setPassword(text));
                if (errors.password) {
                  setErrors(prev => ({ ...prev, password: '' }));
                }
              }}
              placeholder="Enter your password"
              secureTextEntry
              error={errors.password}
              leftIcon={<Text style={styles.inputIcon}>🔐</Text>}
            />

            {/* Remember Me + Forgot Password */}
            <View style={styles.optionsRow}>
              <View style={styles.rememberRow}>
                <Switch
                  value={rememberMe}
                  onValueChange={val => { dispatch(setRememberMe(val)); }}
                  trackColor={{ false: colors.border, true: accentColor + '60' }}
                  thumbColor={rememberMe ? accentColor : '#f4f3f4'}
                />
                <Text style={styles.rememberText}>Remember Me</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}>
                <Text style={[styles.forgotText, { color: accentColor }]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Auth Error */}
            {signInError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{signInError}</Text>
              </View>
            ) : null}

            {/* Sign In Button */}
            <View style={styles.buttonWrapper}>
              <CustomButton
                title="Sign In"
                onPress={handleSignIn}
                variant="primary"
                size="lg"
                fullWidth
                isLoading={status === 'loading'}
              />
            </View>

            {/* Demo Credentials Box */}
            <TouchableOpacity
              style={styles.demoBox}
              onPress={handleDemoFill}
              activeOpacity={0.7}>
              <Text style={styles.demoTitle}>Demo Credentials</Text>
              <Text style={styles.demoLabel}>Tap to auto-fill</Text>
              <View style={styles.demoRow}>
                <Text style={styles.demoKey}>Email: </Text>
                <Text style={styles.demoValue}>{demoEmail}</Text>
              </View>
              <View style={styles.demoRow}>
                <Text style={styles.demoKey}>Password: </Text>
                <Text style={styles.demoValue}>{demoPassword}</Text>
              </View>
            </TouchableOpacity>

            {/* Social Login (Coming Soon) */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton} disabled>
                <Text style={styles.socialIcon}>G</Text>
                <Text style={styles.socialLabel}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} disabled>
                <Text style={styles.socialIcon}></Text>
                <Text style={styles.socialLabel}>Apple</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.comingSoon}>Social login coming soon</Text>
          </Animated.View>

          {/* Bottom Link */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.SIGN_UP, { role })}>
              <Text style={[styles.bottomLink, { color: accentColor }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  backArrow: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 16,
  },
  roleBadgeText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  formContainer: {
    flex: 1,
  },
  inputIcon: {
    fontSize: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberText: {
    ...typography.small,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  forgotText: {
    ...typography.small,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: colors.danger + '12',
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 4,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  errorBoxText: {
    ...typography.small,
    color: colors.danger,
  },
  buttonWrapper: {
    marginBottom: spacing.lg,
  },
  demoBox: {
    backgroundColor: colors.border + '80',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  demoTitle: {
    ...typography.small,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  demoLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  demoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  demoKey: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  demoValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textLight,
    marginHorizontal: spacing.sm + 4,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
    marginBottom: spacing.xs,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    opacity: 0.5,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  socialLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  comingSoon: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  bottomText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  bottomLink: {
    ...typography.body,
    fontWeight: '600',
  },
});

export default SignInScreen;
