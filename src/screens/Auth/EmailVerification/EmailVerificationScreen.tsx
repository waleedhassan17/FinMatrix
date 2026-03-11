import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CustomButton from '../../../Custom-Components/CustomButton';
import { colors, typography, spacing, borderRadius } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setOnboardingSeen } from '../authSlice';
import {
  decrementVerificationCooldown,
  resendVerificationAsync,
  verifyEmailAsync,
  resetVerificationForm,
  selectVerificationCooldown,
  selectVerificationError,
  selectResendStatus,
  selectVerifyStatus,
} from './emailVerificationSlice';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailVerification'>;

const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email } = route.params;
  const dispatch = useAppDispatch();

  const resendCooldown = useAppSelector(selectVerificationCooldown);
  const resendStatus = useAppSelector(selectResendStatus);
  const verifyStatus = useAppSelector(selectVerifyStatus);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      dispatch(resetVerificationForm());
    };
  }, [fadeAnim, bounceAnim, dispatch]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => dispatch(decrementVerificationCooldown()),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown, dispatch]);

  const handleOpenEmail = () => {
    Linking.openURL('mailto:');
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    dispatch(resendVerificationAsync({ email }));
  };

  const handleVerified = () => {
    dispatch(verifyEmailAsync({ email })).then(() => {
      dispatch(setOnboardingSeen());
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconContainer,
            { opacity: fadeAnim, transform: [{ scale: bounceAnim }] },
          ]}>
          <View style={styles.emailCircle}>
            <View style={styles.emailInner}>
              <Text style={styles.emailIconText}>{'@'}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.message}>
            We've sent a verification link to
          </Text>
          <View style={styles.emailBadge}>
            <Text style={styles.emailAddress}>{email}</Text>
          </View>
          <Text style={styles.subMessage}>
            Check your inbox and click the verification link to activate your account.
          </Text>
        </Animated.View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <CustomButton
            title="Open Email App"
            onPress={handleOpenEmail}
            variant="secondary"
            size="lg"
            fullWidth
          />

          <View style={styles.spacer} />

          <CustomButton
            title="I've Verified My Email"
            onPress={handleVerified}
            variant="primary"
            size="lg"
            fullWidth
            isLoading={verifyStatus === 'loading'}
          />
        </View>

        {/* Resend */}
        <TouchableOpacity
          onPress={handleResend}
          disabled={resendCooldown > 0 || resendStatus === 'loading'}
          style={styles.resendButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text
            style={[
              styles.resendText,
              (resendCooldown > 0 || resendStatus === 'loading') &&
                styles.resendDisabled,
            ]}>
            {resendStatus === 'loading'
              ? 'Sending...'
              : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Didn't receive it? Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg + 4,
  },
  emailCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.secondary + '0A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.secondary + '20',
  },
  emailInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailIconText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
    fontFamily: typography.fontFamily,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  emailBadge: {
    backgroundColor: colors.primary + '0A',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 8,
    marginTop: spacing.xs,
    marginBottom: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.primary + '15',
  },
  emailAddress: {
    fontSize: typography.body.fontSize,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  subMessage: {
    fontSize: typography.small.fontSize,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    fontFamily: typography.fontFamily,
  },
  actionsContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  spacer: {
    height: spacing.sm + 4,
  },
  resendButton: {
    paddingVertical: spacing.sm,
  },
  resendText: {
    fontSize: typography.small.fontSize,
    color: colors.primary,
    fontWeight: '500',
    fontFamily: typography.fontFamily,
  },
  resendDisabled: {
    color: colors.textLight,
  },
});

export default EmailVerificationScreen;