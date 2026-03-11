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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CustomButton from '../../../Custom-Components/CustomButton';
import CustomInput from '../../../Custom-Components/CustomInput';
import CustomDropdown from '../../../Custom-Components/CustomDropdown';
import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { ROUTES } from '../../../navigations-map/Base';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser } from '../../../store/authSlice';
import {
  setFullName,
  setSignUpEmail,
  setPhone,
  setSignUpPassword,
  setConfirmPassword,
  setAcceptedTerms,
  setVehicleType,
  setVehicleNumber,
  setSelectedZones,
  setCompanyCode,
  clearSignUpError,
  submitSignUpAsync,
  selectSignUpFullName,
  selectSignUpEmail,
  selectSignUpPhone,
  selectSignUpPassword,
  selectSignUpConfirmPassword,
  selectSignUpAcceptedTerms,
  selectSignUpVehicleType,
  selectSignUpVehicleNumber,
  selectSignUpSelectedZones,
  selectSignUpCompanyCode,
  selectSignUpStatus,
  selectSignUpError,
} from './signUpSlice';
import {
  validateSignUp,
  getPasswordStrength,
  strengthConfig,
} from '../../../models/authModel';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const vehicleOptions = [
  { label: 'Motorcycle', value: 'motorcycle' },
  { label: 'Van', value: 'van' },
  { label: 'Truck', value: 'truck' },
];

const zoneOptions = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];

const SignUpScreen: React.FC<Props> = ({ navigation, route }) => {
  const { role } = route.params;
  const dispatch = useAppDispatch();

  // ── Slice selectors ──
  const fullName = useAppSelector(selectSignUpFullName);
  const email = useAppSelector(selectSignUpEmail);
  const phone = useAppSelector(selectSignUpPhone);
  const password = useAppSelector(selectSignUpPassword);
  const confirmPassword = useAppSelector(selectSignUpConfirmPassword);
  const acceptedTerms = useAppSelector(selectSignUpAcceptedTerms);
  const vehicleType = useAppSelector(selectSignUpVehicleType);
  const vehicleNumber = useAppSelector(selectSignUpVehicleNumber);
  const selectedZones = useAppSelector(selectSignUpSelectedZones);
  const companyCodeArr = useAppSelector(selectSignUpCompanyCode);
  const status = useAppSelector(selectSignUpStatus);
  const signUpError = useAppSelector(selectSignUpError);

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const codeRefs = useRef<Array<TextInput | null>>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const accentColor = role === 'admin' ? colors.primary : colors.success;
  const roleLabel = role === 'admin' ? 'Administrator' : 'Delivery Personnel';

  const passwordStrength =
    password.length > 0 ? getPasswordStrength(password) : null;
  const strengthInfo = passwordStrength
    ? strengthConfig[passwordStrength]
    : null;

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...companyCodeArr];
    const char = text.slice(-1).toUpperCase();
    newCode[index] = char;
    dispatch(setCompanyCode(newCode));

    if (char && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }

    if (errors.companyCode) {
      setErrors(prev => ({ ...prev, companyCode: '' }));
    }
  };

  const handleCodeKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !companyCodeArr[index] && index > 0) {
      const newCode = [...companyCodeArr];
      newCode[index - 1] = '';
      dispatch(setCompanyCode(newCode));
      codeRefs.current[index - 1]?.focus();
    }
  };

  const toggleZone = (zone: string) => {
    const updated = selectedZones.includes(zone)
      ? selectedZones.filter(z => z !== zone)
      : [...selectedZones, zone];
    dispatch(setSelectedZones(updated));
  };

  const handleSignUp = async () => {
    dispatch(clearSignUpError());
    const codeString = companyCodeArr.join('');

    const validationData = {
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      acceptedTerms,
      role,
      vehicleType: role === 'delivery' ? vehicleType : undefined,
      vehicleNumber: role === 'delivery' ? vehicleNumber : undefined,
      zones: role === 'delivery' ? selectedZones : undefined,
      companyCode: role === 'delivery' ? codeString : undefined,
    };

    const validationErrors = validateSignUp(validationData);
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
          role,
          vehicleType: vehicleType || undefined,
          vehicleNumber: vehicleNumber || undefined,
          zones: selectedZones.length > 0 ? selectedZones : undefined,
          companyCode: codeString || undefined,
        }),
      ).unwrap();
      dispatch(setUser(user));
    } catch {
      // Error handled by slice
    }
  };

  const clearField = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
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
            <Text style={styles.headerTitle}>Create Account</Text>
            <View
              style={[styles.roleBadge, { backgroundColor: accentColor + '18' }]}>
              <Text style={[styles.roleBadgeText, { color: accentColor }]}>
                {roleLabel}
              </Text>
            </View>
          </View>

          {/* Form */}
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <CustomInput
              label="Full Name"
              value={fullName}
              onChangeText={text => {
                dispatch(setFullName(text));
                clearField('fullName');
              }}
              placeholder="Enter your full name"
              error={errors.fullName}
              leftIcon={<Text style={styles.inputIcon}>👤</Text>}
            />

            <CustomInput
              label="Email"
              value={email}
              onChangeText={text => {
                dispatch(setSignUpEmail(text));
                clearField('email');
              }}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon={<Text style={styles.inputIcon}>✉️</Text>}
            />

            <CustomInput
              label="Phone Number"
              value={phone}
              onChangeText={text => {
                dispatch(setPhone(text));
                clearField('phone');
              }}
              placeholder="+92 3XX XXXXXXX"
              keyboardType="phone-pad"
              error={errors.phone}
              leftIcon={<Text style={styles.inputIcon}>📱</Text>}
            />

            <CustomInput
              label="Password"
              value={password}
              onChangeText={text => {
                dispatch(setSignUpPassword(text));
                clearField('password');
              }}
              placeholder="Minimum 6 characters"
              secureTextEntry
              error={errors.password}
              leftIcon={<Text style={styles.inputIcon}>🔐</Text>}
            />

            {/* Password Strength Indicator */}
            {passwordStrength && strengthInfo && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarBg}>
                  <View
                    style={[
                      styles.strengthBarFill,
                      {
                        width: strengthInfo.width as `${number}%`,
                        backgroundColor: strengthInfo.color,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.strengthLabel, { color: strengthInfo.color }]}>
                  {strengthInfo.label}
                </Text>
              </View>
            )}

            <CustomInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={text => {
                dispatch(setConfirmPassword(text));
                clearField('confirmPassword');
              }}
              placeholder="Re-enter your password"
              secureTextEntry
              error={errors.confirmPassword}
              leftIcon={<Text style={styles.inputIcon}>🔐</Text>}
            />

            {/* ── Delivery-Specific Fields ── */}
            {role === 'delivery' && (
              <View style={styles.deliverySection}>
                <View style={styles.sectionDivider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Delivery Info</Text>
                  <View style={styles.dividerLine} />
                </View>

                <CustomDropdown
                  label="Vehicle Type"
                  options={vehicleOptions}
                  value={vehicleType}
                  onChange={val => {
                    dispatch(setVehicleType(val));
                    clearField('vehicleType');
                  }}
                  placeholder="Select vehicle type"
                  error={errors.vehicleType}
                />

                <CustomInput
                  label="Vehicle Number"
                  value={vehicleNumber}
                  onChangeText={text => {
                    dispatch(setVehicleNumber(text));
                    clearField('vehicleNumber');
                  }}
                  placeholder="e.g., LHR-1234"
                  autoCapitalize="characters"
                  error={errors.vehicleNumber}
                  leftIcon={<Text style={styles.inputIcon}>🚗</Text>}
                />

                {/* Preferred Zones Multi-Select */}
                <Text style={styles.fieldLabel}>Preferred Zones</Text>
                <View style={styles.zonesRow}>
                  {zoneOptions.map(zone => {
                    const selected = selectedZones.includes(zone);
                    return (
                      <TouchableOpacity
                        key={zone}
                        style={[
                          styles.zoneChip,
                          selected && {
                            backgroundColor: accentColor + '18',
                            borderColor: accentColor,
                          },
                        ]}
                        onPress={() => toggleZone(zone)}>
                        <Text
                          style={[
                            styles.zoneChipText,
                            selected && { color: accentColor, fontWeight: '600' },
                          ]}>
                          {selected ? '✓ ' : ''}
                          {zone}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Company Invite Code (OTP-style) */}
                <Text style={styles.fieldLabel}>Company Invite Code</Text>
                <View style={styles.codeRow}>
                  {companyCodeArr.map((char, idx) => (
                    <TextInput
                      key={idx}
                      ref={ref => {
                        codeRefs.current[idx] = ref;
                      }}
                      style={[
                        styles.codeBox,
                        char ? { borderColor: accentColor } : undefined,
                        errors.companyCode
                          ? { borderColor: colors.danger }
                          : undefined,
                      ]}
                      value={char}
                      onChangeText={text => handleCodeChange(text, idx)}
                      onKeyPress={({ nativeEvent }) =>
                        handleCodeKeyPress(idx, nativeEvent.key)
                      }
                      maxLength={1}
                      autoCapitalize="characters"
                      keyboardType="default"
                      textAlign="center"
                    />
                  ))}
                </View>
                {errors.companyCode ? (
                  <Text style={styles.codeError}>{errors.companyCode}</Text>
                ) : (
                  <Text style={styles.codeHint}>Try: FM2024 or DEMO01</Text>
                )}
              </View>
            )}

            {/* Terms and Conditions */}
            <View style={styles.termsRow}>
              <Switch
                value={acceptedTerms}
                onValueChange={val => {
                  dispatch(setAcceptedTerms(val));
                  clearField('acceptedTerms');
                }}
                trackColor={{ false: colors.border, true: accentColor + '60' }}
                thumbColor={acceptedTerms ? accentColor : '#f4f3f4'}
              />
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={[styles.termsLink, { color: accentColor }]}>
                  Terms and Conditions
                </Text>
              </Text>
            </View>
            {errors.acceptedTerms ? (
              <Text style={styles.termsError}>{errors.acceptedTerms}</Text>
            ) : null}

            {/* Auth Error */}
            {signUpError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{signUpError}</Text>
              </View>
            ) : null}

            {/* Sign Up Button */}
            <View style={styles.buttonWrapper}>
              <CustomButton
                title="Create Account"
                onPress={handleSignUp}
                variant="primary"
                size="lg"
                fullWidth
                isLoading={status === 'loading'}
              />
            </View>
          </Animated.View>

          {/* Bottom Link */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(ROUTES.SIGN_IN, { role })}>
              <Text style={[styles.bottomLink, { color: accentColor }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  backArrow: { fontSize: 24, color: colors.textPrimary },
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
  inputIcon: { fontSize: 16 },

  // Password Strength
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  strengthBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    minWidth: 60,
    fontFamily: typography.fontFamily,
  },

  // Delivery Section
  deliverySection: {
    marginTop: spacing.sm,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    ...typography.small,
    color: colors.textSecondary,
    marginHorizontal: spacing.sm + 4,
    fontWeight: '500',
  },
  fieldLabel: {
    ...typography.small,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  zonesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  zoneChip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  zoneChipText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  codeBox: {
    flex: 1,
    height: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.white,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  codeError: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  codeHint: {
    ...typography.caption,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },

  // Terms
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  termsText: {
    ...typography.small,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  termsLink: {
    fontWeight: '600',
  },
  termsError: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing.md,
    marginLeft: 52,
  },

  // Error Box
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
    marginTop: spacing.md,
    marginBottom: spacing.lg,
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

export default SignUpScreen;
