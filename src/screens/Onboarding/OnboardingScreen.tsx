import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import CustomButton from '../../Custom-Components/CustomButton';
import AppLogo from '../../Custom-Components/AppLogo';
import { colors, typography, spacing } from '../../theme';
import { ROUTES } from '../../navigations-map/Base';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { setCurrentPage, selectCurrentPage } from './onboardingSlice';
import { setOnboardingSeen } from '../../store/authSlice';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  iconColor: string;
  iconEmoji: string;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'Welcome to FinMatrix',
    subtitle: 'Enterprise accounting meets delivery management',
    iconColor: colors.primary,
    iconEmoji: '💼',
  },
  {
    id: '2',
    title: 'Real-Time Inventory',
    subtitle: 'Cloud-based inventory synced across all users',
    iconColor: colors.secondary,
    iconEmoji: '📦',
  },
  {
    id: '3',
    title: 'Smart Delivery',
    subtitle: 'Assign, track, and verify deliveries with digital signatures',
    iconColor: colors.success,
    iconEmoji: '🚚',
  },
  {
    id: '4',
    title: 'Powerful Reports',
    subtitle: 'Financial statements, analytics, and insights at your fingertips',
    iconColor: colors.warning,
    iconEmoji: '📊',
  },
];

type OnboardingNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

interface Props {
  navigation: OnboardingNavigationProp;
}

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const activeIndex = useAppSelector(selectCurrentPage);
  const flatListRef = useRef<FlatList>(null);

  const isLastSlide = activeIndex === slides.length - 1;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      dispatch(setCurrentPage(index));
    },
    [dispatch],
  );

  const handleSkip = () => {
    dispatch(setOnboardingSeen());
    navigation.replace(ROUTES.ROLE_SELECTION);
  };

  const handleGetStarted = () => {
    dispatch(setOnboardingSeen());
    navigation.replace(ROUTES.ROLE_SELECTION);
  };

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    }
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      {/* Icon Area — 60% height */}
      <View style={styles.iconArea}>
        {item.id === '1' ? (
          <AppLogo size="lg" />
        ) : (
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: item.iconColor + '18' },
            ]}>
            <Text style={styles.iconEmoji}>{item.iconEmoji}</Text>
          </View>
        )}
      </View>

      {/* Text Area */}
      <View style={styles.textArea}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Skip button — only on first 3 slides */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        snapToInterval={width}
        decelerationRate="fast"
      />

      {/* Bottom Area */}
      <View style={styles.bottomArea}>
        {/* Dot Indicators */}
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activeIndex === index ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          {isLastSlide ? (
            <CustomButton
              title="Get Started"
              onPress={handleGetStarted}
              variant="primary"
              size="lg"
              fullWidth
            />
          ) : (
            <CustomButton
              title="Next"
              onPress={handleNext}
              variant="primary"
              size="lg"
              fullWidth
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: spacing.lg,
    zIndex: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: typography.fontFamily,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconArea: {
    height: height * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 64,
  },
  textArea: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  slideTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm + 4,
  },
  slideSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomArea: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl + 16,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 28,
    borderRadius: 5,
  },
  dotInactive: {
    backgroundColor: colors.border,
  },
  buttonContainer: {
    width: '100%',
  },
});

export default OnboardingScreen;
