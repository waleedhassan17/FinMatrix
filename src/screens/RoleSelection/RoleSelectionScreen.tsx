import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppLogo from '../../Custom-Components/AppLogo';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { ROUTES } from '../../navigations-map/Base';
import { useAppDispatch } from '../../hooks/useReduxHooks';
import { setRole } from './roleSelectionSlice';
import { setSelectedRole } from '../../store/authSlice';
import type { UserRole } from '../../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

type RoleSelectionNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RoleSelection'
>;

interface Props {
  navigation: RoleSelectionNavigationProp;
}

interface RoleCardProps {
  title: string;
  description: string;
  accentColor: string;
  iconEmoji: string;
  onPress: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({
  title,
  description,
  accentColor,
  iconEmoji,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.card, { borderTopColor: accentColor }]}
    onPress={onPress}
    activeOpacity={0.7}>
    <View style={[styles.cardIconCircle, { backgroundColor: accentColor + '15' }]}>
      <Text style={styles.cardIcon}>{iconEmoji}</Text>
    </View>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardDescription}>{description}</Text>
    <View style={[styles.cardArrow, { backgroundColor: accentColor + '12' }]}>
      <Text style={[styles.arrowText, { color: accentColor }]}>→</Text>
    </View>
  </TouchableOpacity>
);

const RoleSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();

  const handleRoleSelect = (role: UserRole) => {
    dispatch(setRole(role));
    dispatch(setSelectedRole(role));
    navigation.navigate(ROUTES.SIGN_IN, { role });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <AppLogo size="sm" />
        <Text style={styles.headerTitle}>Select Your Role</Text>
        <Text style={styles.headerSubtitle}>
          Choose how you'll use FinMatrix
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        <RoleCard
          title="Administrator"
          description="Full access to accounting, inventory, delivery management, and reports"
          accentColor={colors.primary}
          iconEmoji="💼"
          onPress={() => handleRoleSelect('admin')}
        />

        <RoleCard
          title="Delivery Personnel"
          description="View assignments, complete deliveries, update inventory"
          accentColor={colors.success}
          iconEmoji="🚚"
          onPress={() => handleRoleSelect('delivery')}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.small,
    color: colors.textSecondary,
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.lg,
    borderTopWidth: 4,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  cardIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  cardDescription: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  cardArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 20,
    fontWeight: '700',
  },
});

export default RoleSelectionScreen;
