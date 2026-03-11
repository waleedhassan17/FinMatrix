import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius, shadows } from '../../../theme';
import { ROUTES } from '../../../navigations-map/Base';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanySetup'>;

const CompanySetupScreen: React.FC<Props> = ({ navigation }) => {
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.stagger(150, [
        Animated.spring(card1Anim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(card2Anim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [card1Anim, card2Anim, headerAnim]);

  const renderCard = (
    anim: Animated.Value,
    letter: string,
    title: string,
    description: string,
    onPress: () => void,
    accentColor: string,
  ) => {
    const translateY = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [40, 0],
    });
    return (
      <Animated.View
        style={[
          styles.card,
          {
            opacity: anim,
            transform: [{ translateY }],
          },
        ]}>
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={onPress}
          activeOpacity={0.7}>
          <View style={[styles.cardIconContainer, { backgroundColor: accentColor + '0A' }]}>
            <View style={[styles.cardIconInner, { backgroundColor: accentColor + '15' }]}>
              <Text style={[styles.cardIconText, { color: accentColor }]}>{letter}</Text>
            </View>
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardDescription}>{description}</Text>
          </View>
          <View style={[styles.cardArrow, { backgroundColor: accentColor + '0A' }]}>
            <Text style={[styles.arrowText, { color: accentColor }]}>{'\u203A'}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>FM</Text>
        </View>
        <Text style={styles.headerTitle}>Set up your workspace</Text>
        <Text style={styles.headerSubtitle}>
          Create a new company or join an existing one to start managing finances, inventory, and deliveries.
        </Text>
      </Animated.View>

      {/* Cards */}
      <View style={styles.cardsContainer}>
        {renderCard(
          card1Anim,
          '+',
          'Create New Company',
          'Register your business and invite your team',
          () => navigation.navigate(ROUTES.CREATE_COMPANY as any),
          colors.primary,
        )}

        {renderCard(
          card2Anim,
          '#',
          'Join Existing Company',
          'Enter a 6-digit invite code from your admin',
          () => navigation.navigate(ROUTES.JOIN_COMPANY as any),
          colors.success,
        )}
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
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.xl + 16,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  headerBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md + 4,
  },
  headerBadgeText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    fontFamily: typography.fontFamily,
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    fontFamily: typography.fontFamily,
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg + 4,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md + 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 4,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardIconInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    fontFamily: typography.fontFamily,
  },
  cardDescription: {
    fontSize: typography.small.fontSize,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: typography.fontFamily,
  },
  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  arrowText: {
    fontSize: 24,
    fontWeight: '400',
  },
});

export default CompanySetupScreen;