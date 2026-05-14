import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CustomButton from '../../../Custom-Components/CustomButton';
import { colors, spacing, borderRadius, shadows } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch, useAppSelector } from '../../../hooks/useReduxHooks';
import { setUser } from '../authSlice';
import {
  addMember,
  setActiveCompany,
  type CompanyMember,
} from '../companySlice';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinCompany'>;

const JoinCompanyScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const companies = useAppSelector(state => state.company.companies);

  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [matchedCompany, setMatchedCompany] = useState<{
    companyId: string;
    name: string;
    memberCount: number;
  } | null>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleCodeChange = (text: string, index: number) => {
    const char = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-1);
    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);
    setError('');
    setMatchedCompany(null);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = useCallback(() => {
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Please enter the full 6-character code');
      triggerShake();
      return;
    }

    setIsLoading(true);
    const found = companies.find(
      c => c.inviteCode.toUpperCase() === fullCode.toUpperCase(),
    );

    setTimeout(() => {
      setIsLoading(false);
      if (found) {
        setMatchedCompany({
          companyId: found.companyId,
          name: found.name,
          memberCount: found.members.length,
        });
      } else {
        setError('Invalid code. Please check with your administrator.');
        triggerShake();
      }
    }, 600);
  }, [code, companies]);

  const handleJoin = useCallback(() => {
    if (!matchedCompany || !user) return;
    setIsLoading(true);

    const member: CompanyMember = {
      userId: user.uid,
      role: user.role as 'admin' | 'delivery',
      displayName: user.displayName,
      email: user.email,
      phone: user.phoneNumber,
      joinedAt: new Date().toISOString(),
    };

    dispatch(addMember({ companyId: matchedCompany.companyId, member }));
    dispatch(setActiveCompany(matchedCompany.companyId));
    dispatch(setUser({ ...user, companyId: matchedCompany.companyId }));

    setIsLoading(false);
  }, [matchedCompany, user, dispatch]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <View style={styles.backIconContainer}>
              <Text style={styles.backArrow}>{'‹'}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Join Company</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.iconCircle}>
            <View style={styles.iconInner}>
              <Text style={styles.iconText}>{'#'}</Text>
            </View>
          </View>
          <Text style={styles.title}>Enter invite code</Text>
          <Text style={styles.subtitle}>
            Enter the 6-character code shared by your company administrator
          </Text>

          {/* Code Input */}
          <Animated.View
            style={[styles.codeRow, { transform: [{ translateX: shakeAnim }] }]}>
            {code.map((char, i) => (
              <TextInput
                key={i}
                ref={ref => { inputRefs.current[i] = ref; }}
                style={[
                  styles.codeBox,
                  char ? styles.codeBoxFilled : null,
                  error ? styles.codeBoxError : null,
                ]}
                value={char}
                onChangeText={text => handleCodeChange(text, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                maxLength={1}
                autoCapitalize="characters"
                textAlign="center"
                returnKeyType={i < 5 ? 'next' : 'done'}
              />
            ))}
          </Animated.View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Matched Company */}
          {matchedCompany ? (
            <View style={styles.confirmationCard}>
              <View style={styles.companyBadge}>
                <Text style={styles.companyBadgeText}>
                  {matchedCompany.name.charAt(0)}
                </Text>
              </View>
              <Text style={styles.confirmationName}>{matchedCompany.name}</Text>
              <Text style={styles.confirmationMeta}>
                {matchedCompany.memberCount} member{matchedCompany.memberCount !== 1 ? 's' : ''}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  Joining as {user?.role === 'delivery' ? 'Delivery Personnel' : 'Administrator'}
                </Text>
              </View>
              <View style={styles.confirmationButtons}>
                <CustomButton
                  title="Cancel"
                  onPress={() => setMatchedCompany(null)}
                  variant="secondary"
                  size="md"
                />
                <View style={{ width: spacing.sm }} />
                <CustomButton
                  title="Confirm & Join"
                  onPress={handleJoin}
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                />
              </View>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <CustomButton
                title="Verify Code"
                onPress={handleVerifyCode}
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isLoading}
                disabled={code.join('').length < 6}
              />
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {},
  backIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: colors.textPrimary,
    marginTop: -2,
    fontWeight: '300',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: THEME.typography.h3.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  headerSpacer: { width: 36 },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.xl + 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.secondary + '0A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.secondary + '20',
  },
  iconInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.secondary,
    fontFamily: THEME.typography.fontFamily,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: THEME.typography.bodyMd.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    fontFamily: THEME.typography.fontFamily,
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  codeBox: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.sm + 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: THEME.typography.fontFamily,
  },
  codeBoxFilled: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary + '06',
  },
  codeBoxError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: THEME.typography.bodyMd.fontSize,
    marginBottom: spacing.md,
    fontFamily: THEME.typography.fontFamily,
  },
  buttonContainer: {
    width: '100%',
    marginTop: spacing.lg,
  },
  confirmationCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md + 4,
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  companyBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary + '0C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm + 4,
  },
  companyBadgeText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: THEME.typography.fontFamily,
  },
  confirmationName: {
    fontSize: THEME.typography.h2.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
  },
  confirmationMeta: {
    fontSize: THEME.typography.bodyMd.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  roleBadge: {
    backgroundColor: colors.primary + '0A',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '15',
  },
  roleBadgeText: {
    fontSize: THEME.typography.bodyMd.fontSize,
    color: colors.primary,
    fontWeight: '500',
    fontFamily: THEME.typography.fontFamily,
  },
  confirmationButtons: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
});

export default JoinCompanyScreen;