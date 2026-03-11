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
  Animated,
} from 'react-native';
import CustomButton from '../../Custom-Components/CustomButton';
import AppLogo from '../../Custom-Components/AppLogo';
import { colors, typography, spacing } from '../../theme';
import { ROUTES } from '../../navigations-map/Base';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { setCurrentPage, selectCurrentPage } from './onboardingSlice';
import { setOnboardingSeen } from '../Auth/authSlice';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

const { width, height } = Dimensions.get('window');

// ── Design Tokens ──
const BRAND = {
  navy: '#0F172A',
  navyLight: '#1E293B',
  navyMuted: '#334155',
  emerald: '#059669',
  emeraldLight: '#10B981',
  emeraldBg: '#ECFDF5',
  emeraldBorder: '#A7F3D0',
  teal: '#0D9488',
  tealBg: '#F0FDFA',
  amber: '#F59E0B',
};

interface Slide {
  id: string;
  title: string;
  titleAccent?: string;
  subtitle: string;
  tag?: string;
  variant: 'dark' | 'light';
  accentColor: string;
  chartHeights?: number[];
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'Financial clarity,',
    titleAccent: 'delivered.',
    subtitle:
      'Enterprise accounting meets modern delivery management — all in one platform.',
    variant: 'dark',
    accentColor: BRAND.emeraldLight,
  },
  {
    id: '2',
    title: 'Inventory synced\nacross your team',
    subtitle:
      'Track stock levels, movements, and valuations in real-time across all users.',
    tag: 'Real-Time Data',
    variant: 'light',
    accentColor: BRAND.emerald,
    chartHeights: [28, 44, 36, 52, 40],
  },
  {
    id: '3',
    title: 'Delivery tracking,\nfully automated',
    subtitle:
      'Assign routes, capture digital signatures, and verify deliveries — all streamlined.',
    tag: 'Smart Logistics',
    variant: 'light',
    accentColor: BRAND.teal,
    chartHeights: [20, 32, 48, 38, 44],
  },
  {
    id: '4',
    title: 'Reports that drive\nbetter decisions',
    subtitle:
      'Financial statements, profit & loss, balance sheets, and custom analytics at your fingertips.',
    tag: 'Powerful Insights',
    variant: 'light',
    accentColor: BRAND.amber,
    chartHeights: [36, 28, 44, 40, 52],
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
  const scrollX = useRef(new Animated.Value(0)).current;

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

  // ── Dark Slide (first) ──
  const renderDarkSlide = (item: Slide) => (
    <View style={[styles.slide, { backgroundColor: BRAND.navy }]}>
      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorSquare} />

      <View style={styles.darkContent}>
        {/* Logo badge */}
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>FM</Text>
        </View>

        <Text style={styles.darkTitle}>
          {item.title}
          {item.titleAccent ? '\n' : ''}
          {item.titleAccent && (
            <Text style={{ color: item.accentColor }}>{item.titleAccent}</Text>
          )}
        </Text>
        <Text style={styles.darkSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  // ── Light Slide (2-4) ──
  const renderLightSlide = (item: Slide) => (
    <View style={[styles.slide, { backgroundColor: colors.background }]}>
      {/* Top accent line */}
      <View style={[styles.accentLine, { backgroundColor: item.accentColor }]} />

      <View style={styles.lightContent}>
        {/* Abstract chart visual */}
        <View
          style={[
            styles.chartCircle,
            { borderColor: item.accentColor + '30' },
          ]}>
          <View style={styles.chartBarsContainer}>
            {(item.chartHeights ?? []).map((h, i) => (
              <View
                key={i}
                style={[
                  styles.chartBar,
                  {
                    height: h,
                    backgroundColor:
                      i === 3
                        ? item.accentColor
                        : item.accentColor + (i % 2 === 0 ? '40' : '25'),
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Tag */}
        {item.tag && (
          <View
            style={[
              styles.tagContainer,
              { backgroundColor: item.accentColor + '12' },
            ]}>
            <View
              style={[styles.tagDot, { backgroundColor: item.accentColor }]}
            />
            <Text style={[styles.tagText, { color: item.accentColor }]}>
              {item.tag}
            </Text>
          </View>
        )}

        <Text style={styles.lightTitle}>{item.title}</Text>
        <Text style={styles.lightSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  const renderSlide = ({ item }: { item: Slide }) => {
    if (item.variant === 'dark') return renderDarkSlide(item);
    return renderLightSlide(item);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={activeIndex === 0 ? 'light-content' : 'dark-content'}
        backgroundColor={activeIndex === 0 ? BRAND.navy : colors.background}
      />

      {/* Skip */}
      {!isLastSlide && (
        <TouchableOpacity
          style={[
            styles.skipButton,
            activeIndex === 0 && styles.skipButtonDark,
          ]}
          onPress={handleSkip}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text
            style={[
              styles.skipText,
              activeIndex === 0 && styles.skipTextDark,
            ]}>
            Skip
          </Text>
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
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false, listener: handleScroll },
        )}
        scrollEventThrottle={16}
        bounces={false}
        snapToInterval={width}
        decelerationRate="fast"
      />

      {/* Bottom */}
      <View
        style={[
          styles.bottomArea,
          activeIndex === 0 && styles.bottomAreaDark,
        ]}>
        {/* Animated Dots */}
        <View style={styles.dots}>
          {slides.map((item, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [6, 28, 6],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.25, 1, 0.25],
              extrapolate: 'clamp',
            });
            const dotColor =
              activeIndex === 0 ? BRAND.emeraldLight : BRAND.navy;
            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: dotColor,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* CTA */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.ctaButton,
              activeIndex === 0
                ? { backgroundColor: BRAND.emerald }
                : { backgroundColor: BRAND.navy },
            ]}
            onPress={isLastSlide ? handleGetStarted : handleNext}
            activeOpacity={0.85}>
            <Text style={styles.ctaButtonText}>
              {isLastSlide ? 'Get Started' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Skip below button on dark slide */}
        {activeIndex === 0 && !isLastSlide && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBelow}>
            <Text style={styles.skipBelowText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Skip
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  skipTextDark: {
    color: 'rgba(255,255,255,0.5)',
  },

  // Slide common
  slide: {
    width,
    flex: 1,
  },

  // ── Dark Slide ──
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(5,150,105,0.07)',
  },
  decorCircle2: {
    position: 'absolute',
    top: 140,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(5,150,105,0.04)',
  },
  decorSquare: {
    position: 'absolute',
    bottom: 240,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    transform: [{ rotate: '45deg' }],
  },
  darkContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadgeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    fontFamily: typography.fontFamily,
  },
  darkTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
    fontFamily: typography.fontFamily,
    letterSpacing: -0.5,
  },
  darkSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: typography.fontFamily,
  },

  // ── Light Slide ──
  accentLine: {
    height: 3,
    width: '100%',
  },
  lightContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  chartCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  chartBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  chartBar: {
    width: 10,
    borderRadius: 3,
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: typography.fontFamily,
  },
  lightTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
    fontFamily: typography.fontFamily,
    letterSpacing: -0.3,
  },
  lightSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: typography.fontFamily,
  },

  // ── Bottom ──
  bottomArea: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  bottomAreaDark: {
    backgroundColor: BRAND.navy,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  buttonContainer: {
    width: '100%',
  },
  ctaButton: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
    letterSpacing: 0.2,
  },
  skipBelow: {
    marginTop: 12,
    paddingVertical: 8,
  },
  skipBelowText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    fontFamily: typography.fontFamily,
  },
});

export default OnboardingScreen;