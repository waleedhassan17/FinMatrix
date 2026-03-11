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
import { colors, typography, spacing } from '../../../theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setOnboardingSeen } from '../../../store/authSlice';
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

  // ── Slice selectors ──
  const resendCooldown = useAppSelector(selectVerificationCooldown);
  const resendStatus = useAppSelector(selectResendStatus);
  const verifyStatus = useAppSelector(selectVerifyStatus);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
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

  // Cooldown timer
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
            <Text style={styles.emailIcon}>📧</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.message}>
            We've sent a verification link to
          </Text>
          <Text style={styles.emailAddress}>{email}</Text>
          <Text style={styles.subMessage}>
            Please check your inbox and click the verification link to continue.
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
            icon={<Text style={{ fontSize: 16 }}>📨</Text>}
          />

          <View style={styles.spacer} />

          <CustomButton
            title="I've Verified"
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
          style={styles.resendButton}>
          <Text
            style={[
              styles.resendText,
              (resendCooldown > 0 || resendStatus === 'loading') &&
                styles.resendDisabled,
            ]}>
            {resendStatus === 'loading'
              ? 'Sending...'
              : resendCooldown > 0
              ? `Resend Verification (${resendCooldown}s)`
              : 'Resend Verification Email'}
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
    marginBottom: spacing.lg,
  },
  emailCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.secondary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailIcon: {
    fontSize: 52,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emailAddress: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  subMessage: {
    ...typography.small,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
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
    ...typography.small,
    color: colors.primary,
    fontWeight: '500',
  },
  resendDisabled: {
    color: colors.textLight,
  },
});

export default EmailVerificationScreen;
