import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import CustomButton from '../../../Custom-Components/CustomButton';
import { colors, spacing, borderRadius } from '../../../theme';
import { THEME } from '../../../utils/theme';
import { useAppDispatch } from '../../../hooks/useReduxHooks';
import { setDeliveryOnboardingSeen } from '../authSlice';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'DeliveryOnboarding'>;

const { width } = Dimensions.get('window');

const BRAND = {
  navy: '#0F172A',
  emerald: '#059669',
  emeraldLight: '#10B981',
};

const slides = [
  {
    id: '1',
    letter: '01',
    title: 'View Your Assignments',
    description: 'See all deliveries assigned to you for today, with route details and customer information.',
  },
  {
    id: '2',
    letter: '02',
    title: 'Complete Deliveries',
    description: 'Capture digital signatures, confirm receipts, and update delivery status in real-time.',
  },
  {
    id: '3',
    letter: '03',
    title: 'Smart Inventory',
    description: 'Your inventory updates are reviewed by admin before syncing — keeping everything accurate.',
  },
];

const DeliveryOnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    },
  ).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const handleGetStarted = () => {
    dispatch(setDeliveryOnboardingSeen());
  };

  const renderSlide = ({ item }: { item: typeof slides[0] }) => (
    <View style={styles.slide}>
      <View style={styles.slideNumberContainer}>
        <View style={styles.slideNumberCircle}>
          <Text style={styles.slideNumber}>{item.letter}</Text>
        </View>
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDesc}>{item.description}</Text>
    </View>
  );

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <View style={styles.headerBrandRow}>
          <View style={styles.headerBrandDot} />
          <Text style={styles.headerBrandLabel}>DELIVERY SETUP</Text>
        </View>
        <Text style={styles.headerTitle}>Welcome to FinMatrix</Text>
        <Text style={styles.headerSubtitle}>
          Here's a quick overview of what you can do
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 28, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: BRAND.emerald,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.bottomBar}>
        {isLastSlide ? (
          <CustomButton
            title="Get Started"
            onPress={handleGetStarted}
            variant="primary"
            size="lg"
            fullWidth
          />
        ) : (
          <View style={styles.bottomRow}>
            <TouchableOpacity
              onPress={handleGetStarted}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <CustomButton
              title="Next"
              onPress={handleNext}
              variant="primary"
              size="md"
            />
          </View>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerBrandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.emerald,
    marginRight: spacing.sm,
  },
  headerBrandLabel: {
    fontSize: THEME.typography.caption.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    fontFamily: THEME.typography.fontFamily,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: THEME.typography.bodyLg.fontSize,
    color: colors.textSecondary,
    fontFamily: THEME.typography.fontFamily,
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: spacing.xl + 8,
    paddingTop: spacing.xl + 16,
  },
  slideNumberContainer: {
    marginBottom: spacing.lg + 8,
  },
  slideNumberCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: BRAND.emerald + '0A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: BRAND.emerald + '20',
  },
  slideNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: BRAND.emerald,
    fontFamily: THEME.typography.fontFamily,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm + 4,
    fontFamily: THEME.typography.fontFamily,
    letterSpacing: -0.2,
  },
  slideDesc: {
    fontSize: THEME.typography.bodyLg.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
    fontFamily: THEME.typography.fontFamily,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg + 4,
    paddingBottom: spacing.lg,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontSize: THEME.typography.bodyLg.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: THEME.typography.fontFamily,
  },
});

export default DeliveryOnboardingScreen;