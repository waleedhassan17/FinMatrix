import React, { useRef, useCallback, useEffect } from 'react';
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
import { colors, typography, spacing } from '../../theme';
import { ROUTES } from '../../navigations-map/Base';
import { useAppDispatch, useAppSelector } from '../../hooks/useReduxHooks';
import { setCurrentPage, selectCurrentPage } from './onboardingSlice';
import { setOnboardingSeen } from '../Auth/authSlice';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';

const { width } = Dimensions.get('window');

// ═══════════════════════════════════════
// Design Tokens — Consistent Dark Theme
// ═══════════════════════════════════════
const BRAND = {
  // Base
  navy: '#0F172A',
  navySurface: '#162032',
  // Text on dark
  whiteHigh: 'rgba(255,255,255,0.92)',
  whiteMed: 'rgba(255,255,255,0.55)',
  whiteLow: 'rgba(255,255,255,0.25)',
  whiteGhost: 'rgba(255,255,255,0.08)',
  whiteBorder: 'rgba(255,255,255,0.06)',
  // Accent per-feature
  emerald: '#10B981',
  emeraldGlow: 'rgba(16,185,129,0.12)',
  teal: '#14B8A6',
  tealGlow: 'rgba(20,184,166,0.12)',
  sky: '#38BDF8',
  skyGlow: 'rgba(56,189,248,0.12)',
  amber: '#F59E0B',
  amberGlow: 'rgba(245,158,11,0.12)',
};

// ═══════════════════════════════════════
// Slide Data — Consistent Structure
// ═══════════════════════════════════════
// Every slide follows the SAME pattern:
// Illustration → Tag pill → Title + AccentLine → Subtitle
// Only accent color and content changes.

interface SlideData {
  id: string;
  tag: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  accent: string;
  glow: string;
  illustrationType: 'logo' | 'grid' | 'route' | 'chart';
}

const slides: SlideData[] = [
  {
    id: '1',
    tag: 'Welcome',
    title: 'Financial clarity,',
    titleAccent: 'delivered.',
    subtitle:
      'Enterprise accounting meets modern delivery management — all in one platform.',
    accent: BRAND.emerald,
    glow: BRAND.emeraldGlow,
    illustrationType: 'logo',
  },
  {
    id: '2',
    tag: 'Real-Time Sync',
    title: 'Inventory tracked',
    titleAccent: 'in real-time.',
    subtitle:
      'Cloud-synced stock across your team. Track levels, movements, and valuations instantly.',
    accent: BRAND.teal,
    glow: BRAND.tealGlow,
    illustrationType: 'grid',
  },
  {
    id: '3',
    tag: 'Smart Logistics',
    title: 'Deliveries managed,',
    titleAccent: 'start to finish.',
    subtitle:
      'Assign routes, capture signatures, and verify deliveries — all automated.',
    accent: BRAND.sky,
    glow: BRAND.skyGlow,
    illustrationType: 'route',
  },
  {
    id: '4',
    tag: 'Powerful Insights',
    title: 'Reports that drive',
    titleAccent: 'better decisions.',
    subtitle:
      'Financial statements, P&L, balance sheets, and analytics at your fingertips.',
    accent: BRAND.amber,
    glow: BRAND.amberGlow,
    illustrationType: 'chart',
  },
];

// ═══════════════════════════════════════
// Illustration Components
// ═══════════════════════════════════════
// Each illustration is wrapped in the SAME
// circular ring for visual consistency.

interface IllustrationProps {
  accent: string;
}

const LogoIllustration: React.FC<IllustrationProps> = ({ accent }) => (
  <View style={[s.illustInner, { backgroundColor: accent + '15', borderColor: accent + '25' }]}>
    <Text style={[s.logoText, { color: accent }]}>FM</Text>
  </View>
);

const GridIllustration: React.FC<IllustrationProps> = ({ accent }) => {
  const opacities = [0.35, 0.18, 0.28, 0.15, 1, 0.22, 0.30, 0.12, 0.20];
  return (
    <View style={s.gridContainer}>
      {opacities.map((opacity, i) => (
        <View
          key={i}
          style={[
            s.gridCell,
            {
              backgroundColor: i === 4 ? accent : accent + Math.round(opacity * 255).toString(16).padStart(2, '0'),
              borderColor: i === 4 ? 'transparent' : accent + '12',
              borderWidth: i === 4 ? 0 : 1,
            },
          ]}
        />
      ))}
    </View>
  );
};

const RouteIllustration: React.FC<IllustrationProps> = ({ accent }) => (
  <View style={s.routeContainer}>
    {/* Dashed path */}
    <View style={[s.routePathV, { borderColor: accent + '30' }]} />
    <View style={[s.routePathH, { borderColor: accent + '30' }]} />
    <View style={[s.routePathV2, { borderColor: accent + '30' }]} />
    {/* Start node */}
    <View style={[s.routeNode, s.routeNodeStart, { borderColor: accent + '40' }]}>
      <View style={[s.routeNodeDot, { backgroundColor: accent }]} />
    </View>
    {/* Mid node */}
    <View style={[s.routeNode, s.routeNodeMid, { borderColor: accent + '30' }]}>
      <View style={[s.routeNodeDotSmall, { backgroundColor: accent + '60' }]} />
    </View>
    {/* End node */}
    <View style={[s.routeNode, s.routeNodeEnd, { borderColor: accent + '40' }]}>
      <Text style={[s.routeCheck, { color: accent }]}>{'\u2713'}</Text>
    </View>
  </View>
);

const ChartIllustration: React.FC<IllustrationProps> = ({ accent }) => {
  const bars = [24, 40, 32, 52, 44, 36];
  return (
    <View style={s.chartContainer}>
      {bars.map((h, i) => (
        <View
          key={i}
          style={[
            s.chartBar,
            {
              height: h,
              backgroundColor: i === 3 ? accent : accent + (i % 2 === 0 ? '35' : '1A'),
            },
          ]}
        />
      ))}
    </View>
  );
};

const ILLUSTRATION_MAP: Record<string, React.FC<IllustrationProps>> = {
  logo: LogoIllustration,
  grid: GridIllustration,
  route: RouteIllustration,
  chart: ChartIllustration,
};

// ═══════════════════════════════════════
// Main Component
// ═══════════════════════════════════════

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
  const currentSlide = slides[activeIndex] ?? slides[0];

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / width);
      if (index !== activeIndex) {
        dispatch(setCurrentPage(index));
      }
    },
    [dispatch, activeIndex],
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

  // ── Render Slide ──
  // EVERY slide uses the EXACT same layout:
  // decorative shapes → illustration ring → tag → title → subtitle
  const renderSlide = ({ item }: { item: SlideData }) => {
    const IllustComponent = ILLUSTRATION_MAP[item.illustrationType];

    return (
      <View style={s.slide}>
        {/* ── Decorative shapes (same on every slide) ── */}
        <View style={[s.decorRect, { borderColor: BRAND.whiteBorder }]} />
        <View style={[s.decorCircle, { borderColor: BRAND.whiteBorder }]} />

        <View style={s.slideContent}>
          {/* ── Illustration Ring (consistent container) ── */}
          <View style={s.illustrationWrapper}>
            {/* Ambient glow */}
            <View style={[s.illustGlow, { backgroundColor: item.glow }]} />
            {/* Ring */}
            <View style={[s.illustRing, { borderColor: item.accent + '20' }]}>
              <IllustComponent accent={item.accent} />
            </View>
          </View>

          {/* ── Tag Pill (same structure, different color) ── */}
          <View style={[s.tagPill, { backgroundColor: item.glow, borderColor: item.accent + '12' }]}>
            <View style={[s.tagDot, { backgroundColor: item.accent }]} />
            <Text style={[s.tagLabel, { color: item.accent }]}>
              {item.tag}
            </Text>
          </View>

          {/* ── Title (same pattern: line + accent line) ── */}
          <Text style={s.slideTitle}>
            {item.title}
            {'\n'}
            <Text style={{ color: item.accent }}>{item.titleAccent}</Text>
          </Text>

          {/* ── Subtitle ── */}
          <Text style={s.slideSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND.navy} />

      {/* ── Skip Button (consistent across all slides) ── */}
      {!isLastSlide && (
        <TouchableOpacity
          style={s.skipButton}
          onPress={handleSkip}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* ── Slides ── */}
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

      {/* ── Bottom Area (always dark, consistent) ── */}
      <View style={s.bottomArea}>
        {/* Animated dots */}
        <View style={s.dotsRow}>
          {slides.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [5, 28, 5],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.25, 1, 0.25],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={index}
                style={[
                  s.dot,
                  {
                    width: dotWidth,
                    opacity: dotOpacity,
                    backgroundColor: currentSlide.accent,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* CTA Button — accent color follows slide */}
        <TouchableOpacity
          style={[s.ctaButton, { backgroundColor: currentSlide.accent }]}
          onPress={isLastSlide ? handleGetStarted : handleNext}
          activeOpacity={0.85}>
          <Text style={s.ctaText}>
            {isLastSlide ? 'Get Started' : 'Continue'}
          </Text>
        </TouchableOpacity>

        {/* Skip text on first slide */}
        {activeIndex === 0 && (
          <TouchableOpacity
            onPress={handleSkip}
            style={s.skipBelow}
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
            <Text style={s.skipBelowText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════
// Styles
// ═══════════════════════════════════════
const s = StyleSheet.create({
  // ── Container ──
  container: {
    flex: 1,
    backgroundColor: BRAND.navy,
  },

  // ── Skip Button ──
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: BRAND.whiteGhost,
    borderWidth: 1,
    borderColor: BRAND.whiteBorder,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
    color: BRAND.whiteLow,
    fontFamily: typography.fontFamily,
  },

  // ── Slide ──
  slide: {
    width,
    flex: 1,
    backgroundColor: BRAND.navy,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },

  // ── Decorative shapes (identical on every slide) ──
  decorRect: {
    position: 'absolute',
    top: '12%',
    right: '-6%',
    width: 90,
    height: 90,
    borderRadius: 24,
    borderWidth: 1,
    transform: [{ rotate: '15deg' }],
  },
  decorCircle: {
    position: 'absolute',
    bottom: '18%',
    left: '-4%',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
  },

  // ── Illustration Wrapper (consistent ring on every slide) ──
  illustrationWrapper: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
  },
  illustGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  illustRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Logo Illustration ──
  illustInner: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 3,
    fontFamily: typography.fontFamily,
  },

  // ── Grid Illustration ──
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 84,
    gap: 6,
  },
  gridCell: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },

  // ── Route Illustration ──
  routeContainer: {
    width: 80,
    height: 80,
    position: 'relative',
  },
  routePathV: {
    position: 'absolute',
    left: 10,
    top: 16,
    width: 0,
    height: 28,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
  },
  routePathH: {
    position: 'absolute',
    left: 10,
    top: 44,
    width: 60,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  routePathV2: {
    position: 'absolute',
    right: 10,
    top: 44,
    width: 0,
    height: 20,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
  },
  routeNode: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: BRAND.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeNodeStart: {
    left: 0,
    top: 0,
  },
  routeNodeMid: {
    left: 30,
    top: 34,
  },
  routeNodeEnd: {
    right: 0,
    bottom: 0,
  },
  routeNodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeNodeDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  routeCheck: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Chart Illustration ──
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    height: 56,
  },
  chartBar: {
    width: 9,
    borderRadius: 4,
  },

  // ── Tag Pill (same structure, accent changes) ──
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    gap: 7,
  },
  tagDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: typography.fontFamily,
  },

  // ── Title (same typography, accent changes) ──
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: BRAND.whiteHigh,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 14,
    fontFamily: typography.fontFamily,
    letterSpacing: -0.5,
  },

  // ── Subtitle ──
  slideSubtitle: {
    fontSize: 15,
    color: BRAND.whiteMed,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: typography.fontFamily,
    maxWidth: 300,
  },

  // ── Bottom Area (always dark) ──
  bottomArea: {
    paddingHorizontal: 28,
    paddingBottom: 42,
    alignItems: 'center',
    backgroundColor: BRAND.navy,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 7,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  ctaButton: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
    letterSpacing: 0.2,
  },
  skipBelow: {
    marginTop: 14,
    paddingVertical: 6,
  },
  skipBelowText: {
    fontSize: 13,
    color: BRAND.whiteLow,
    fontWeight: '500',
    fontFamily: typography.fontFamily,
  },
});

export default OnboardingScreen;