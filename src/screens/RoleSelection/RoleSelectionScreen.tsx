import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { ROUTES } from '../../navigations-map/Base';
import { useAppDispatch } from '../../hooks/useReduxHooks';
import { setRole } from './roleSelectionSlice';
import { setSelectedRole } from '../Auth/authSlice';
import type { UserRole } from '../../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

const BRAND = {
  navy: '#0F172A',
  navyLight: '#1E293B',
  emerald: '#059669',
  emeraldLight: '#10B981',
};

type RoleSelectionNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'RoleSelection'
>;

interface Props {
  navigation: RoleSelectionNavigationProp;
}

interface RoleCardProps {
  letter: string;
  accentColor: string;
  title: string;
  subtitle: string;
  features: string[];
  onPress: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({
  letter,
  accentColor,
  title,
  subtitle,
  features,
  onPress,
}) => (
  <TouchableOpacity
    style={styles.card}
    onPress={onPress}
    activeOpacity={0.7}>
    <View style={styles.cardHeader}>
      <View style={[styles.letterCircle, { backgroundColor: accentColor + '0C' }]}>
        <Text style={[styles.letterText, { color: accentColor }]}>{letter}</Text>
      </View>
      <View style={styles.cardHeaderText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={[styles.cardSubtitle, { color: accentColor }]}>{subtitle}</Text>
      </View>
      <View style={[styles.arrowCircle, { backgroundColor: accentColor + '0A' }]}>
        <Text style={[styles.arrowText, { color: accentColor }]}>{'\u203A'}</Text>
      </View>
    </View>
    <View style={styles.cardDivider} />
    <View style={styles.featuresContainer}>
      {features.map((feature, index) => (
        <View key={index} style={styles.featureRow}>
          <View style={[styles.featureDot, { backgroundColor: accentColor }]} />
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoInitials}>FM</Text>
          </View>
          <Text style={styles.logoTitle}>
            <Text style={styles.logoFin}>Fin</Text>
            <Text style={styles.logoMatrix}>Matrix</Text>
          </Text>
          <Text style={styles.logoSubtitle}>
            Enterprise Accounting & Delivery Platform
          </Text>
        </View>

        {/* Heading */}
        <View style={styles.headingContainer}>
          <Text style={styles.headingTitle}>How will you use FinMatrix?</Text>
          <Text style={styles.headingSubtitle}>
            Select your role to get the right experience
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.cardsContainer}>
          <RoleCard
            letter="A"
            accentColor={BRAND.navy}
            title="Administrator"
            subtitle="Full Platform Access"
            features={[
              'Accounting & financial reports',
              'Inventory management',
              'Delivery operations',
              'Team management',
            ]}
            onPress={() => handleRoleSelect('admin')}
          />

          <RoleCard
            letter="D"
            accentColor={BRAND.emerald}
            title="Delivery Personnel"
            subtitle="Field Operations"
            features={[
              'View assigned deliveries',
              'Update delivery status',
              'Route management',
              'Inventory transfers',
            ]}
            onPress={() => handleRoleSelect('delivery')}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg + 4,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    paddingTop: spacing.xl + 16,
    marginBottom: spacing.lg + 8,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: BRAND.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm + 4,
  },
  logoInitials: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    fontFamily: typography.fontFamily,
    letterSpacing: 1,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  logoFin: {
    color: BRAND.emerald,
  },
  logoMatrix: {
    color: colors.textPrimary,
  },
  logoSubtitle: {
    fontSize: typography.small.fontSize,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },

  // Heading
  headingContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg + 8,
  },
  headingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
    letterSpacing: -0.3,
  },
  headingSubtitle: {
    fontSize: typography.small.fontSize,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },

  // Cards
  cardsContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md + 4,
    padding: 0,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 4,
  },
  letterCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  letterText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
  },
  cardSubtitle: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 24,
    fontWeight: '400',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  featuresContainer: {
    padding: spacing.md + 4,
    gap: spacing.xs + 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: spacing.sm + 2,
  },
  featureText: {
    fontSize: typography.small.fontSize,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    lineHeight: 20,
  },

  // Footer
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  footerVersion: {
    fontSize: typography.caption.fontSize,
    color: colors.textLight,
    fontFamily: typography.fontFamily,
  },
});

export default RoleSelectionScreen;